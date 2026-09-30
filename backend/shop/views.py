import csv
import io
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import authenticate, login as sign_in, logout as sign_out, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.db.models import F, Q, Sum, Count
from django.http import HttpResponse, FileResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Shop, Staff, Category, Product, Customer, Invoice, Payment, LedgerEntry, StockMovement, Activity
from .serializers import ShopSerializer, ProductSerializer, CustomerSerializer, InvoiceSerializer, PaymentSerializer, LedgerSerializer, MovementSerializer, ActivitySerializer
from .permissions import ALL, DEFAULTS, permissions_for, require
from . import services as svc

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return Response({'status':'ok'})
    except Exception:
        return Response({'status':'unavailable'},status=503)


class LoginThrottle(AnonRateThrottle):
    rate = '20/minute'


def user_data(user):
    return {'id': user.id, 'username': user.username, 'name': user.first_name,
            'role': user.profile.role, 'permissions': permissions_for(user)}


@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def session(request):
    return Response({'user': user_data(request.user) if request.user.is_authenticated and hasattr(request.user, 'profile') else None,
                     'csrf': get_token(request), 'needs_setup': not Staff.objects.filter(role='OWNER').exists()})


@csrf_protect
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    SessionAuthentication().enforce_csrf(request)
    user = authenticate(request, username=request.data.get('username'), password=request.data.get('password'))
    if not user or not hasattr(user, 'profile'):
        raise ValidationError('Invalid username or password.')
    sign_in(request, user)
    svc.audit(user, 'LOGIN', 'Signed in')
    return Response({'user': user_data(user), 'csrf': get_token(request)})


@csrf_protect
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
@transaction.atomic
def setup(request):
    SessionAuthentication().enforce_csrf(request)
    shop, _ = Shop.objects.get_or_create(pk=1)
    svc.lock_shop()
    if Staff.objects.filter(role='OWNER').exists():
        raise PermissionDenied('This shop is already configured. Ask the owner for a staff login.')
    username = str(request.data.get('username', '')).strip()
    name = str(request.data.get('shop_name', '')).strip()
    if not username or len(username) > 150 or not name or len(name) > 150:
        raise ValidationError('Provide a username and shop name, each up to 150 characters.')
    user = User(username=username, first_name=str(request.data.get('owner_name', ''))[:150])
    user.full_clean(exclude=['password'])
    password = request.data.get('password', '')
    validate_password(password, user)
    user.set_password(password)
    user.save()
    Staff.objects.create(user=user, role='OWNER', permissions=ALL)
    shop.name, shop.owner_name = name, user.first_name
    shop.payment_methods = ['CASH', 'UPI', 'CARD', 'CREDIT']
    shop.save()
    sign_in(request, user)
    svc.audit(user, 'SHOP_CREATED', name)
    return Response({'user': user_data(user), 'csrf': get_token(request)}, status=201)


@api_view(['POST'])
def logout(request):
    svc.audit(request.user, 'LOGOUT', 'Signed out')
    sign_out(request)
    return Response({'ok': True})


@api_view(['GET', 'PATCH'])
def shop_settings(request):
    shop = get_object_or_404(Shop, pk=1)
    if request.method == 'PATCH':
        require(request.user, 'settings.manage')
        with transaction.atomic():
            shop = svc.lock_shop()
            serializer = ShopSerializer(shop, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            svc.audit(request.user, 'SHOP_UPDATED', 'Shop and invoice settings updated')
    return Response(ShopSerializer(shop).data)


@api_view(['POST'])
def logo(request):
    require(request.user, 'settings.manage')
    shop = get_object_or_404(Shop, pk=1)
    if 'logo' not in request.FILES:
        raise ValidationError('Choose a logo file.')
    serializer = ShopSerializer(shop, data={'logo': request.FILES['logo']}, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    svc.audit(request.user, 'LOGO_UPDATED', 'Shop logo updated')
    return Response(serializer.data)


@api_view(['GET'])
def logo_image(request):
    shop = get_object_or_404(Shop, pk=1)
    if not shop.logo:
        return HttpResponse(status=404)
    return FileResponse(shop.logo.open('rb'))


@api_view(['GET', 'POST'])
def categories(request):
    if request.method == 'POST':
        require(request.user, 'products.write')
        name = str(request.data.get('name', '')).strip()
        if not name or len(name) > 100:
            raise ValidationError('Enter a category name up to 100 characters.')
        obj, _ = Category.objects.get_or_create(name=name)
        svc.audit(request.user, 'CATEGORY_SAVED', name)
        return Response({'id': obj.id, 'name': obj.name}, status=201)
    return Response(list(Category.objects.order_by('name').values('id', 'name')))


@api_view(['GET', 'POST'])
def products(request):
    if request.method == 'POST':
        require(request.user, 'products.write')
        require(request.user, 'prices.write')
        with transaction.atomic():
            svc.lock_shop()
            serializer = ProductSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            opening, detail = svc.stock_input(request.data, obj, 'opening_stock', opening=True)
            if opening and obj.tracking!='NONE':
                raise ValidationError('For tracked products, start at zero and receive stock with batch or serial details.')
            if opening:
                svc.stock(obj, opening, request.user, 'Opening stock' + detail)
            svc.audit(request.user, 'PRODUCT_CREATED', obj.name)
        return Response(ProductSerializer(obj, context={'request': request}).data, status=201)
    qs = Product.objects.filter(active=True).select_related('category').order_by('name')
    search = request.query_params.get('search', '')
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search) | Q(barcode__icontains=search))
    if request.query_params.get('low_stock') == 'true':
        qs = qs.filter(stock_quantity__lte=F('low_stock_threshold'))
    return Response(ProductSerializer(qs, many=True, context={'request': request}).data)


@api_view(['PATCH', 'DELETE'])
@transaction.atomic
def product_detail(request, pk):
    require(request.user, 'products.write')
    svc.lock_shop()
    obj = get_object_or_404(Product, pk=pk, active=True)
    if request.method == 'DELETE':
        obj.active = False
        obj.save(update_fields=['active'])
        svc.audit(request.user, 'PRODUCT_ARCHIVED', obj.name)
        return Response(status=204)
    if any(key in request.data for key in ['price', 'purchase_price', 'gst_percent', 'price_includes_tax']):
        require(request.user, 'prices.write')
    serializer = ProductSerializer(obj, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    svc.audit(request.user, 'PRODUCT_UPDATED', obj.name)
    return Response(serializer.data)


@api_view(['POST'])
@transaction.atomic
def adjust_stock(request, pk):
    require(request.user, 'inventory.adjust')
    svc.lock_shop()
    obj = get_object_or_404(Product, pk=pk, active=True)
    key = svc.request_key(request.data)
    if obj.tracking!='NONE':
        raise ValidationError('Use tracked stock receipt or wastage for this product.')
    quantity, detail = svc.stock_input(request.data, obj)
    reason = str(request.data.get('reason', '')).strip()
    if len(reason) < 3 or len(reason) + len(detail) > 500:
        raise ValidationError('Enter a reason between 3 and 450 characters.')
    reason += detail
    existing = StockMovement.objects.filter(request_key=key).first()
    if existing:
        if existing.product_id != pk or existing.quantity != quantity or existing.reason != reason or existing.created_by_id != request.user.id:
            raise ValidationError('Request key already used for another stock movement.')
        return Response(MovementSerializer(existing).data)
    if not quantity or len(reason) < 3 or len(reason) > 500:
        raise ValidationError('Enter a nonzero stock change and a reason (3–500 characters).')
    svc.stock(obj, quantity, request.user, reason, key=key)
    svc.audit(request.user, 'STOCK_ADJUSTED', f'{obj.name}: {quantity:+f}, {reason}')
    return Response(ProductSerializer(obj, context={'request': request}).data)


@api_view(['GET'])
def stock_history(request):
    qs = StockMovement.objects.select_related('product', 'created_by').order_by('-id')
    if request.query_params.get('product'):
        qs = qs.filter(product_id=svc.integer(request.query_params['product']))
    return Response(MovementSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
def customers(request):
    if request.method == 'POST':
        if request.data.get('credit_limit') is not None and request.user.profile.role != 'OWNER':
            raise PermissionDenied('Only the owner can set credit limits.')
        require(request.user, 'customers.write')
        with transaction.atomic():
            svc.lock_shop()
            serializer = CustomerSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            opening = svc.money(request.data.get('opening_balance', 0))
            if opening < 0:
                raise ValidationError('Opening receivable cannot be negative.')
            if opening:
                require(request.user, 'ledger.adjust')
                svc.entry(obj, opening, 'OPENING', request.user, 'Opening balance')
            svc.audit(request.user, 'CUSTOMER_CREATED', obj.name)
        return Response(CustomerSerializer(obj).data, status=201)
    qs = Customer.objects.filter(active=True).order_by('name')
    search = request.query_params.get('search', '')
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(phone__icontains=search))
    return Response(CustomerSerializer(qs, many=True).data)


@api_view(['GET', 'PATCH', 'DELETE'])
def customer_detail(request, pk):
    obj = get_object_or_404(Customer, pk=pk)
    if request.method == 'GET':
        running = svc.ZERO
        ledger = []
        for row in obj.ledger.select_related('invoice', 'payment', 'created_by'):
            running += row.amount
            ledger.append({**LedgerSerializer(row).data, 'balance': str(running)})
        return Response({'customer': CustomerSerializer(obj).data, 'ledger': ledger,
            'invoices': InvoiceSerializer(obj.invoices.select_related('created_by').prefetch_related('items').order_by('-id'), many=True).data,
            'payments': PaymentSerializer(obj.payments.select_related('customer', 'created_by').order_by('-transaction_date'), many=True).data})
    require(request.user, 'customers.write')
    if 'credit_limit' in request.data and request.user.profile.role != 'OWNER':
        raise PermissionDenied('Only the owner can change credit limits.')
    with transaction.atomic():
        svc.lock_shop()
        if request.method == 'DELETE':
            if svc.balance(obj) != 0:
                raise ValidationError('Settle this customer balance before archiving.')
            obj.active = False
            obj.save(update_fields=['active'])
            svc.audit(request.user, 'CUSTOMER_ARCHIVED', obj.name)
            return Response(status=204)
        serializer = CustomerSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        svc.audit(request.user, 'CUSTOMER_UPDATED', obj.name)
    return Response(serializer.data)


@api_view(['POST'])
def payment(request, pk):
    obj = get_object_or_404(Customer, pk=pk, active=True)
    receipt = svc.receive_payment(request.user, obj, request.data)
    return Response(PaymentSerializer(receipt).data, status=201)


@api_view(['POST'])
@transaction.atomic
def ledger_adjust(request, pk):
    require(request.user, 'ledger.adjust')
    svc.lock_shop()
    obj = get_object_or_404(Customer, pk=pk, active=True)
    key = svc.request_key(request.data)
    amount = svc.money(request.data.get('amount'))
    note = str(request.data.get('note', '')).strip()
    existing = LedgerEntry.objects.filter(request_key=key).first()
    if existing:
        if existing.customer_id != pk or existing.amount != amount or existing.description != note or existing.created_by_id != request.user.id:
            raise ValidationError('Request key already used for another adjustment.')
        return Response({'ok': True})
    if not amount or len(note) < 3 or len(note) > 500 or svc.balance(obj) + amount < 0:
        raise ValidationError('Enter a nonzero adjustment and a reason. Balance cannot become negative.')
    # General adjustments retain their own account balance; invoice write-offs use credit allocation.
    if amount < 0:
        unallocated = obj.ledger.filter(invoice__isnull=True).aggregate(total=Sum('amount'))['total'] or svc.ZERO
        if -amount > unallocated:
            raise ValidationError('A negative adjustment can only reduce opening/general balances. Use invoice voiding to reverse a sale.')
    svc.entry(obj, amount, 'ADJUSTMENT', request.user, note, key=key)
    svc.audit(request.user, 'LEDGER_ADJUSTED', f'{obj.name}: {amount}, {note}')
    return Response({'ok': True})


@api_view(['GET', 'POST'])
def invoices(request):
    if request.method == 'POST':
        return Response(InvoiceSerializer(svc.create_invoice(request.user, request.data)).data, status=201)
    qs = Invoice.objects.select_related('created_by').prefetch_related('items').order_by('-id')
    search = request.query_params.get('search', '')
    if search:
        qs = qs.filter(Q(number__icontains=search) | Q(customer__name__icontains=search))
    return Response(InvoiceSerializer(qs, many=True).data)


@api_view(['GET'])
def invoice_detail(request, pk):
    return Response(InvoiceSerializer(get_object_or_404(Invoice, pk=pk)).data)


@api_view(['POST'])
def invoice_void(request, pk):
    get_object_or_404(Invoice, pk=pk)
    return Response(InvoiceSerializer(svc.void_invoice(request.user, pk, request.data)).data)


@api_view(['GET', 'POST'])
def staff(request):
    require(request.user, 'staff.manage')
    if request.method == 'POST':
        with transaction.atomic():
            role = request.data.get('role', 'CASHIER')
            if role not in ['MANAGER', 'CASHIER']:
                raise ValidationError('Choose Manager or Cashier.')
            user = User(username=request.data.get('username', ''), first_name=request.data.get('name', ''))
            user.full_clean(exclude=['password'])
            password = request.data.get('password', '')
            validate_password(password, user)
            user.set_password(password)
            user.save()
            Staff.objects.create(user=user, role=role, permissions=DEFAULTS[role])
            svc.audit(request.user, 'STAFF_CREATED', user.username)
    return Response({'staff': [{**user_data(p.user), 'active': p.user.is_active} for p in Staff.objects.select_related('user').order_by('id')],
                     'available_permissions': [p for p in ALL if p not in ['staff.manage', 'settings.manage']], 'defaults': DEFAULTS})


@api_view(['PATCH'])
@transaction.atomic
def staff_detail(request, pk):
    require(request.user, 'staff.manage')
    person = get_object_or_404(Staff, user_id=pk)
    if person.role == 'OWNER':
        raise ValidationError('The owner cannot be removed or demoted here.')
    if 'role' in request.data:
        if request.data['role'] not in ['MANAGER', 'CASHIER']:
            raise ValidationError('Choose Manager or Cashier.')
        person.role = request.data['role']
        person.permissions = DEFAULTS[person.role]
    if 'permissions' in request.data:
        values = request.data['permissions']
        if not isinstance(values, list) or any(v not in ALL or v in ['staff.manage', 'settings.manage'] for v in values):
            raise ValidationError('Invalid staff permission selection.')
        person.permissions = list(dict.fromkeys(values))
    if 'active' in request.data:
        if not isinstance(request.data['active'], bool):
            raise ValidationError('Active must be true or false.')
        person.user.is_active = request.data['active']
    if request.data.get('password'):
        validate_password(request.data['password'], person.user)
        person.user.set_password(request.data['password'])
    person.save()
    person.user.save()
    svc.audit(request.user, 'STAFF_UPDATED', person.user.username)
    return Response({**user_data(person.user), 'active': person.user.is_active})


@api_view(['GET'])
def activity(request):
    require(request.user, 'staff.manage')
    qs = Activity.objects.select_related('actor').order_by('-id')
    if request.query_params.get('staff'):
        qs = qs.filter(actor_id=svc.integer(request.query_params['staff']))
    return Response(ActivitySerializer(qs, many=True).data)
