import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Shop, Staff, Customer, Product, Invoice, CreditNote, PaymentLink, GatewayReceipt, Reminder, Payment
from .permissions import ALL
from . import services as svc
from .integrations import enqueue_reminder, deliver_reminder, ProviderFailure


CONFIG = dict(RAZORPAY_ENABLED=True, RAZORPAY_KEY_ID='rzp_test_unit', RAZORPAY_KEY_SECRET='test-key',
    RAZORPAY_WEBHOOK_SECRET='test-webhook', WHATSAPP_ENABLED=True, WHATSAPP_TOKEN='test-token',
    WHATSAPP_PHONE_ID='123', WHATSAPP_APP_SECRET='test-app', WHATSAPP_VERIFY_TOKEN='test-verify',
    WHATSAPP_TEMPLATE='payment_reminder', WHATSAPP_GRAPH_VERSION='v25.0')

@override_settings(**CONFIG)
class TaxAndIntegrationTests(TestCase):
    def setUp(self):
        self.shop=Shop.objects.create(name='Tax Shop',address='Test address',gstin='27ABCDE1234F1Z5',
            state_code='27',gst_mode='DOMESTIC',payment_methods=['CASH','UPI','CARD','CREDIT'])
        self.owner=get_user_model().objects.create_user('owner')
        Staff.objects.create(user=self.owner,role='OWNER',permissions=ALL)
        self.customer=Customer.objects.create(name='Test Customer',phone='9000000001',state_code='27',
            whatsapp_consent=True,whatsapp_consent_note='Synthetic test consent')
        self.product=Product.objects.create(name='Tea',sku='TEA',price=100,gst_percent=18,hsn_code='0902',stock_quantity=20)
        self.client=APIClient()
        self.client.force_authenticate(self.owner)

    def bill(self, **extra):
        return svc.create_invoice(self.owner,{'request_key':str(uuid.uuid4()),
            'items':[{'product_id':self.product.id,'quantity':1}], 'customer_id':self.customer.id,
            'payment_method':'CREDIT',**extra})

    def webhook(self, route, payload, secret='test-webhook', header='HTTP_X_RAZORPAY_SIGNATURE'):
        raw=json.dumps(payload).encode()
        signature=hmac.new(secret.encode(),raw,hashlib.sha256).hexdigest()
        if header=='HTTP_X_HUB_SIGNATURE_256':
            signature='sha256='+signature
        client=APIClient()
        return client.post(route,raw,content_type='application/json',**{header:signature})

    def link(self, inv):
        return PaymentLink.objects.create(request_key=uuid.uuid4(),invoice=inv,amount=inv.grand_total,
            provider_id='plink_test',created_by=self.owner,status='CREATED')

    def captured(self, link):
        return {'event':'payment_link.paid','payload':{'payment_link':{'entity':{
            'id':link.provider_id,'reference_id':str(link.request_key),'amount':int(link.amount*100),
            'amount_paid':int(link.amount*100),'status':'paid'}},'payment':{'entity':{
            'id':'pay_test','amount':int(link.amount*100),'currency':'INR','status':'captured'}}}}

    def test_intra_inter_and_union_territory_tax(self):
        inv=self.bill()
        self.assertEqual((inv.cgst,inv.sgst,inv.igst),(Decimal(9),Decimal(9),Decimal(0)))
        inv=self.bill(place_of_supply='29')
        self.assertEqual((inv.cgst,inv.igst),(Decimal(0),Decimal(18)))
        self.shop.state_code='04'
        self.shop.gstin='04ABCDE1234F1Z5'
        self.shop.save(update_fields=['state_code','gstin'])
        inv=self.bill(place_of_supply='04')
        self.assertEqual((inv.cgst,inv.utgst,inv.sgst),(Decimal(9),Decimal(9),Decimal(0)))

    def test_inclusive_price_discount_and_snapshot(self):
        self.product.price=118
        self.product.price_includes_tax=True
        self.product.save()
        inv=self.bill(discount='10')
        self.assertEqual((inv.subtotal,inv.gst_amount,inv.grand_total),(Decimal(100),Decimal('16.20'),Decimal('106.20')))
        self.product.hsn_code='9999'
        self.product.save()
        self.assertEqual(inv.items.get().hsn_code,'0902')
        self.assertEqual(inv.items.get().taxable_value,Decimal(90))

    def test_missing_hsn_rejects_without_stock_movement(self):
        self.product.hsn_code=''
        self.product.save()
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.bill()
        self.assertEqual(Invoice.objects.count(),0)

    def test_state_and_consent_validation(self):
        response=self.client.patch('/api/shop/',{'state_code':'29'},format='json')
        self.assertEqual(response.status_code,400)
        response=self.client.patch(f'/api/customers/{self.customer.id}/',{'phone':'9000000002'},format='json')
        self.assertEqual(response.status_code,200)
        self.assertFalse(response.data['whatsapp_consent'])

    def test_credit_note_created_once_and_gst_register_reconciles(self):
        inv=self.bill()
        for _ in range(2):
            svc.void_invoice(self.owner,inv.id,{'reason':'Full return'})
        self.assertEqual(CreditNote.objects.count(),1)
        data=self.client.get('/api/reports/').data['gst_register']
        self.assertEqual(len(data),2)
        self.assertEqual(sum(Decimal(r['gst_amount']) for r in data),0)
        for suffix in ['pdf/?layout=thermal','credit-note/']:
            response=self.client.get(f'/api/invoices/{inv.id}/{suffix}')
            self.assertEqual(response.status_code,200,(suffix, response.content[:200]))
            self.assertTrue(response.content.startswith(b'%PDF'))

    @patch('shop.integrations.post_json')
    def test_create_link_is_idempotent_and_does_not_notify(self, call):
        inv=self.bill()
        call.return_value={'id':'plink_test','short_url':'https://rzp.io/test'}
        key=str(uuid.uuid4())
        for _ in range(2):
            response=self.client.post(f'/api/invoices/{inv.id}/payment-links/',{'request_key':key},format='json')
            self.assertIn(response.status_code,[200,201])
        self.assertEqual(call.call_count,1)
        self.assertEqual(call.call_args.args[1]['notify'],{'sms':False,'email':False})

    @patch('shop.integrations.post_json',side_effect=ProviderFailure(uncertain=True))
    def test_ambiguous_link_request_is_not_automatically_retried(self, call):
        inv=self.bill()
        for _ in range(2):
            response=self.client.post(f'/api/invoices/{inv.id}/payment-links/',{'request_key':str(uuid.uuid4())},format='json')
            self.assertEqual(response.data['status'],'UNKNOWN')
        self.assertEqual(call.call_count,1)

    def test_forged_webhook_cannot_change_ledger(self):
        inv=self.bill()
        link=self.link(inv)
        response=self.webhook('/api/webhooks/razorpay/',self.captured(link),secret='wrong')
        self.assertEqual(response.status_code,403)
        self.assertEqual(svc.balance(self.customer),Decimal(118))

    def test_verified_payment_applied_exactly_once(self):
        inv=self.bill()
        link=self.link(inv)
        for _ in range(2):
            response=self.webhook('/api/webhooks/razorpay/',self.captured(link))
            self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(svc.balance(self.customer),0)
        self.assertEqual(Payment.objects.count(),1)
        self.assertEqual(GatewayReceipt.objects.get().status,'APPLIED')
        methods=self.client.get('/api/reports/').data['methods']
        self.assertEqual(next(x['receipts'] for x in methods if x['method']=='ONLINE'),'118')

    def test_mismatched_amount_rejected(self):
        inv=self.bill()
        payload=self.captured(self.link(inv))
        payload['payload']['payment']['entity']['amount']=1
        self.assertEqual(self.webhook('/api/webhooks/razorpay/',payload).status_code,400)
        self.assertFalse(GatewayReceipt.objects.exists())

    def test_late_payment_after_void_enters_review(self):
        inv=self.bill()
        link=self.link(inv)
        svc.void_invoice(self.owner,inv.id,{'reason':'Returned goods'})
        response=self.webhook('/api/webhooks/razorpay/',self.captured(link))
        self.assertEqual(response.data['status'],'REVIEW')
        self.assertEqual(svc.balance(self.customer),0)
        self.assertFalse(Payment.objects.exists())

    @patch('shop.integrations.post_json')
    def test_consent_and_repeat_reminder_controls(self, call):
        self.bill()
        call.return_value={'messages':[{'id':'wamid.test'}]}
        key=uuid.uuid4()
        row=enqueue_reminder(self.owner,self.customer,key)
        row=deliver_reminder(row.id)
        self.assertEqual(row.status,'SENT')
        deliver_reminder(row.id)
        self.assertEqual(call.call_count,1)
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            enqueue_reminder(self.owner,self.customer,uuid.uuid4())

    @patch('shop.integrations.post_json')
    def test_optout_after_queue_cancels_send(self, call):
        self.bill()
        row=enqueue_reminder(self.owner,self.customer,uuid.uuid4())
        Customer.objects.filter(pk=self.customer.id).update(whatsapp_consent=False)
        self.assertEqual(deliver_reminder(row.id).status,'CANCELLED')
        call.assert_not_called()

    def test_whatsapp_status_does_not_regress(self):
        row=Reminder.objects.create(request_key=uuid.uuid4(),customer=self.customer,amount=10,
            phone='919000000001',template='test',provider_id='wamid.test',status='SENT',created_by=self.owner)
        for state in ['read','delivered','sent']:
            payload={'entry':[{'changes':[{'value':{'statuses':[{'id':'wamid.test','status':state}]}}]}]}
            response=self.webhook('/api/webhooks/whatsapp/',payload,secret='test-app',header='HTTP_X_HUB_SIGNATURE_256')
            self.assertEqual(response.status_code,200)
        row.refresh_from_db()
        self.assertEqual(row.status,'READ')

    def test_unconfigured_provider_fails_closed(self):
        inv=self.bill()
        with override_settings(RAZORPAY_ENABLED=False):
            response=self.client.post(f'/api/invoices/{inv.id}/payment-links/',{'request_key':str(uuid.uuid4())},format='json')
        self.assertEqual(response.status_code,400)
        self.assertFalse(PaymentLink.objects.exists())

    @patch('shop.integrations.post_json')
    def test_malformed_message_response_is_uncertain_without_retry(self, call):
        self.bill()
        call.return_value = {'messages': []}
        row = enqueue_reminder(self.owner, self.customer, uuid.uuid4())
        self.assertEqual(deliver_reminder(row.id).status, 'UNKNOWN')
        deliver_reminder(row.id)
        self.assertEqual(call.call_count, 1)

    @patch('shop.integrations.post_json')
    def test_malformed_link_response_is_uncertain(self, call):
        inv = self.bill()
        call.return_value = []
        response = self.client.post(f'/api/invoices/{inv.id}/payment-links/',
            {'request_key': str(uuid.uuid4())}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'UNKNOWN')
