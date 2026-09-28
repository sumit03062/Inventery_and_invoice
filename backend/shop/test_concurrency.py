"""Run with TEST_DATABASE_PATH pointing to a disposable file for SQLite locking."""
import uuid
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from .models import Shop, Staff, Product, Invoice, StockMovement
from .permissions import ALL


class ConcurrentBillingTests(TransactionTestCase):
    def setUp(self):
        name = str(connections['default'].settings_dict['NAME'])
        if name == ':memory:' or 'mode=memory' in name:
            self.skipTest('Set TEST_DATABASE_PATH to run file-backed concurrency checks.')
        Shop.objects.create(name='Concurrency test')
        self.owner = get_user_model().objects.create_user('owner')
        Staff.objects.create(user=self.owner, role='OWNER', permissions=ALL)
        self.product = Product.objects.create(name='Last item', sku='LAST', price=100, stock_quantity=1)

    def submit_together(self, keys):
        barrier = Barrier(2)
        def submit(key):
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=self.owner.pk))
            barrier.wait(timeout=10)
            try:
                response = client.post('/api/invoices/', {
                    'request_key': str(key), 'payment_method': 'CASH',
                    'items': [{'product_id': self.product.pk, 'quantity': 1}],
                }, format='json')
                return response.status_code, response.data
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(submit, keys))

    def test_two_cashiers_cannot_sell_last_unit_twice(self):
        results = self.submit_together([uuid.uuid4(), uuid.uuid4()])
        self.assertEqual(sorted(status for status, _ in results), [201, 400], results)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 0)
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)

    def test_simultaneous_retry_creates_one_invoice(self):
        key = uuid.uuid4()
        results = self.submit_together([key, key])
        self.assertTrue(all(status in (200, 201) for status, _ in results), results)
        self.assertEqual(results[0][1]['id'], results[1][1]['id'])
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)

    def test_backup_can_be_restored_and_closed_on_windows(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'backup.zip'
            call_command('backup_shop', output=str(output), verbosity=0)
            with zipfile.ZipFile(output) as archive:
                archive.extract('db.sqlite3', folder)
            with closing(sqlite3.connect(str(Path(folder) / 'db.sqlite3'))) as restored:
                self.assertEqual(restored.execute('pragma integrity_check').fetchone()[0], 'ok')
                self.assertEqual(restored.execute('select stock_quantity from shop_product').fetchone()[0], 1)
