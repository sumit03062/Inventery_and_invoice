"""The only write path for invoice, cash, stock, and ledger transactions."""
import hashlib
import json
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, ROUND_DOWN
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework.exceptions import ValidationError
from .models import Shop, Product, Customer, Invoice, InvoiceItem, LedgerEntry, Payment, StockMovement, Activity, CreditNote
from .tax import validate_state, tax_parts
from .permissions import require

ZERO = Decimal('0.00')


def money(value):
    try:
        number = Decimal(str(value))
        if not number.is_finite() or abs(number) > Decimal('99999999999.99'):
            raise InvalidOperation
        return number.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError('Enter a valid monetary amount with at most 11 whole digits.')


def integer(value, minimum=1, maximum=1000000):
    try:
        parsed = int(str(value))
        if not minimum <= parsed <= maximum:
            raise ValueError
        return parsed
    except (ValueError, TypeError):
        raise ValidationError(f'Enter a whole number between {minimum} and {maximum}.')


def quantity(value, unit=None, minimum=Decimal('.001'), maximum=Decimal('1000000')):
    try:
        number = Decimal(str(value))
        if not number.is_finite() or not minimum <= number <= maximum or number != number.quantize(Decimal('.001')):
            raise InvalidOperation
        if unit and unit not in ['KG', 'LTR'] and number != number.to_integral_value():
            raise ValidationError('Pieces must be a whole number. Use kg or litres for decimal quantities.')
        return number
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f'Enter a quantity between {minimum} and {maximum}, with up to 3 decimal places.')


def stock_input(data, product, field='quantity', opening=False):
    mode = data.get('stock_mode', 'DIRECT')
    if mode not in ['DIRECT', 'BOX']:
        raise ValidationError('Choose direct quantity or boxes.')
    if mode == 'BOX':
        if product.unit != 'PCS':
            raise ValidationError('Box entry is available only for products measured in pieces.')
        boxes = integer(data.get('boxes'), minimum=0 if opening else -1000000)
        amount = quantity(boxes * product.pieces_per_box, 'PCS', minimum=0 if opening else -1000000)
        return amount, f' ({boxes} boxes x {product.pieces_per_box} pieces)'
    return quantity(data.get(field, 0), product.unit, minimum=0 if opening else -1000000), ''


def request_key(data):
    try:
        return uuid.UUID(str(data['request_key']))
    except (KeyError, ValueError, TypeError):
        raise ValidationError('A valid request_key is required. Retry using the same key.')


def fingerprint(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()


def lock_shop():
    Shop.objects.filter(pk=1).update(revision=F('revision') + 1)
    return Shop.objects.select_for_update().get(pk=1)


def audit(user, action, detail):
    Activity.objects.create(actor=user, action=action, detail=str(detail)[:500])


def balance(customer):
    return money(customer.ledger.aggregate(total=Sum('amount'))['total'] or ZERO)


def invoice_due(invoice):
    if invoice.status == 'VOID':
        return ZERO
    if invoice.customer_id:
        return money(invoice.ledger.aggregate(total=Sum('amount'))['total'] or ZERO)
    return ZERO


def payment_method(data, shop):
    method = data.get('payment_method', 'CASH')
    allowed = shop.payment_methods or ['CASH', 'UPI', 'CARD', 'CREDIT']
    if method not in allowed:
        raise ValidationError('This payment method is not enabled for the shop.')
    return method


def entry(customer, amount, kind, user, description, invoice=None, payment=None, date=None, key=None):
    return LedgerEntry.objects.create(customer=customer, amount=money(amount), type=kind,
        created_by=user, description=description[:500], invoice=invoice, payment=payment,
        transaction_date=date or timezone.now(), request_key=key)


def stock(product, quantity, user, reason, invoice=None, key=None):
    after = product.stock_quantity + quantity
    if after > Decimal('999999999999.999'):
        raise ValidationError('Stock exceeds the supported maximum.')
    if after < 0:
        raise ValidationError(f'Insufficient stock for {product.name}. Available: {product.stock_quantity}.')
    product.stock_quantity = after
    product.save(update_fields=['stock_quantity', 'updated_at'])
    StockMovement.objects.create(product=product, quantity=quantity, balance_after=after,
        created_by=user, reason=reason[:500], invoice=invoice, request_key=key)


def discount_shares(bases, discount):
    """Allocate paise with largest remainder; preserve the exact invoice discount."""
    total = sum(bases, ZERO)
    if not total:
        return [ZERO for _ in bases]
    raw = [discount * b / total for b in bases]
    rounded = [r.quantize(Decimal('.01'), rounding=ROUND_DOWN) for r in raw]
    remaining = int((discount - sum(rounded)) * 100)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - rounded[i], reverse=True)
    for i in order[:remaining]:
        rounded[i] += Decimal('.01')
    return rounded


@transaction.atomic
def create_invoice(user, data):
    require(user, 'billing.create')
    shop = lock_shop()
    key, digest = request_key(data), fingerprint(data)
    existing = Invoice.objects.filter(request_key=key).first()
    if existing:
        if existing.request_hash != digest or existing.created_by_id != user.id:
            raise ValidationError('This request key was already used for a different invoice.')
        return existing
    lines = data.get('items')
    if not isinstance(lines, list) or not 1 <= len(lines) <= 100:
        raise ValidationError('Select between 1 and 100 invoice items.')
    quantities = {}
    for line in lines:
        if not isinstance(line, dict):
            raise ValidationError('Each item must contain a product and quantity.')
        pid = integer(line.get('product_id'))
        quantities[pid] = quantities.get(pid, 0) + quantity(line.get('quantity'))
    products = list(Product.objects.select_for_update().filter(id__in=quantities, active=True).order_by('id'))
    if len(products) != len(quantities):
        raise ValidationError('One or more products are unavailable.')
    units = {p.id: p.unit for p in products}
    for line in lines:
        quantity(line.get('quantity'), units[integer(line.get('product_id'))])
    for p in products:
        quantity(quantities[p.id], p.unit)
        if quantities[p.id] > p.stock_quantity:
            raise ValidationError(f'Insufficient stock for {p.name}. Available: {p.stock_quantity}.')
    customer = None
    if data.get('customer_id'):
        customer = Customer.objects.filter(pk=integer(data['customer_id']), active=True).first()
        if not customer:
            raise ValidationError('Select an active customer.')
    destination = str(data.get('place_of_supply') or (customer.state_code if customer else '') or shop.state_code)
    validate_state(destination)
    if shop.gst_mode == 'DOMESTIC':
        if not shop.state_code or not shop.gstin or not destination:
            raise ValidationError('Configure shop GSTIN/state and choose the place of supply.')
        if any(not p.hsn_code for p in products):
            raise ValidationError('Set an HSN/SAC code for every product before domestic GST billing.')
        if len(f'{shop.invoice_prefix}-{shop.next_invoice_number:06d}') > 16:
            raise ValidationError('GST invoice numbers must fit 16 characters. Shorten the invoice prefix.')
        if customer and customer.gstin and not customer.address:
            raise ValidationError('Add the registered customer address before billing.')
    rates = [p.gst_percent if shop.tax_enabled else ZERO for p in products]
    bases = [money(p.price * quantities[p.id] / (1 + rate / 100)) if p.price_includes_tax
             else money(p.price * quantities[p.id]) for p, rate in zip(products, rates)]
    subtotal = money(sum(bases, ZERO))
    discount = money(data.get('discount', 0))
    if discount < 0 or discount > subtotal:
        raise ValidationError('Discount must be between zero and the subtotal.')
    if discount:
        require(user, 'billing.discount')
    discounts = discount_shares(bases, discount)
    calculated = [tax_parts(base - share, rate, shop.gst_mode, shop.state_code, destination)
                  for rate, base, share in zip(rates, bases, discounts)]
    taxes = [row[0] for row in calculated]
    tax = money(sum(taxes, ZERO))
    total = money(subtotal - discount + tax)
    splits = data.get('payments')
    if splits is not None:
        if not isinstance(splits, list) or not 1 <= len(splits) <= 3:
            raise ValidationError('Supply one to three payment amounts.')
        receipts = []
        used = set()
        for part in splits:
            if not isinstance(part, dict):
                raise ValidationError('Invalid payment split.')
            pay_method = payment_method({'payment_method': part.get('method')}, shop)
            amount = money(part.get('amount'))
            if pay_method == 'CREDIT' or pay_method in used or amount <= 0:
                raise ValidationError('Use each collection method once with a positive amount.')
            used.add(pay_method)
            receipts.append((pay_method, amount))
        paid = sum((amount for _, amount in receipts), ZERO)
        method = 'MIXED' if len(receipts) > 1 else receipts[0][0]
    else:
        method = payment_method(data, shop)
        paid = money(data.get('paid_amount', 0 if method == 'CREDIT' else total))
        receipts = [(method, paid)] if paid else []
    if paid < 0 or paid > total or (method == 'CREDIT' and paid != 0):
        raise ValidationError('Payment must be between zero and total.')
    if paid < total and not customer:
        raise ValidationError('Select a customer for Udhar or a partial payment.')
    if customer and customer.credit_limit is not None and paid < total and balance(customer) + total - paid > customer.credit_limit:
        if user.profile.role != 'OWNER' or not str(data.get('credit_override_reason', '')).strip():
            raise ValidationError('Customer credit limit exceeded. The owner must approve with a reason or collect more payment.')
        audit(user, 'CREDIT_LIMIT_OVERRIDE', f'{customer.id}: {data["credit_override_reason"]}')
    due = timezone.localdate() + timedelta(days=shop.credit_days)
    if data.get('due_date'):
        try:
            due = parse_date(str(data['due_date']))
        except ValueError:
            due = None
        if not due or due < timezone.localdate():
            raise ValidationError('Due date must be today or later.')
    if shop.gst_mode == 'DOMESTIC' and total >= 50000 and (not customer or not customer.address):
        raise ValidationError('Add customer name and address for invoices of Rs. 50,000 or more.')
    invoice = Invoice.objects.create(number=f'{shop.invoice_prefix}-{shop.next_invoice_number:06d}',
        request_key=key, request_hash=digest, customer=customer,
        customer_snapshot={k: getattr(customer, k) for k in ['name', 'phone', 'address', 'gstin']} if customer else {'name': 'Walk-in customer'},
        shop_snapshot={**{k: getattr(shop, k) for k in ['name', 'owner_name', 'address', 'phone', 'gstin', 'invoice_footer', 'state_code', 'gst_mode']}, 'logo': shop.logo.name if shop.logo else ''},
        subtotal=subtotal, discount=discount, gst_amount=tax, grand_total=total,
        place_of_supply=destination, **{field: sum((row[1][field] for row in calculated), ZERO) for field in ['cgst','sgst','utgst','igst']},
        payment_method=method, due_date=due, created_by=user, notes=str(data.get('notes', ''))[:1000])
    shop.next_invoice_number += 1
    shop.save(update_fields=['next_invoice_number'])
    for p, base, share, (line_tax, parts) in zip(products, bases, discounts, calculated):
        item = InvoiceItem.objects.create(invoice=invoice, product=p, name=p.name, sku=p.sku,
            quantity=quantities[p.id], price=p.price, purchase_price=p.purchase_price,
            hsn_code=p.hsn_code, unit=p.unit, price_includes_tax=p.price_includes_tax, taxable_value=base-share, **parts,
            gst_percent=p.gst_percent if shop.tax_enabled else ZERO,
            discount=share, tax=line_tax, total=base - share + line_tax)
        from .tracking import sell
        matching = [line for line in lines if integer(line['product_id']) == p.id]
        if p.tracking == 'SERIAL' and len(matching) != 1:
            raise ValidationError('Combine serial-tracked products into one line.')
        sell(item, matching[0])
        stock(p, -quantities[p.id], user, f'Sale {invoice.number}', invoice)
    if customer:
        entry(customer, total, 'CREDIT', user, f'Invoice {invoice.number}', invoice)
    for receipt_method, receipt_amount in receipts:
        receipt = Payment.objects.create(customer=customer, invoice=invoice, amount=receipt_amount,
            method=receipt_method, created_by=user, note=f'Payment for {invoice.number}')
        if customer:
            entry(customer, -receipt_amount, 'PAYMENT', user, receipt.note, invoice, receipt)
    audit(user, 'INVOICE_CREATED', invoice.number)
    return invoice


@transaction.atomic
def receive_payment(user, customer, data):
    require(user, 'ledger.payment')
    shop = lock_shop()
    key, digest = request_key(data), fingerprint(data)
    existing = Payment.objects.filter(request_key=key).first()
    if existing:
        if existing.customer_id != customer.id or existing.request_hash != digest or existing.created_by_id != user.id:
            raise ValidationError('This request key was already used for another payment.')
        return existing
    amount = money(data.get('amount'))
    if amount <= 0 or amount > balance(customer):
        raise ValidationError('Payment must be positive and cannot exceed the outstanding balance.')
    method = payment_method(data, shop)
    if method == 'CREDIT':
        raise ValidationError('A received payment must use cash, UPI or card.')
    date = timezone.now()
    if data.get('transaction_date'):
        try:
            date = parse_datetime(str(data['transaction_date']))
        except ValueError:
            date = None
        if not date:
            raise ValidationError('Enter a valid payment date and time.')
        if timezone.is_naive(date):
            date = timezone.make_aware(date)
        if date > timezone.now() + timedelta(minutes=1):
            raise ValidationError('Payments cannot be dated in the future.')
    payment = Payment.objects.create(request_key=key, request_hash=digest, customer=customer,
        amount=amount, method=method, created_by=user, transaction_date=date,
        note=str(data.get('note', 'Payment received'))[:500])
    remaining = amount
    # Settle unallocated opening balances/adjustments first, then oldest invoices.
    unallocated = money(customer.ledger.filter(invoice__isnull=True).aggregate(total=Sum('amount'))['total'] or 0)
    if unallocated > 0:
        latest = customer.ledger.filter(invoice__isnull=True).order_by('-transaction_date').first()
        if latest and date < latest.transaction_date:
            raise ValidationError('Payment date cannot precede the balance being settled.')
        portion = min(remaining, unallocated)
        entry(customer, -portion, 'PAYMENT', user, payment.note, payment=payment, date=date)
        remaining -= portion
    for inv in customer.invoices.filter(status='ACTIVE').order_by('created_at', 'id'):
        due = invoice_due(inv)
        if due > 0 and remaining > 0:
            if date < inv.created_at:
                raise ValidationError('Payment date cannot precede an invoice being settled.')
            portion = min(remaining, due)
            entry(customer, -portion, 'PAYMENT', user, payment.note, inv, payment, date)
            remaining -= portion
    if remaining:
        raise ValidationError('The balance could not be allocated. Review the customer ledger.')
    audit(user, 'PAYMENT_RECEIVED', f'{customer.name}: {amount} {method}')
    return payment


@transaction.atomic
def void_invoice(user, invoice_id, data):
    require(user, 'invoices.void')
    shop = lock_shop()
    inv = Invoice.objects.select_for_update().get(pk=invoice_id)
    if inv.status == 'VOID':
        return inv
    if inv.returns.exists():
        raise ValidationError('This invoice has partial returns. Return the remaining items instead of voiding it.')
    reason = str(data.get('reason', '')).strip()
    if len(reason) < 3:
        raise ValidationError('Give a reason for voiding this invoice.')
    paid = inv.grand_total - invoice_due(inv)
    if paid:
        method = payment_method({'payment_method': data.get('refund_method', 'CASH')}, shop)
        if method == 'CREDIT':
            raise ValidationError('Choose a refund method.')
        refund = Payment.objects.create(customer=inv.customer, invoice=inv, amount=paid,
            method=method, direction='REFUND', note=f'Void {inv.number}: {reason}'[:500], created_by=user)
        if inv.customer:
            entry(inv.customer, paid, 'REVERSAL', user, refund.note, inv, refund)
    if inv.customer:
        entry(inv.customer, -inv.grand_total, 'REVERSAL', user, f'Void {inv.number}: {reason}', inv)
    for item in inv.items.select_related('product'):
        from .tracking import restore
        restore(item, item.quantity)
        stock(item.product, item.quantity, user, f'Void {inv.number}', inv)
    inv.status, inv.void_reason, inv.voided_at = 'VOID', reason[:500], timezone.now()
    inv.save(update_fields=['status', 'void_reason', 'voided_at'])
    CreditNote.objects.create(number=f'CN-{shop.next_credit_number:06d}', invoice=inv,
        reason=reason[:500], amount=inv.grand_total, created_by=user)
    shop.next_credit_number += 1
    shop.save(update_fields=['next_credit_number'])
    audit(user, 'INVOICE_VOIDED', f'{inv.number}: {reason}')
    return inv
