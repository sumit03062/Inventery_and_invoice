import uuid
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Shop, Staff, Product, StockMovement
from .permissions import ALL


class StockUnitTests(TestCase):
    def setUp(self):
        Shop.objects.create(name='Unit test', payment_methods=['CASH'])
        self.owner = get_user_model().objects.create_user('owner')
        Staff.objects.create(user=self.owner, role='OWNER', permissions=ALL)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def product(self, **kwargs):
        data = {'name':'Test product', 'sku':str(uuid.uuid4()), 'price':'100', **kwargs}
        return self.client.post('/api/products/', data, format='json')

    def test_boxes_opening_adjustment_and_retry(self):
        response = self.product(unit='PCS', pieces_per_box=12, stock_mode='BOX', boxes=4, opening_stock=999)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['stock_quantity'], 48)
        pk = response.data['id']
        data = {'request_key':str(uuid.uuid4()), 'stock_mode':'BOX', 'boxes':-1, 'reason':'Damaged box'}
        for _ in range(2):
            self.assertEqual(self.client.post(f'/api/products/{pk}/stock/', data, format='json').status_code, 200)
        self.assertEqual(Product.objects.get(pk=pk).stock_quantity, 36)
        self.assertEqual(StockMovement.objects.count(), 2)
        self.assertIn('12 pieces', StockMovement.objects.last().reason)

    def test_fractional_sale_void_and_low_stock(self):
        for unit in ['KG', 'LTR']:
            with self.subTest(unit=unit):
                response = self.product(unit=unit, opening_stock='2.750', low_stock_threshold='2.5')
                self.assertEqual(response.status_code, 201, response.data)
                pk = response.data['id']
                invoice = self.client.post('/api/invoices/', {'request_key':str(uuid.uuid4()),
                    'items':[{'product_id':pk, 'quantity':'0.375'}], 'payment_method':'CASH'}, format='json')
                self.assertEqual(invoice.status_code, 201, invoice.data)
                self.assertEqual(Decimal(invoice.data['grand_total']), Decimal('37.50'))
                self.assertEqual(Product.objects.get(pk=pk).stock_quantity, Decimal('2.375'))
                product = next(p for p in self.client.get('/api/products/').data if p['id']==pk)
                self.assertTrue(product['is_low_stock'])
                result = self.client.post(f"/api/invoices/{invoice.data['id']}/void/", {'reason':'QA return','refund_method':'CASH'}, format='json')
                self.assertEqual(result.status_code, 200, result.data)
                self.assertEqual(Product.objects.get(pk=pk).stock_quantity, Decimal('2.750'))

    def test_invalid_units_quantities_and_boxes_rollback(self):
        for data in [dict(unit='PCS', opening_stock='1.5'), dict(unit='KG', opening_stock='0.0001'),
                     dict(unit='KG', stock_mode='BOX', boxes=2), dict(pieces_per_box=0),
                     dict(stock_mode='BOX', boxes='1.5'), dict(unit='KG', opening_stock='NaN'),
                     dict(unit='PCS', low_stock_threshold='0.5')]:
            with self.subTest(data=data):
                self.assertEqual(self.product(**data).status_code, 400)
        self.assertFalse(Product.objects.exists())
        self.assertFalse(StockMovement.objects.exists())

    def test_unit_change_cannot_reinterpret_stock_history(self):
        p = self.product(unit='PCS', opening_stock=12).data
        response = self.client.patch(f"/api/products/{p['id']}/", {'unit':'KG'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.get(pk=p['id']).unit, 'PCS')

    def test_fractional_stock_out_cannot_go_negative(self):
        p = self.product(unit='LTR', opening_stock='0.25').data
        response = self.client.post(f"/api/products/{p['id']}/stock/", {
            'quantity':'-0.251', 'request_key':str(uuid.uuid4()), 'reason':'Spillage'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.get(pk=p['id']).stock_quantity, Decimal('0.25'))

    def test_fractional_piece_lines_cannot_be_combined_to_bypass_validation(self):
        p = self.product(unit='PCS', opening_stock=5).data
        response = self.client.post('/api/invoices/', {'request_key':str(uuid.uuid4()),
            'items':[{'product_id':p['id'], 'quantity':'0.5'}]*2, 'payment_method':'CASH'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.get(pk=p['id']).stock_quantity, 5)
