import uuid
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import Shop, Staff, Product, Customer, Invoice, Payment, LedgerEntry, StockMovement
from .permissions import ALL, DEFAULTS
from .services import balance, invoice_due, discount_shares

User = get_user_model()


class ShopTests(TestCase):
    def setUp(self):
        self.shop = Shop.objects.create(name='Test Shop', payment_methods=['CASH', 'UPI', 'CARD', 'CREDIT'])
        self.owner = User.objects.create_user('owner', password='Long!ShopPassword729')
        Staff.objects.create(user=self.owner, role='OWNER', permissions=ALL)
        self.cashier = User.objects.create_user('cashier', password='Long!CashPassword728')
        Staff.objects.create(user=self.cashier, role='CASHIER', permissions=DEFAULTS['CASHIER'])
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.product = Product.objects.create(name='Tea', sku='TEA', barcode='8901234567890', price='100.00', purchase_price='70.00', gst_percent='18', stock_quantity=10)
        self.customer = Customer.objects.create(name='Rahul', phone='9876543210')

    def bill(self, **kwargs):
        data = {'request_key': str(uuid.uuid4()), 'items': [{'product_id': self.product.id, 'quantity': 2}],
                'customer_id': self.customer.id, 'payment_method': 'CREDIT'}
        data.update(kwargs)
        return self.client.post('/api/invoices/', data, format='json')

    def pay(self, amount, **kwargs):
        data = {'request_key': str(uuid.uuid4()), 'amount': amount, 'payment_method': 'UPI'}
        data.update(kwargs)
        return self.client.post(f'/api/customers/{self.customer.id}/payments/', data, format='json')

    def test_credit_sale_stock_and_ledger(self):
        response = self.bill()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data['grand_total']), Decimal('236'))
        self.assertEqual(balance(self.customer), Decimal('236'))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.assertEqual(StockMovement.objects.get().quantity, -2)

    def test_partial_then_full_payment(self):
        inv = self.bill(payment_method='CASH', paid_amount='36').data
        self.assertEqual(balance(self.customer), Decimal('200'))
        self.assertEqual(self.pay('80').status_code, 201)
        self.assertEqual(balance(self.customer), Decimal('120'))
        self.assertEqual(self.pay('120').status_code, 201)
        self.assertEqual(balance(self.customer), 0)
        self.assertEqual(invoice_due(Invoice.objects.get(pk=inv['id'])), 0)

    def test_opening_then_fifo_allocation(self):
        LedgerEntry.objects.create(customer=self.customer, type='OPENING', amount=2000, description='Opening', created_by=self.owner)
        first = self.bill().data
        second = self.bill().data
        self.assertEqual(self.pay('2100').status_code, 201)
        self.assertEqual(balance(self.customer), Decimal('372'))
        self.assertEqual(invoice_due(Invoice.objects.get(pk=first['id'])), Decimal('136'))
        self.assertEqual(invoice_due(Invoice.objects.get(pk=second['id'])), Decimal('236'))

    def test_invoice_request_is_idempotent(self):
        key = str(uuid.uuid4())
        first = self.bill(request_key=key)
        second = self.bill(request_key=key)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)
        changed = self.bill(request_key=key, discount=1)
        self.assertEqual(changed.status_code, 400)

    def test_payment_request_is_idempotent(self):
        self.bill()
        key = str(uuid.uuid4())
        first = self.pay('100', request_key=key)
        second = self.pay('100', request_key=key)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(balance(self.customer), Decimal('136'))
        self.assertEqual(self.pay('101', request_key=key).status_code, 400)

    def test_insufficient_stock_rolls_back_everything(self):
        response = self.bill(items=[{'product_id': self.product.id, 'quantity': 11}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Invoice.objects.count(), 0)
        self.assertEqual(LedgerEntry.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.next_invoice_number, 1)

    def test_combined_duplicate_items_cannot_oversell(self):
        response = self.bill(items=[{'product_id': self.product.id, 'quantity': 6}, {'product_id': self.product.id, 'quantity': 6}])
        self.assertEqual(response.status_code, 400)

    def test_valid_duplicate_items_are_combined(self):
        response = self.bill(items=[{'product_id': self.product.id, 'quantity': 2}, {'product_id': self.product.id, 'quantity': 3}])
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['items'][0]['quantity'], 5)

    def test_invalid_quantities(self):
        for quantity in [-1, 0, 1.5, 'NaN', 'invalid']:
            with self.subTest(quantity=quantity):
                self.assertEqual(self.bill(items=[{'product_id': self.product.id, 'quantity': quantity}]).status_code, 400)

    def test_credit_requires_customer(self):
        self.assertEqual(self.bill(customer_id=None).status_code, 400)
        self.assertEqual(self.bill(customer_id=None, payment_method='CASH', paid_amount=20).status_code, 400)

    def test_walkin_cash_sale_and_void(self):
        response = self.bill(customer_id=None, payment_method='CASH')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(LedgerEntry.objects.count(), 0)
        inv = Invoice.objects.get(pk=response.data['id'])
        result = self.client.post(f'/api/invoices/{inv.id}/void/', {'reason': 'Wrong sale', 'refund_method': 'CASH'}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(Payment.objects.filter(direction='REFUND').get().amount, Decimal('236'))

    def test_void_twice_restores_stock_once_and_refunds_allocated_payment(self):
        inv = self.bill().data
        self.pay('100')
        for _ in range(2):
            response = self.client.post(f"/api/invoices/{inv['id']}/void/", {'reason': 'Customer cancelled', 'refund_method': 'UPI'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(balance(self.customer), 0)
        self.assertEqual(Payment.objects.filter(direction='REFUND').count(), 1)
        self.assertEqual(Payment.objects.get(direction='REFUND').amount, Decimal('100'))
        self.assertEqual(StockMovement.objects.count(), 2)

    def test_invoice_values_are_snapshots(self):
        self.shop.logo = 'logos/original.png'
        self.shop.save()
        inv = self.bill().data
        self.product.price = 999
        self.product.name = 'Changed'
        self.product.save()
        self.shop.name = 'Changed Shop'
        self.shop.logo = 'logos/replacement.png'
        self.shop.save()
        data = self.client.get(f"/api/invoices/{inv['id']}/").data
        self.assertEqual(data['items'][0]['name'], 'Tea')
        self.assertEqual(data['items'][0]['price'], '100.00')
        self.assertEqual(data['shop_snapshot']['name'], 'Test Shop')
        self.assertEqual(data['shop_snapshot']['logo'], 'logos/original.png')

    def test_discount_and_tax_rounding(self):
        result = self.bill(discount='20').data
        self.assertEqual(result['gst_amount'], '32.40')
        self.assertEqual(result['grand_total'], '212.40')
        self.assertEqual(sum(discount_shares([Decimal('.01')]*9, Decimal('.05'))), Decimal('.05'))
        self.assertTrue(all(0 <= x <= Decimal('.01') for x in discount_shares([Decimal('.01')]*9, Decimal('.05'))))

    def test_disabled_tax(self):
        self.shop.tax_enabled = False
        self.shop.save()
        result = self.bill().data
        self.assertEqual(result['gst_amount'], '0.00')
        self.assertEqual(result['grand_total'], '200.00')

    def test_invalid_payments_and_backdating(self):
        self.bill()
        for amount in ['0', '-1', '237', 'NaN', 'Infinity']:
            self.assertEqual(self.pay(amount).status_code, 400)
        self.assertEqual(self.pay('10', transaction_date=(timezone.now()-timedelta(days=1)).isoformat()).status_code, 400)
        self.assertEqual(self.pay('10', transaction_date=(timezone.now()+timedelta(days=1)).isoformat()).status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(balance(self.customer), Decimal('236'))

    def test_due_and_overdue(self):
        inv = Invoice.objects.get(pk=self.bill().data['id'])
        inv.due_date = timezone.localdate()-timedelta(days=1)
        inv.save()
        self.assertTrue(self.client.get('/api/customers/').data[0]['overdue'])
        self.pay('236')
        self.assertFalse(self.client.get('/api/customers/').data[0]['overdue'])

    def test_cashier_permissions_and_price_privacy(self):
        self.client.force_authenticate(self.cashier)
        self.assertNotIn('purchase_price', self.client.get('/api/products/').data[0])
        for path in ['/api/reports/', '/api/dashboard/', '/api/staff/', '/api/activity/', '/api/reports/export/']:
            self.assertEqual(self.client.get(path).status_code, 403, path)
        self.assertEqual(self.client.patch(f'/api/products/{self.product.id}/', {'price': 1}, format='json').status_code, 403)
        self.assertEqual(self.client.patch('/api/shop/', {'name': 'Bad'}, format='json').status_code, 403)
        self.assertEqual(self.bill(discount=1).status_code, 403)
        self.assertEqual(self.bill().status_code, 201)

    def test_owner_cannot_be_disabled(self):
        self.assertEqual(self.client.patch(f'/api/staff/{self.owner.id}/', {'active': False}, format='json').status_code, 400)

    def test_disabled_staff_loses_existing_session(self):
        other = APIClient()
        other.force_login(self.cashier)
        self.assertIsNotNone(other.get('/api/session/').data['user'])
        self.client.patch(f'/api/staff/{self.cashier.id}/', {'active': False}, format='json')
        self.assertIsNone(other.get('/api/session/').data['user'])

    def test_debit_adjustment_and_negative_balance_guard(self):
        url = f'/api/customers/{self.customer.id}/adjustments/'
        key = str(uuid.uuid4())
        payload = {'request_key': key, 'amount': 50, 'note': 'Opening correction'}
        self.assertEqual(self.client.post(url, payload, format='json').status_code, 200)
        self.client.post(url, payload, format='json')
        self.assertEqual(balance(self.customer), 50)
        self.assertEqual(self.client.post(url, {'request_key': str(uuid.uuid4()), 'amount': -51, 'note': 'Correction'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'request_key': str(uuid.uuid4()), 'amount': -20, 'note': 'Correction'}, format='json').status_code, 200)
        self.assertEqual(balance(self.customer), 30)

    def test_customer_archive_requires_settled_balance(self):
        self.bill()
        self.assertEqual(self.client.delete(f'/api/customers/{self.customer.id}/').status_code, 400)
        self.pay('236')
        self.assertEqual(self.client.delete(f'/api/customers/{self.customer.id}/').status_code, 204)
        self.assertEqual(self.client.get(f'/api/customers/{self.customer.id}/').status_code, 200)

    def test_stock_adjustment_idempotency_and_no_negative_stock(self):
        url = f'/api/products/{self.product.id}/stock/'
        data = {'request_key': str(uuid.uuid4()), 'quantity': 3, 'reason': 'Delivery'}
        self.assertEqual(self.client.post(url, data, format='json').status_code, 200)
        self.assertEqual(self.client.post(url, data, format='json').status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 13)
        self.assertEqual(self.client.post(url, {'request_key': str(uuid.uuid4()), 'quantity': -14, 'reason': 'Damaged'}, format='json').status_code, 400)

    def test_product_decimal_and_duplicates(self):
        data = {'name': 'Soap', 'sku': 'SOAP', 'price': '12.50', 'purchase_price': '8.25', 'gst_percent': '2.50', 'opening_stock': 5}
        first = self.client.post('/api/products/', data, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data['stock_quantity'], 5)
        self.assertEqual(self.client.post('/api/products/', data, format='json').status_code, 400)

    def test_numbering_and_method_validation(self):
        self.bill()
        self.assertEqual(self.client.patch('/api/shop/', {'next_invoice_number': 1}, format='json').status_code, 400)
        self.assertEqual(self.client.patch('/api/shop/', {'payment_methods': ['CREDIT']}, format='json').status_code, 400)
        self.assertEqual(self.bill(payment_method='BITCOIN').status_code, 400)

    def test_reports_reconcile(self):
        self.bill(payment_method='CASH', paid_amount='36')
        self.pay('100')
        data = self.client.get('/api/dashboard/').data['stats']
        self.assertEqual(Decimal(data['sales']), 236)
        self.assertEqual(Decimal(data['collections']), 136)
        self.assertEqual(Decimal(data['udhar']), 200)
        self.assertEqual(Decimal(data['outstanding']), 100)

    def test_pdf_and_csv_responses(self):
        inv = self.bill().data
        for url in [f"/api/invoices/{inv['id']}/pdf/", f'/api/customers/{self.customer.id}/statement/']:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.content.startswith(b'%PDF'))
        response = self.client.get('/api/reports/export/')
        self.assertIn(inv['number'], response.content.decode())
        self.assertEqual(self.client.get('/api/reports/?from=bad').status_code, 400)

    def test_anonymous_cannot_read_business_data(self):
        self.client.force_authenticate(None)
        for url in ['/api/products/', '/api/customers/', '/api/invoices/', '/api/stock-history/']:
            self.assertEqual(self.client.get(url).status_code, 403)

    def test_setup_cannot_create_second_owner(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/setup/', {'username': 'other', 'password': 'Long!OtherPassword918', 'shop_name': 'Other'}, format='json')
        self.assertEqual(response.status_code, 403)


class CsrfTests(TestCase):
    def test_login_and_setup_require_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        for url in ['/api/login/', '/api/setup/']:
            response = client.post(url, {'username': 'owner', 'password': 'Long!SecurePassword1', 'shop_name': 'Test'}, format='json')
            self.assertEqual(response.status_code, 403, (url, response.content))

    def test_setup_and_login_with_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        session = client.get('/api/session/')
        response = client.post('/api/setup/', {'username': 'owner', 'password': 'Long!SecurePassword749', 'shop_name': 'Test'}, format='json', HTTP_X_CSRFTOKEN=session.data['csrf'])
        self.assertEqual(response.status_code, 201, response.content)
        token = response.data['csrf']
        self.assertEqual(client.post('/api/logout/', {}, format='json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        session = client.get('/api/session/')
        response = client.post('/api/login/', {'username': 'owner', 'password': 'Long!SecurePassword749'}, format='json', HTTP_X_CSRFTOKEN=session.data['csrf'])
        self.assertEqual(response.status_code, 200, response.content)
