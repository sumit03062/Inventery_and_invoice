import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Shop(models.Model):
    # A singleton per installation. Financial writes lock this row.
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    name = models.CharField(max_length=150, default='My Shop')
    owner_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True)
    invoice_prefix = models.CharField(max_length=20, default='INV')
    next_invoice_number = models.PositiveIntegerField(default=1)
    invoice_footer = models.CharField(max_length=500, default='Thank you for shopping with us.')
    business_hours = models.CharField(max_length=500, default='Monday–Saturday, 9:00 AM–8:00 PM')
    payment_methods = models.JSONField(default=list)
    credit_days = models.PositiveIntegerField(default=30)
    tax_enabled = models.BooleanField(default=True)
    revision = models.PositiveIntegerField(default=0)


class Staff(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='profile')
    role = models.CharField(max_length=10, choices=[('OWNER', 'Owner'), ('MANAGER', 'Manager'), ('CASHIER', 'Cashier')])
    permissions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)


class Product(models.Model):
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=80, unique=True)
    barcode = models.CharField(max_length=80, unique=True, null=True, blank=True)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.PROTECT)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(price__gte=0) & Q(purchase_price__gte=0), name='product_nonnegative_prices'),
                       models.CheckConstraint(condition=Q(gst_percent__gte=0) & Q(gst_percent__lte=100), name='product_tax_range')]


class Customer(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    opening_due_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Invoice(models.Model):
    number = models.CharField(max_length=50, unique=True)
    request_key = models.UUIDField(default=uuid.uuid4, unique=True)
    request_hash = models.CharField(max_length=64)
    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.PROTECT, related_name='invoices')
    customer_snapshot = models.JSONField(default=dict)
    shop_snapshot = models.JSONField(default=dict)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=14, decimal_places=2)
    grand_total = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=10)
    due_date = models.DateField()
    notes = models.CharField(max_length=1000, blank=True)
    status = models.CharField(max_length=10, default='ACTIVE')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)
    voided_at = models.DateTimeField(null=True)
    void_reason = models.CharField(max_length=500, blank=True)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=80)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2)
    discount = models.DecimalField(max_digits=14, decimal_places=2)
    tax = models.DecimalField(max_digits=14, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)


class Payment(models.Model):
    request_key = models.UUIDField(default=uuid.uuid4, unique=True)
    request_hash = models.CharField(max_length=64, blank=True)
    customer = models.ForeignKey(Customer, null=True, on_delete=models.PROTECT, related_name='payments')
    invoice = models.ForeignKey(Invoice, null=True, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    method = models.CharField(max_length=10)
    direction = models.CharField(max_length=10, default='RECEIPT')
    note = models.CharField(max_length=500, blank=True)
    transaction_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class LedgerEntry(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='ledger')
    invoice = models.ForeignKey(Invoice, null=True, on_delete=models.PROTECT, related_name='ledger')
    payment = models.ForeignKey(Payment, null=True, on_delete=models.PROTECT, related_name='ledger')
    type = models.CharField(max_length=15)  # CREDIT, PAYMENT, OPENING, ADJUSTMENT, REVERSAL
    amount = models.DecimalField(max_digits=14, decimal_places=2)  # positive debit; negative credit
    description = models.CharField(max_length=500)
    transaction_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    request_key = models.UUIDField(null=True, unique=True)

    class Meta:
        ordering = ['transaction_date', 'id']
        indexes = [models.Index(fields=['customer', 'transaction_date'])]


class StockMovement(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='movements')
    invoice = models.ForeignKey(Invoice, null=True, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    balance_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=500)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    request_key = models.UUIDField(null=True, unique=True)


class Activity(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=80)
    detail = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
