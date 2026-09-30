from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Q,F
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Product,StockLot,SerialUnit,LotAllocation,TrackingEvent
from .permissions import require
from . import services as s


def serial_list(value):
    values=value if isinstance(value,list) else str(value or '').replace(',', '\n').splitlines()
    values=[str(x).strip() for x in values if str(x).strip()]
    if not values or len(values)!=len(set(values)) or any(len(x)>100 for x in values):
        raise ValidationError('Enter distinct serial numbers, one per line (up to 100 characters each).')
    return values


def receive(product,qty,data):
    if product.tracking=='BATCH':
        batch=str(data.get('batch','')).strip()
        if not batch or len(batch)>100:
            raise ValidationError('Enter a batch number.')
        try:
            expiry=parse_date(str(data['expiry'])) if data.get('expiry') else None
        except ValueError:
            raise ValidationError('Invalid expiry date.')
        if data.get('expiry') and not expiry:
            raise ValidationError('Invalid expiry date.')
        lot=StockLot.objects.filter(product=product,batch=batch).first()
        if lot:
            if lot.expiry!=expiry:
                raise ValidationError('This batch already has a different expiry date.')
            lot.available+=qty
            lot.save(update_fields=['available'])
        else:
            StockLot.objects.create(product=product,batch=batch,expiry=expiry,available=qty)
    elif product.tracking=='SERIAL':
        values=serial_list(data.get('serials'))
        if Decimal(len(values))!=qty or SerialUnit.objects.filter(serial__in=values).exists():
            raise ValidationError('Provide one new unique serial number per piece.')
        SerialUnit.objects.bulk_create([SerialUnit(product=product,serial=x) for x in values])


def sell(item,data):
    product=item.product
    if product.tracking=='BATCH':
        left=item.quantity
        lots=product.lots.filter(available__gt=0).filter(Q(expiry__isnull=True)|Q(expiry__gte=timezone.localdate())).order_by(F('expiry').asc(nulls_last=True),'id')
        for lot in lots:
            used=min(left,lot.available)
            if used:
                LotAllocation.objects.create(lot=lot,item=item,quantity=used)
                lot.available-=used
                lot.save(update_fields=['available'])
                left-=used
        if left:
            raise ValidationError(f'Not enough unexpired batch stock for {product.name}.')
    elif product.tracking=='SERIAL':
        values=serial_list(data.get('serials'))
        units=list(product.serials.filter(serial__in=values,status='AVAILABLE'))
        if len(units)!=len(values) or Decimal(len(values))!=item.quantity:
            raise ValidationError('Choose one available serial number per sold piece.')
        item.serial_numbers=values
        item.save(update_fields=['serial_numbers'])
        for unit in units:
            unit.status='SOLD'
            unit.item=item
            unit.warranty_until=timezone.localdate()+timedelta(days=product.warranty_days) if product.warranty_days else None
            unit.save()


def restore(item,qty,restock=True,serials=None):
    if item.product.tracking=='BATCH':
        left=qty
        for allocation in item.lot_allocations.select_related('lot').order_by('id'):
            used=min(left,allocation.quantity-allocation.returned)
            allocation.returned+=used
            allocation.save(update_fields=['returned'])
            if restock:
                allocation.lot.available+=used
                allocation.lot.save(update_fields=['available'])
            left-=used
        if left:
            raise ValidationError('Return exceeds batch allocations.')
    elif item.product.tracking=='SERIAL':
        units=item.serial_units.filter(status='SOLD')
        if serials is not None:
            values=serial_list(serials)
            units=units.filter(serial__in=values)
            if len(values)!=qty:
                raise ValidationError('Choose exactly the returned serial numbers.')
        if units.count()!=qty:
            raise ValidationError('Select the serial numbers being returned from this invoice.')
        for unit in units:
            unit.status='AVAILABLE' if restock else 'RETIRED'
            # Keep last sale reference until sold again; invoices retain their serial snapshot.
            unit.save(update_fields=['status'])


@api_view(['GET','POST'])
def inventory(request,pk):
    product=get_object_or_404(Product,pk=pk,active=True)
    if request.method=='GET':
        return Response({'lots':list(product.lots.order_by('expiry').values()),'serials':list(product.serials.values())})
    require(request.user,'inventory.adjust')
    from .operations import retry,text
    with transaction.atomic():
        s.lock_shop()
        product.refresh_from_db()
        old,key,digest=retry(TrackingEvent,request.user,request.data)
        if old:
            if old.product_id!=pk:
                raise ValidationError('Request belongs to another product.')
            return Response({'id':old.id})
        if product.tracking=='NONE':
            raise ValidationError('This product uses normal stock adjustment.')
        qty=s.quantity(request.data.get('quantity'),product.unit)
        action=request.data.get('action','RECEIVE')
        reason=text(request.data,'reason',400)
        if action=='RECEIVE':
            receive(product,qty,request.data)
            s.stock(product,qty,request.user,'Tracked receipt: '+reason)
        elif action=='WASTE':
            if product.tracking=='BATCH':
                lot=get_object_or_404(StockLot,product=product,batch=request.data.get('batch'))
                if lot.available<qty:
                    raise ValidationError('Wastage exceeds batch stock.')
                lot.available-=qty
                lot.save(update_fields=['available'])
            else:
                values=serial_list(request.data.get('serials'))
                units=product.serials.filter(serial__in=values,status='AVAILABLE')
                if len(values)!=qty or units.count()!=qty:
                    raise ValidationError('Choose available serial numbers matching the quantity.')
                units.update(status='RETIRED')
            s.stock(product,-qty,request.user,'Wastage: '+reason)
        else:
            raise ValidationError('Choose RECEIVE or WASTE.')
        event=TrackingEvent.objects.create(product=product,request_key=key,request_hash=digest,created_by=request.user)
        s.audit(request.user,'TRACKED_STOCK',f'{product.sku}: {action} {qty}; {reason}')
        return Response({'id':event.id},status=201)
