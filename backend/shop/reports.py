import csv
import io
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, F
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Invoice, InvoiceItem, Payment, Product, Customer, LedgerEntry
from .permissions import require
from .serializers import CustomerSerializer, InvoiceSerializer, PaymentSerializer
from .services import ZERO, money, balance


def dates(request):
    today = timezone.localdate()
    try:
        start = parse_date(request.query_params.get('from', today.isoformat()))
        end = parse_date(request.query_params.get('to', today.isoformat()))
    except ValueError:
        raise ValidationError('Use valid dates in YYYY-MM-DD format.')
    if not start or not end or start > end or (end - start).days > 366:
        raise ValidationError('Choose an ordered date range of at most 367 days.')
    return start, end


def totals(start, end):
    invoices = Invoice.objects.filter(status='ACTIVE', created_at__date__range=(start, end))
    payments = Payment.objects.filter(transaction_date__date__range=(start, end))
    sales = sum((i.grand_total for i in invoices), ZERO)
    collections = sum((p.amount if p.direction == 'RECEIPT' else -p.amount for p in payments), ZERO)
    initial_paid = Payment.objects.filter(invoice__in=invoices, direction='RECEIPT').aggregate(total=Sum('amount'))['total'] or ZERO
    return {'sales': str(sales), 'collections': str(collections),
            'udhar': str(sales - initial_paid), 'gst': str(sum((i.gst_amount for i in invoices), ZERO)),
            'discount': str(sum((i.discount for i in invoices), ZERO)), 'invoice_count': invoices.count()}


@api_view(['GET'])
def dashboard(request):
    require(request.user, 'reports.view')
    today = timezone.localdate()
    customers = CustomerSerializer(Customer.objects.filter(active=True), many=True).data
    stats = totals(today, today)
    stats.update({'outstanding': str(sum((Decimal(c['outstanding']) for c in customers), ZERO)),
                  'customer_count': len(customers), 'overdue_count': sum(c['overdue'] for c in customers),
                  'low_stock_count': Product.objects.filter(active=True, stock_quantity__lte=F('low_stock_threshold')).count()})
    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        trend.append({'date': day.isoformat(), **totals(day, day)})
    recent = Invoice.objects.select_related('created_by').prefetch_related('items').order_by('-id')[:6]
    return Response({'stats': stats, 'trend': trend, 'invoices': InvoiceSerializer(recent, many=True).data})


@api_view(['GET'])
def reports(request):
    require(request.user, 'reports.view')
    start, end = dates(request)
    invoices = Invoice.objects.filter(status='ACTIVE', created_at__date__range=(start, end))
    payments = Payment.objects.filter(transaction_date__date__range=(start, end))
    methods = []
    for method in ['CASH', 'UPI', 'CARD']:
        rows = payments.filter(method=method)
        receipts = rows.filter(direction='RECEIPT').aggregate(total=Sum('amount'))['total'] or ZERO
        refunds = rows.filter(direction='REFUND').aggregate(total=Sum('amount'))['total'] or ZERO
        methods.append({'method': method, 'receipts': str(receipts), 'refunds': str(refunds), 'net': str(receipts - refunds)})
    top = InvoiceItem.objects.filter(invoice__in=invoices).values('product_id', 'name').annotate(quantity=Sum('quantity'), total=Sum('total')).order_by('-quantity')[:20]
    staff = invoices.values('created_by__username').annotate(total=Sum('grand_total')).order_by('-total')
    customers = invoices.values('customer_snapshot__name').annotate(total=Sum('grand_total')).order_by('-total')[:30]
    outstanding = CustomerSerializer(Customer.objects.filter(active=True), many=True).data
    low = Product.objects.filter(active=True, stock_quantity__lte=F('low_stock_threshold')).values('name', 'sku', 'stock_quantity', 'low_stock_threshold')
    history = []
    day = start
    while day <= end:
        history.append({'date': day.isoformat(), **totals(day, day)})
        day += timedelta(days=1)
    return Response({'from': start, 'to': end, 'stats': totals(start, end), 'methods': methods,
        'top_products': list(top), 'staff': list(staff), 'customers': list(customers),
        'low_stock': list(low), 'outstanding': outstanding,
        'total_outstanding': str(sum((Decimal(c['outstanding']) for c in outstanding), ZERO)),
        'trend': history, 'payments': PaymentSerializer(payments.select_related('customer', 'created_by').order_by('-transaction_date'), many=True).data})


def safe_csv(value):
    value = str(value)
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value


@api_view(['GET'])
def export(request):
    require(request.user, 'reports.view')
    start, end = dates(request)
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(['Invoice', 'Date', 'Customer', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment type', 'Staff', 'Status'])
    for inv in Invoice.objects.filter(created_at__date__range=(start, end)).select_related('created_by').order_by('id'):
        writer.writerow([safe_csv(x) for x in [inv.number, timezone.localtime(inv.created_at).isoformat(),
            inv.customer_snapshot.get('name', ''), inv.subtotal, inv.discount, inv.gst_amount,
            inv.grand_total, inv.payment_method, inv.created_by.username, inv.status]])
    response = HttpResponse('\ufeff' + stream.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="sales-{start}-{end}.csv"'
    return response
