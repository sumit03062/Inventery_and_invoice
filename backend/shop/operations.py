"""Purchases, expenses, physical counts and item returns; all writes are atomic."""
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import (Supplier, SupplierEntry, Purchase, PurchaseItem, Expense, SaleReturn,
                     ReturnItem, StockCount, Product, Invoice, InvoiceItem, Payment)
from .permissions import require
from . import services as s
from .reports import dates


def text(data, key, maximum=500):
    value = str(data.get(key, '')).strip()
    if not value or len(value) > maximum:
        raise ValidationError(f'{key}: enter 1 to {maximum} characters.')
    return value


def date_value(data):
    try:
        value = parse_date(str(data.get('date', timezone.localdate())))
    except ValueError:
        value = None
    if not value or value > timezone.localdate():
        raise ValidationError('Use a valid date, today or earlier.')
    return value


def retry(model, user, data):
    key, digest = s.request_key(data), s.fingerprint(data)
    old = model.objects.filter(request_key=key).first()
    if old and (old.request_hash != digest or old.created_by_id != user.id):
        raise ValidationError('Request key was already used for a different operation.')
    return old, key, digest


def supplier_due(obj):
    return s.money(obj.ledger.aggregate(v=Sum('amount'))['v'] or 0)


class SupplierSerializer(serializers.ModelSerializer):
    outstanding = serializers.SerializerMethodField()
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['active']
    def get_outstanding(self, obj):
        return str(supplier_due(obj))
    def validate_gstin(self, value):
        from .serializers import validate_gstin
        return validate_gstin(value)


@api_view(['GET', 'POST'])
def suppliers(request):
    require(request.user, 'purchases.manage')
    if request.method == 'POST':
        with transaction.atomic():
            s.lock_shop()
            serializer = SupplierSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            opening = s.money(request.data.get('opening_balance', 0))
            if opening < 0:
                raise ValidationError('Opening payable cannot be negative.')
            if opening:
                SupplierEntry.objects.create(supplier=obj, amount=opening, note='Opening payable', created_by=request.user)
            s.audit(request.user, 'SUPPLIER_CREATED', obj.name)
            return Response(SupplierSerializer(obj).data, status=201)
    return Response(SupplierSerializer(Supplier.objects.all().order_by('name'), many=True).data)


@api_view(['GET', 'PATCH'])
def supplier_detail(request, pk):
    require(request.user, 'purchases.manage')
    obj = get_object_or_404(Supplier, pk=pk)
    if request.method == 'PATCH':
        serializer = SupplierSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        s.audit(request.user, 'SUPPLIER_UPDATED', obj.name)
    return Response({'supplier':SupplierSerializer(obj).data, 'ledger':list(obj.ledger.order_by('date','id').values())})


@api_view(['POST'])
@transaction.atomic
def supplier_payment(request, pk):
    require(request.user, 'purchases.manage')
    shop = s.lock_shop()
    obj = get_object_or_404(Supplier, pk=pk)
    old, key, digest = retry(SupplierEntry, request.user, request.data)
    if old:
        if old.supplier_id != pk:
            raise ValidationError('Payment belongs to another supplier.')
        return Response({'id':old.id})
    amount = s.money(request.data.get('amount'))
    method = s.payment_method(request.data, shop)
    if amount <= 0 or amount > supplier_due(obj) or method == 'CREDIT':
        raise ValidationError('Choose a collection method and a positive payment no larger than the supplier balance.')
    row = SupplierEntry.objects.create(supplier=obj, amount=-amount, method=method,
        note=text(request.data,'note'), date=date_value(request.data), request_key=key, request_hash=digest, created_by=request.user)
    s.audit(request.user, 'SUPPLIER_PAYMENT', f'{obj.name}: {amount}')
    return Response({'id':row.id}, status=201)


@api_view(['GET', 'POST'])
def purchases(request):
    require(request.user, 'purchases.manage')
    if request.method == 'GET':
        return Response([{**row, 'items':list(PurchaseItem.objects.filter(purchase_id=row['id']).values('product_id','product__name','quantity','unit_cost','tax','total'))}
            for row in Purchase.objects.order_by('-id').values('id','supplier_id','supplier__name','reference','date','total')])
    with transaction.atomic():
        shop = s.lock_shop()
        old, key, digest = retry(Purchase, request.user, request.data)
        if old:
            return Response({'id':old.id})
        supplier = get_object_or_404(Supplier, pk=s.integer(request.data.get('supplier_id')), active=True)
        reference = text(request.data,'reference',100)
        if Purchase.objects.filter(supplier=supplier, reference=reference).exists():
            raise ValidationError('This supplier bill number is already recorded.')
        lines = request.data.get('items')
        if not isinstance(lines,list) or not 1 <= len(lines) <= 100:
            raise ValidationError('Add between 1 and 100 purchase lines.')
        purchase = Purchase.objects.create(supplier=supplier, reference=reference, date=date_value(request.data),
            total=0, request_key=key, request_hash=digest, created_by=request.user)
        total = s.ZERO
        seen = set()
        for line in lines:
            if not isinstance(line,dict):
                raise ValidationError('Invalid purchase line.')
            product = get_object_or_404(Product, pk=s.integer(line.get('product_id')), active=True)
            if product.id in seen:
                raise ValidationError('Combine duplicate product lines.')
            seen.add(product.id)
            qty, detail = s.stock_input(line, product)
            cost, tax = s.money(line.get('unit_cost')), s.money(line.get('tax',0))
            if qty <= 0 or cost < 0 or tax < 0:
                raise ValidationError('Quantity must be positive; unit cost and line tax cannot be negative.')
            line_total = s.money(qty*cost)+tax
            PurchaseItem.objects.create(purchase=purchase, product=product, quantity=qty, unit_cost=cost, tax=tax, total=line_total)
            from .tracking import receive
            receive(product,qty,line)
            s.stock(product, qty, request.user, f'Purchase {reference}'+detail)
            # Moving average net cost; purchase tax is kept separate from inventory cost.
            old_qty = product.stock_quantity - qty
            product.purchase_price = s.money((old_qty*product.purchase_price+qty*cost)/product.stock_quantity)
            product.save(update_fields=['purchase_price'])
            total += line_total
        purchase.total = s.money(total)
        purchase.save(update_fields=['total'])
        SupplierEntry.objects.create(supplier=supplier, purchase=purchase, amount=total, note=f'Bill {reference}', date=purchase.date, created_by=request.user)
        paid = s.money(request.data.get('paid_amount',0))
        if not 0 <= paid <= total:
            raise ValidationError('Payment must be between zero and bill total.')
        if paid:
            method = s.payment_method(request.data,shop)
            if method == 'CREDIT':
                raise ValidationError('Select cash, UPI or card for money paid.')
            SupplierEntry.objects.create(supplier=supplier,purchase=purchase,amount=-paid,method=method,
                note=f'Payment for {reference}',date=purchase.date,created_by=request.user)
        s.audit(request.user,'PURCHASE_CREATED',reference)
        return Response({'id':purchase.id,'total':str(total)},status=201)


@api_view(['GET','POST'])
def expenses(request):
    require(request.user,'expenses.manage')
    if request.method == 'GET':
        return Response(list(Expense.objects.order_by('-date','-id').values()))
    with transaction.atomic():
        shop=s.lock_shop()
        old,key,digest=retry(Expense,request.user,request.data)
        if old:
            return Response({'id':old.id})
        amount=s.money(request.data.get('amount'))
        method=s.payment_method(request.data,shop)
        if amount<=0 or method=='CREDIT':
            raise ValidationError('Use a positive expense and a paid method.')
        row=Expense.objects.create(category=text(request.data,'category',100),description=text(request.data,'description'),
            amount=amount,date=date_value(request.data),method=method,request_key=key,request_hash=digest,created_by=request.user)
        s.audit(request.user,'EXPENSE_CREATED',f'{row.category}: {amount}')
        return Response({'id':row.id},status=201)


@api_view(['POST'])
@transaction.atomic
def void_expense(request,pk):
    require(request.user,'expenses.manage')
    s.lock_shop()
    obj=get_object_or_404(Expense,pk=pk)
    if not obj.void_reason:
        obj.void_reason=text(request.data,'reason')
        obj.save(update_fields=['void_reason'])
        s.audit(request.user,'EXPENSE_VOIDED',f'{pk}: {obj.void_reason}')
    return Response({'id':pk})


@api_view(['GET','POST'])
def stock_counts(request):
    require(request.user,'inventory.adjust')
    if request.method=='GET':
        return Response(list(StockCount.objects.order_by('-id').values('id','product__name','product__unit','expected','counted','reason','created_at')))
    with transaction.atomic():
        s.lock_shop()
        old,key,digest=retry(StockCount,request.user,request.data)
        if old:
            return Response({'id':old.id})
        p=get_object_or_404(Product,pk=s.integer(request.data.get('product_id')),active=True)
        if p.tracking!='NONE':
            raise ValidationError('Count tracked stock by batch or serial; use tracked receipt or wastage to reconcile differences.')
        expected=s.quantity(request.data.get('expected'),p.unit,minimum=0,maximum=Decimal('999999999999.999'))
        counted=s.quantity(request.data.get('counted'),p.unit,minimum=0)
        if expected!=p.stock_quantity:
            raise ValidationError('Stock changed since you opened the count. Refresh and count again.')
        reason=text(request.data,'reason',450)
        obj=StockCount.objects.create(product=p,expected=expected,counted=counted,reason=reason,request_key=key,request_hash=digest,created_by=request.user)
        if counted!=expected:
            s.stock(p,counted-expected,request.user,'Physical count: '+reason,key=key)
        s.audit(request.user,'STOCK_COUNT',f'{p.sku}: {expected} -> {counted}')
        return Response({'id':obj.id},status=201)


def return_data(row):
    return {'id':row.id,'number':row.number,'total':str(row.total),'refund':str(row.refund),'reason':row.reason,'created_at':row.created_at,
        'items':list(row.items.values('item_id','item__name','quantity','total','restock'))}


@api_view(['GET','POST'])
def returns(request,pk):
    require(request.user,'returns.create')
    invoice=get_object_or_404(Invoice,pk=pk)
    if request.method=='GET':
        return Response([return_data(x) for x in invoice.returns.order_by('-id')])
    with transaction.atomic():
        shop=s.lock_shop()
        old,key,digest=retry(SaleReturn,request.user,request.data)
        if old:
            if old.invoice_id!=pk:
                raise ValidationError('Return belongs to another invoice.')
            return Response(return_data(old))
        invoice.refresh_from_db()
        if invoice.status!='ACTIVE':
            raise ValidationError('Cannot return a void invoice.')
        lines=request.data.get('items')
        if not isinstance(lines,list) or not 1<=len(lines)<=100:
            raise ValidationError('Select items to return.')
        row=SaleReturn.objects.create(invoice=invoice,number=f'CN-{shop.next_credit_number:06d}',reason=text(request.data,'reason'),
            total=0,refund=0,request_key=key,request_hash=digest,created_by=request.user)
        parts={k:s.ZERO for k in ['taxable','cgst','sgst','utgst','igst','gst_amount','grand_total','cost']}
        seen=set()
        for line in lines:
            if not isinstance(line,dict):
                raise ValidationError('Invalid return line.')
            item=get_object_or_404(InvoiceItem,pk=s.integer(line.get('item_id')),invoice=invoice)
            if item.id in seen:
                raise ValidationError('Select each item once.')
            seen.add(item.id)
            qty=s.quantity(line.get('quantity'),item.unit)
            previous=list(item.returns.all())
            before=sum((x.quantity for x in previous),Decimal(0))
            if before+qty>item.quantity:
                raise ValidationError(f'Return quantity exceeds remaining sold quantity for {item.name}.')
            values={'taxable':item.total-item.tax,'gst_amount':item.tax,'grand_total':item.total,
                'cost':s.money(item.purchase_price*item.quantity),**{k:getattr(item,k) for k in ['cgst','sgst','utgst','igst']}}
            allocated={k:s.money(v*(before+qty)/item.quantity)-sum((Decimal(x.tax_parts[k]) for x in previous),s.ZERO) for k,v in values.items()}
            # Tax components and taxable value must add to the saved return total.
            allocated['taxable']=allocated['grand_total']-allocated['gst_amount']
            if invoice.shop_snapshot.get('gst_mode')=='DOMESTIC':
                allocated['gst_amount']=sum((allocated[k] for k in ['cgst','sgst','utgst','igst']),s.ZERO)
                allocated['taxable']=allocated['grand_total']-allocated['gst_amount']
            restock=line.get('restock',True)
            if not isinstance(restock,bool):
                raise ValidationError('Restock must be true or false.')
            from .tracking import restore, serial_list
            restore(item,qty,restock,line.get('serials') if item.product.tracking=='SERIAL' else None)
            ReturnItem.objects.create(serial_numbers=serial_list(line.get('serials')) if item.product.tracking=='SERIAL' else [],sale_return=row,item=item,quantity=qty,total=allocated['grand_total'],restock=restock,tax_parts={k:str(v) for k,v in allocated.items()})
            if restock:
                s.stock(item.product,qty,request.user,f'Return {row.number}',invoice)
            for k,v in allocated.items():
                parts[k]+=v
        row.total=parts['grand_total']
        row.refund=max(s.ZERO,row.total-s.invoice_due(invoice))
        row.tax_parts={k:str(v) for k,v in parts.items()}
        if invoice.customer:
            s.entry(invoice.customer,-row.total,'REVERSAL',request.user,f'Return {row.number}',invoice)
        if row.refund:
            method=s.payment_method({'payment_method':request.data.get('refund_method','CASH')},shop)
            if method=='CREDIT':
                raise ValidationError('Choose a refund method.')
            pay=Payment.objects.create(invoice=invoice,customer=invoice.customer,amount=row.refund,method=method,direction='REFUND',created_by=request.user,note=f'Return {row.number}')
            if invoice.customer:
                s.entry(invoice.customer,row.refund,'REVERSAL',request.user,pay.note,invoice,pay)
        row.save()
        shop.next_credit_number+=1
        shop.save(update_fields=['next_credit_number'])
        s.audit(request.user,'SALE_RETURN',row.number)
        return Response(return_data(row),status=201)


@api_view(['GET'])
def profit(request):
    require(request.user,'reports.view')
    start,end=dates(request)
    items=InvoiceItem.objects.filter(invoice__status='ACTIVE',invoice__created_at__date__range=(start,end))
    revenue=sum((x.total-x.tax for x in items),s.ZERO)
    cost=sum((s.money(x.purchase_price*x.quantity) for x in items),s.ZERO)
    for row in SaleReturn.objects.filter(created_at__date__range=(start,end)):
        revenue-=Decimal(row.tax_parts['taxable'])
        # Damaged returns do not recover inventory cost.
        cost-=sum((Decimal(x.tax_parts['cost']) for x in row.items.filter(restock=True)),s.ZERO)
    expense=Expense.objects.filter(void_reason='',date__range=(start,end)).aggregate(v=Sum('amount'))['v'] or s.ZERO
    return Response({'revenue_ex_tax':str(revenue),'cost_of_goods':str(cost),'gross_profit':str(revenue-cost),
        'expenses':str(expense),'net_profit':str(revenue-cost-expense)})


@api_view(['GET'])
def return_pdf(request,pk):
    from .documents import document,p,table
    require(request.user,'returns.create')
    row=get_object_or_404(SaleReturn,pk=pk)
    return document([p(row.number,'Title'),p(f'Credit note for {row.invoice.number}'),p(str(timezone.localdate(row.created_at))),p(row.reason),
        table([['Item','Quantity','Credit']]+[[x.item.name,str(x.quantity),str(x.total)] for x in row.items.select_related('item')],[280,80,120]),
        p(f'Total credit INR {row.total}; refund recorded INR {row.refund}'),p('Refunds must be returned separately using the recorded method.'),
        *[p(f'{k}: INR {v}') for k,v in row.tax_parts.items() if k not in ['cost','grand_total']]],row.number)
