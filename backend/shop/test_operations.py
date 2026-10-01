import io
import uuid
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase,override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from .models import (Shop,Staff,Product,Customer,Invoice,Payment,StockMovement,Supplier,
    Purchase,SaleReturn,Expense,StockLot,SerialUnit)
from .permissions import ALL,DEFAULTS
from .services import balance


class OperationsTests(TestCase):
    def setUp(self):
        self.shop=Shop.objects.create(name='QA',payment_methods=['CASH','UPI','CARD','CREDIT'])
        self.owner=get_user_model().objects.create_user('owner',password='Start!Password892',email='owner@example.com')
        Staff.objects.create(user=self.owner,role='OWNER',permissions=ALL)
        self.cashier=get_user_model().objects.create_user('cashier',password='Start!Password893')
        Staff.objects.create(user=self.cashier,role='CASHIER',permissions=DEFAULTS['CASHIER'])
        self.client=APIClient();self.client.force_authenticate(self.owner)
        self.product=Product.objects.create(name='Tea',sku='TEA',price=100,purchase_price=60,stock_quantity=10)
        self.customer=Customer.objects.create(name='Customer',phone='9000000001')
        self.supplier=Supplier.objects.create(name='Wholesaler')

    def post(self,path,data):
        return self.client.post(path,{'request_key':str(uuid.uuid4()),**data},format='json')

    def bill(self,**kw):
        return self.post('/api/invoices/',{'items':[{'product_id':self.product.id,'quantity':3}],
            'customer_id':self.customer.id,'payment_method':'CREDIT',**kw})

    def test_purchase_supplier_ledger_cost_and_idempotency(self):
        data={'request_key':str(uuid.uuid4()),'supplier_id':self.supplier.id,'reference':'BILL1',
            'items':[{'product_id':self.product.id,'quantity':10,'unit_cost':'80','tax':'40'}],
            'paid_amount':200,'payment_method':'CASH'}
        for _ in range(2):
            r=self.post('/api/purchases/',data);self.assertIn(r.status_code,[200,201],r.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity,20)
        self.assertEqual(self.product.purchase_price,70)
        self.assertEqual(sum(x.amount for x in self.supplier.ledger.all()),640)
        r=self.post(f'/api/suppliers/{self.supplier.id}/payments/',{'amount':140,'payment_method':'UPI','note':'Paid balance'})
        self.assertEqual(r.status_code,201,r.data)
        self.assertEqual(sum(x.amount for x in self.supplier.ledger.all()),500)
        data['request_key']=str(uuid.uuid4())
        self.assertEqual(self.post('/api/purchases/',data).status_code,400)
        self.assertEqual(Purchase.objects.count(),1)

    def test_purchase_invalid_line_rolls_back_all_stock(self):
        r=self.post('/api/purchases/',{'supplier_id':self.supplier.id,'reference':'BAD','items':[
            {'product_id':self.product.id,'quantity':2,'unit_cost':20},
            {'product_id':99999,'quantity':2,'unit_cost':20}]})
        self.assertEqual(r.status_code,404)
        self.product.refresh_from_db();self.assertEqual(self.product.stock_quantity,10)
        self.assertFalse(Purchase.objects.exists());self.assertFalse(StockMovement.objects.exists())

    def test_mixed_payment_and_credit_remainder(self):
        r=self.bill(payments=[{'method':'CASH','amount':'100'},{'method':'UPI','amount':'50'}])
        self.assertEqual(r.status_code,201,r.data)
        self.assertEqual(r.data['payment_method'],'MIXED')
        self.assertEqual(balance(self.customer),150)
        self.assertEqual(Payment.objects.count(),2)
        self.assertEqual(self.bill(payments=[{'method':'CASH','amount':400}]).status_code,400)
        self.assertEqual(self.bill(payments=[{'method':'CASH','amount':10},{'method':'CASH','amount':10}]).status_code,400)

    def test_credit_limit_owner_override_and_cashier_restriction(self):
        self.customer.credit_limit=50;self.customer.save()
        self.assertEqual(self.bill().status_code,400)
        self.client.force_authenticate(self.cashier)
        self.assertEqual(self.bill(credit_override_reason='Let me').status_code,400)
        self.assertEqual(self.client.patch(f'/api/customers/{self.customer.id}/',{'credit_limit':1000},format='json').status_code,403)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.bill(credit_override_reason='Approved regular customer').status_code,201)

    def test_partial_return_debt_then_refund_and_no_double_restock(self):
        inv=self.bill(paid_amount=150,payment_method='CASH').data
        data={'request_key':str(uuid.uuid4()),'reason':'Customer return','items':[{'item_id':inv['items'][0]['id'],'quantity':2}]}
        first=self.post(f"/api/invoices/{inv['id']}/returns/",data)
        self.assertEqual(first.status_code,201,first.data)
        self.assertEqual(Decimal(first.data['refund']),50)
        self.assertEqual(balance(self.customer),0)
        self.assertEqual(self.post(f"/api/invoices/{inv['id']}/returns/",data).data['id'],first.data['id'])
        self.product.refresh_from_db();self.assertEqual(self.product.stock_quantity,9)
        self.assertEqual(self.post(f"/api/invoices/{inv['id']}/void/",{'reason':'Cannot double return'}).status_code,400)
        data['request_key']=str(uuid.uuid4())
        self.assertEqual(self.post(f"/api/invoices/{inv['id']}/returns/",data).status_code,400)
        self.assertEqual(SaleReturn.objects.count(),1)
        self.assertEqual(self.client.get(f"/api/returns/{first.data['id']}/pdf/").status_code,200)
        self.assertEqual(self.client.get('/api/reports/').data['gst_register'][-1]['grand_total'],'-200.00')

    def test_return_rounding_restores_exact_total(self):
        self.product.price=Decimal('0.05');self.product.gst_percent=18;self.product.save()
        inv=self.bill().data
        total=Decimal(0)
        for _ in range(3):
            r=self.post(f"/api/invoices/{inv['id']}/returns/",{'reason':'One at a time','items':[{'item_id':inv['items'][0]['id'],'quantity':1}]})
            self.assertEqual(r.status_code,201,r.data);total+=Decimal(r.data['total'])
        self.assertEqual(total,Decimal(inv['grand_total']))
        self.assertEqual(balance(self.customer),0)

    def test_expenses_profit_and_void(self):
        self.bill(payment_method='CASH')
        e=self.post('/api/expenses/',{'category':'Power','description':'Shop power','amount':20,'payment_method':'CASH'})
        self.assertEqual(e.status_code,201,e.data)
        p=self.client.get('/api/profit/').data
        self.assertEqual(Decimal(p['gross_profit']),120)
        self.assertEqual(Decimal(p['net_profit']),100)
        self.assertEqual(self.post(f"/api/expenses/{e.data['id']}/void/",{'reason':'Duplicate receipt'}).status_code,200)
        self.assertEqual(Decimal(self.client.get('/api/profit/').data['net_profit']),120)

    def test_stock_count_rejects_stale_and_records_difference(self):
        self.assertEqual(self.post('/api/stock-counts/',{'product_id':self.product.id,'expected':9,'counted':8,'reason':'Counted today'}).status_code,400)
        r=self.post('/api/stock-counts/',{'product_id':self.product.id,'expected':10,'counted':8,'reason':'Counted today'})
        self.assertEqual(r.status_code,201,r.data)
        self.product.refresh_from_db();self.assertEqual(self.product.stock_quantity,8)
        self.assertEqual(StockMovement.objects.get().quantity,-2)

    def test_import_preview_commit_retry_and_rejection(self):
        content=b'name,sku,price,unit,opening_stock\nRice,RICE,50,KG,2.5\n'
        key=str(uuid.uuid4())
        def upload(commit,body=content):
            return self.client.post('/api/products/import/',{'file':SimpleUploadedFile('products.csv',body),'commit':str(commit).lower(),'request_key':key},format='multipart')
        self.assertEqual(upload(False).status_code,200)
        self.assertFalse(Product.objects.filter(sku='RICE').exists())
        self.assertEqual(upload(True).status_code,201)
        self.assertEqual(upload(True).status_code,200)
        self.assertEqual(Product.objects.get(sku='RICE').stock_quantity,Decimal('2.5'))
        self.assertEqual(upload(True,b'name,sku,price\nBad,BAD,-1\n').status_code,400)
        self.assertEqual(self.client.get(f'/api/products/labels/?ids={self.product.id}').status_code,200)

    def test_xlsx_import(self):
        from openpyxl import Workbook
        book=Workbook();book.active.append(['name','sku','price']);book.active.append(['Soap','SOAP',20]);stream=io.BytesIO();book.save(stream)
        r=self.client.post('/api/products/import/',{'file':SimpleUploadedFile('products.xlsx',stream.getvalue()),'commit':'false'},format='multipart')
        self.assertEqual(r.status_code,200,r.data)

    def test_batch_expiry_fefo_and_return(self):
        self.product.tracking='BATCH';self.product.stock_quantity=0;self.product.save()
        today=timezone.localdate()
        for batch,days in [('expired',-1),('later',10),('first',2)]:
            r=self.post(f'/api/products/{self.product.id}/tracking/',{'quantity':2,'batch':batch,'expiry':str(today+timedelta(days=days)),'reason':'Received stock'})
            self.assertEqual(r.status_code,201,r.data)
        inv=self.bill().data
        self.assertEqual(StockLot.objects.get(batch='first').available,0)
        self.assertEqual(StockLot.objects.get(batch='later').available,1)
        self.assertEqual(StockLot.objects.get(batch='expired').available,2)
        self.assertEqual(self.bill().status_code,400)
        r=self.post(f"/api/invoices/{inv['id']}/returns/",{'reason':'Return tea','items':[{'item_id':inv['items'][0]['id'],'quantity':1}]})
        self.assertEqual(r.status_code,201,r.data)
        self.assertEqual(StockLot.objects.get(batch='first').available,1)

    def test_serial_sale_warranty_return_and_reuse(self):
        self.product.tracking='SERIAL';self.product.stock_quantity=0;self.product.warranty_days=365;self.product.save()
        r=self.post(f'/api/products/{self.product.id}/tracking/',{'quantity':2,'serials':'A001\nA002','reason':'New devices'})
        self.assertEqual(r.status_code,201,r.data)
        inv=self.bill(items=[{'product_id':self.product.id,'quantity':1,'serials':'A001'}])
        self.assertEqual(inv.status_code,201,inv.data)
        serial=SerialUnit.objects.get(serial='A001')
        self.assertEqual(serial.status,'SOLD');self.assertIsNotNone(serial.warranty_until)
        self.assertEqual(self.bill(items=[{'product_id':self.product.id,'quantity':1,'serials':'A001'}]).status_code,400)
        r=self.post(f"/api/invoices/{inv.data['id']}/returns/",{'reason':'Unopened return','items':[{'item_id':inv.data['items'][0]['id'],'quantity':1,'serials':'A001'}]})
        self.assertEqual(r.status_code,201,r.data)
        serial.refresh_from_db();self.assertEqual(serial.status,'AVAILABLE')
        self.assertEqual(self.bill(items=[{'product_id':self.product.id,'quantity':1,'serials':'A001'}]).status_code,201)

    def test_cashier_cannot_access_operational_writes(self):
        self.client.force_authenticate(self.cashier)
        for path in ['/api/purchases/','/api/expenses/','/api/stock-counts/','/api/suppliers/','/api/products/import/']:
            self.assertEqual(self.post(path,{}).status_code,403,path)

    @override_settings(PASSWORD_RESET_ENABLED=True,EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_password_recovery_and_token_single_use(self):
        from django.core import mail
        self.client.force_authenticate(None)
        r=self.post('/api/forgot-password/',{'username':'owner','email':'owner@example.com'})
        self.assertEqual(r.status_code,200,r.data);self.assertEqual(len(mail.outbox),1)
        token=default_token_generator.make_token(self.owner)
        data={'uid':urlsafe_base64_encode(force_bytes(self.owner.pk)),'token':token,'new_password':'Replacement!Pass938'}
        self.assertEqual(self.post('/api/reset-password/',data).status_code,200)
        self.assertEqual(self.post('/api/reset-password/',data).status_code,400)
        self.owner.refresh_from_db();self.assertTrue(self.owner.check_password(data['new_password']))

    def test_password_change_checks_current_password(self):
        self.assertEqual(self.post('/api/account/password/',{'current_password':'bad','new_password':'Replacement!Pass938'}).status_code,400)
        self.assertEqual(self.post('/api/account/password/',{'current_password':'Start!Password892','new_password':'Replacement!Pass938'}).status_code,200)
