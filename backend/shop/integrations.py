"""Server-only provider adapters. Network effects never run while holding a DB lock."""
import base64
import hashlib
import hmac
import json
import re
import uuid
from datetime import timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Invoice, Customer, PaymentLink, GatewayReceipt, Payment, Reminder, Shop
from .permissions import require
from . import services as svc


def config(name):
    return getattr(settings, name, '')

def ready(provider):
    fields = {'razorpay': ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'],
              'whatsapp': ['WHATSAPP_TOKEN','WHATSAPP_PHONE_ID','WHATSAPP_APP_SECRET','WHATSAPP_VERIFY_TOKEN',
                           'WHATSAPP_TEMPLATE','WHATSAPP_GRAPH_VERSION']}
    return bool(config(provider.upper() + '_ENABLED') and all(config(k) for k in fields[provider]))

def require_ready(provider):
    if not ready(provider):
        raise ValidationError(f'{provider.title()} is not configured and enabled on the server.')

class ProviderFailure(Exception):
    def __init__(self, uncertain=False):
        self.uncertain = uncertain

def post_json(url, payload, authorization):
    req = Request(url, data=json.dumps(payload).encode(), headers={
        'Authorization': authorization, 'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(req, timeout=15) as response:
            return json.loads(response.read(1024*1024))
    except HTTPError as exc:
        # Never surface provider responses that may contain tokens or customer details.
        raise ProviderFailure(uncertain=exc.code >= 500) from exc
    except (URLError, TimeoutError, ValueError, OSError) as exc:
        raise ProviderFailure(uncertain=True) from exc

def link_data(link):
    return {'id': link.id, 'invoice': link.invoice_id, 'amount': str(link.amount), 'status': link.status,
            'url': link.url, 'detail': link.detail, 'created_at': link.created_at}

@api_view(['GET'])
def status(request):
    require(request.user, 'settings.manage')
    return Response({'razorpay_ready': ready('razorpay'), 'whatsapp_ready': ready('whatsapp'),
        'razorpay_mode': 'test' if config('RAZORPAY_KEY_ID').startswith('rzp_test_') else 'live' if ready('razorpay') else 'disabled',
        'whatsapp_template': config('WHATSAPP_TEMPLATE'), 'reminder_interval_hours': settings.REMINDER_INTERVAL_HOURS,
        'automatic_reminders': settings.AUTOMATIC_REMINDERS})

@api_view(['GET','POST'])
def payment_links(request, pk):
    require(request.user, 'ledger.payment')
    inv = get_object_or_404(Invoice, pk=pk)
    if request.method == 'GET':
        return Response([link_data(x) for x in inv.online_links.order_by('-id')])
    require_ready('razorpay')
    key = svc.request_key(request.data)
    with transaction.atomic():
        svc.lock_shop()
        existing = PaymentLink.objects.filter(request_key=key).first()
        if existing:
            if existing.invoice_id != pk or existing.created_by_id != request.user.id:
                raise ValidationError('Request key belongs to another payment link.')
            return Response(link_data(existing))
        inv.refresh_from_db()
        due = svc.invoice_due(inv)
        if inv.status != 'ACTIVE' or not inv.customer_id or due <= 0:
            raise ValidationError('Payment links require an active customer invoice with an outstanding amount.')
        pending = inv.online_links.filter(status__in=['CREATING','CREATED','UNKNOWN']).first()
        if pending:
            return Response(link_data(pending))
        link = PaymentLink.objects.create(request_key=key, invoice=inv, amount=due, created_by=request.user)
    auth = base64.b64encode((config('RAZORPAY_KEY_ID')+':'+config('RAZORPAY_KEY_SECRET')).encode()).decode()
    payload = {'amount': int(link.amount*100), 'currency': 'INR', 'accept_partial': False,
        'reference_id': str(key), 'description': f'Invoice {inv.number}',
        'notify': {'sms': False, 'email': False}, 'reminder_enable': False,
        'expire_by': int((timezone.now()+timedelta(days=1)).timestamp())}
    try:
        result = post_json('https://api.razorpay.com/v1/payment_links/', payload, 'Basic '+auth)
        if not isinstance(result, dict):
            raise ProviderFailure(uncertain=True)
        url = result.get('short_url','')
        if not isinstance(url, str):
            raise ProviderFailure(uncertain=True)
        host = urlparse(url)
        if not result.get('id') or host.scheme != 'https' or host.hostname not in ['rzp.io','rzp.in']:
            raise ProviderFailure(uncertain=True)
        PaymentLink.objects.filter(pk=link.pk, status='CREATING').update(provider_id=result['id'], url=url, status='CREATED')
    except ProviderFailure as exc:
        PaymentLink.objects.filter(pk=link.pk, status='CREATING').update(status='UNKNOWN' if exc.uncertain else 'FAILED',
            detail='Check the provider dashboard before retrying.' if exc.uncertain else 'Provider rejected link creation. Check configuration.')
    link.refresh_from_db()
    svc.audit(request.user, 'PAYMENT_LINK', f'{inv.number}: {link.status}')
    return Response(link_data(link), status=201)

def verify(body, signature, secret):
    return bool(secret and signature and hmac.compare_digest(hmac.new(secret.encode(), body, hashlib.sha256).hexdigest(), signature))

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    body = request.body
    if not verify(body, request.headers.get('X-Razorpay-Signature',''), config('RAZORPAY_WEBHOOK_SECRET')):
        raise PermissionDenied('Invalid webhook signature.')
    try:
        event = json.loads(body)
        payload = event.get('payload', {})
        entity = payload.get('payment_link', {}).get('entity', {})
        ref = uuid.UUID(str(entity.get('reference_id')))
    except (ValueError, AttributeError, TypeError):
        return Response({'ignored': True})
    with transaction.atomic():
        svc.lock_shop()
        link = PaymentLink.objects.filter(request_key=ref).select_related('invoice','created_by').first()
        if not link:
            return Response({'ignored': True})
        if not entity.get('id') or (link.provider_id and entity['id'] != link.provider_id):
            raise ValidationError('Payment link identity mismatch.')
        kind = event.get('event')
        if kind in ['payment_link.expired','payment_link.cancelled']:
            if link.status != 'PAID':
                link.status = 'EXPIRED' if kind.endswith('expired') else 'CANCELLED'
                link.save(update_fields=['status'])
            return Response({'ok': True})
        if kind != 'payment_link.paid':
            return Response({'ignored': True})
        payment = payload.get('payment', {}).get('entity', {})
        pid = payment.get('id')
        if not isinstance(pid, str) or not pid.startswith('pay_'):
            raise ValidationError('Missing payment identity.')
        previous = GatewayReceipt.objects.filter(provider_payment_id=pid).first()
        if previous:
            if previous.link_id != link.id:
                raise ValidationError('Payment already belongs to another link.')
            return Response({'ok': True, 'status': previous.status})
        if (payment.get('status') != 'captured' or payment.get('currency') != 'INR' or
            payment.get('amount') != int(link.amount*100) or entity.get('amount') != int(link.amount*100) or
            entity.get('amount_paid') != int(link.amount*100) or entity.get('status') != 'paid'):
            raise ValidationError('Payment amount, currency or captured status does not match.')
        receipt = GatewayReceipt.objects.create(provider_payment_id=pid, link=link, amount=link.amount)
        inv = link.invoice
        if inv.status != 'ACTIVE' or svc.invoice_due(inv) < link.amount or svc.balance(inv.customer) < link.amount:
            receipt.detail = 'Invoice was changed, voided or collected separately. Reconcile this captured payment in Razorpay.'
        else:
            recorded = Payment.objects.create(customer=inv.customer, amount=link.amount, method='ONLINE',
                created_by=link.created_by, note=f'Razorpay {pid} / {inv.number}')
            # Leave Payment.invoice empty: reports distinguish initial billing from later collections.
            svc.entry(inv.customer, -link.amount, 'PAYMENT', link.created_by, recorded.note, inv, recorded)
            receipt.payment, receipt.status = recorded, 'APPLIED'
        receipt.save()
        link.status, link.provider_id = 'PAID', entity['id']
        link.save(update_fields=['status','provider_id'])
        svc.audit(link.created_by, 'RAZORPAY_CAPTURED', f'{pid}: {receipt.status}')
    return Response({'ok': True, 'status': receipt.status})

@api_view(['GET'])
def gateway_receipts(request):
    require(request.user, 'reports.view')
    return Response(list(GatewayReceipt.objects.select_related('link__invoice').order_by('-id').values(
        'id','provider_payment_id','amount','status','detail','created_at','link__invoice__number')))

def reminder_data(row):
    return {'id': row.id, 'amount': str(row.amount), 'status': row.status, 'detail': row.detail,
            'created_at': row.created_at, 'template': row.template}

def enqueue_reminder(user, customer, key):
    require_ready('whatsapp')
    with transaction.atomic():
        svc.lock_shop()
        old = Reminder.objects.filter(request_key=key).first()
        if old:
            if old.customer_id != customer.id or old.created_by_id != user.id:
                raise ValidationError('Request key belongs to another reminder.')
            return old
        customer.refresh_from_db()
        if not customer.active or not customer.whatsapp_consent:
            raise ValidationError('Record customer consent before sending WhatsApp reminders.')
        amount = svc.balance(customer)
        if amount <= 0:
            raise ValidationError('This customer has no outstanding amount.')
        phone = re.sub(r'\D', '', customer.phone)
        if len(phone) == 10:
            phone = '91'+phone
        if not re.fullmatch(r'[1-9][0-9]{7,14}', phone):
            raise ValidationError('Use a mobile number with its country code.')
        since = timezone.now()-timedelta(hours=settings.REMINDER_INTERVAL_HOURS)
        if customer.reminders.filter(created_at__gte=since).exclude(status__in=['FAILED','CANCELLED']).exists():
            raise ValidationError('A reminder was already queued or sent within the configured interval.')
        row = Reminder.objects.create(request_key=key, customer=customer, amount=amount, phone=phone,
            template=config('WHATSAPP_TEMPLATE'), created_by=user)
        svc.audit(user, 'REMINDER_QUEUED', f'Customer {customer.id}, reminder {row.id}')
        return row

def deliver_reminder(pk):
    require_ready('whatsapp')
    with transaction.atomic():
        svc.lock_shop()
        row = Reminder.objects.select_related('customer','created_by').get(pk=pk)
        if row.status != 'QUEUED':
            return row
        c = row.customer
        phone = re.sub(r'\D', '', c.phone)
        if len(phone) == 10:
            phone = '91'+phone
        if not c.active or not c.whatsapp_consent or phone != row.phone or svc.balance(c) <= 0:
            row.status, row.detail = 'CANCELLED', 'Consent, phone or outstanding balance changed.'
            row.save()
            return row
        row.amount = svc.balance(c)
        row.status = 'SENDING'
        row.save()
        values = [c.name, Shop.objects.get(pk=1).name, str(row.amount)]
    payload = {'messaging_product': 'whatsapp', 'to': row.phone, 'type': 'template',
        'template': {'name': row.template, 'language': {'code': settings.WHATSAPP_LANGUAGE},
            'components': [{'type': 'body', 'parameters': [{'type':'text','text':v} for v in values]}]}}
    try:
        result = post_json(f'https://graph.facebook.com/{settings.WHATSAPP_GRAPH_VERSION}/{settings.WHATSAPP_PHONE_ID}/messages',
            payload, 'Bearer '+settings.WHATSAPP_TOKEN)
        messages = result.get('messages') if isinstance(result, dict) else None
        provider_id = messages[0].get('id') if isinstance(messages, list) and messages and isinstance(messages[0], dict) else None
        if not isinstance(provider_id, str) or not provider_id:
            raise ProviderFailure(uncertain=True)
        row.provider_id, row.status = provider_id, 'SENT'
    except ProviderFailure as exc:
        row.status = 'UNKNOWN' if exc.uncertain else 'FAILED'
        row.detail = 'Provider response uncertain; check Meta before retrying.' if exc.uncertain else 'Provider rejected the message; check the template and configuration.'
    row.save()
    return row

@api_view(['GET','POST'])
def reminders(request, pk):
    require(request.user, 'reminders.send')
    c = get_object_or_404(Customer, pk=pk)
    if request.method == 'GET':
        return Response([reminder_data(r) for r in c.reminders.order_by('-id')])
    row = enqueue_reminder(request.user, c, svc.request_key(request.data))
    return Response(reminder_data(deliver_reminder(row.pk)), status=201)

@api_view(['GET','POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_webhook(request):
    if request.method == 'GET':
        token = request.query_params.get('hub.verify_token','')
        if config('WHATSAPP_VERIFY_TOKEN') and hmac.compare_digest(token, settings.WHATSAPP_VERIFY_TOKEN) and request.query_params.get('hub.mode') == 'subscribe':
            return HttpResponse(request.query_params.get('hub.challenge',''), content_type='text/plain')
        raise PermissionDenied('Invalid verification token.')
    body = request.body
    signature = request.headers.get('X-Hub-Signature-256','').removeprefix('sha256=')
    if not verify(body, signature, config('WHATSAPP_APP_SECRET')):
        raise PermissionDenied('Invalid webhook signature.')
    try:
        event = json.loads(body)
        updates = [s for entry in event.get('entry',[]) for change in entry.get('changes',[])
                   for s in change.get('value',{}).get('statuses',[])]
    except (ValueError, AttributeError, TypeError):
        raise ValidationError('Invalid webhook body.')
    order = {'SENT':1,'DELIVERED':2,'READ':3,'FAILED':0}
    with transaction.atomic():
        svc.lock_shop()
        for update in updates:
            if not isinstance(update, dict):
                continue
            row = Reminder.objects.filter(provider_id=update.get('id','')).exclude(provider_id='').first()
            state = str(update.get('status','')).upper()
            if row and state in order and (order[state] > order.get(row.status,0) or state == 'FAILED' and row.status == 'SENT'):
                row.status = state
                row.detail = 'Provider reported delivery failure.' if state == 'FAILED' else ''
                row.save()
    return Response({'ok':True})
