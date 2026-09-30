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
    state_code = models.CharField(max_length=2, blank=True)
    gst_mode = models.CharField(max_length=12, choices=[('BASIC', 'Basic tax'), ('DOMESTIC', 'Domestic GST')], default='BASIC')
    next_credit_number = models.PositiveIntegerField(default=1)
    revision = models.PositiveIntegerField(default=0)


class Staff(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='profile')
    role = models.CharField(max_length=10, choices=[('OWNER', 'Owner'), ('MANAGER', 'Manager'), ('CASHIER', 'Cashier')])
    permissions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)


class Product(models.Model):
    variant_group = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=50, blank=True)
    colour = models.CharField(max_length=50, blank=True)
    tracking = models.CharField(max_length=10, choices=[('NONE','None'),('BATCH','Batch / expiry'),('SERIAL','Serial number')], default='NONE')
    warranty_days = models.PositiveIntegerField(default=0)
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=80, unique=True)
    barcode = models.CharField(max_length=80, unique=True, null=True, blank=True)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.PROTECT)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    hsn_code = models.CharField(max_length=8, blank=True)
    unit = models.CharField(max_length=10, default='PCS')
    price_includes_tax = models.BooleanField(default=False)
    pieces_per_box = models.PositiveIntegerField(default=1)
    stock_quantity = models.DecimalField(max_digits=15, decimal_places=3, default=0)
    low_stock_threshold = models.DecimalField(max_digits=15, decimal_places=3, default=5)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(price__gte=0) & Q(purchase_price__gte=0), name='product_nonnegative_prices'),
                       models.CheckConstraint(condition=Q(gst_percent__gte=0) & Q(gst_percent__lte=100), name='product_tax_range'),
                       models.CheckConstraint(condition=Q(stock_quantity__gte=0) & Q(low_stock_threshold__gte=0), name='product_nonnegative_stock')]


class Customer(models.Model):
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    state_code = models.CharField(max_length=2, blank=True)
    whatsapp_consent = models.BooleanField(default=False)
    whatsapp_consent_note = models.CharField(max_length=250, blank=True)
    whatsapp_consent_at = models.DateTimeField(null=True, blank=True)
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
    place_of_supply = models.CharField(max_length=2, blank=True)
    cgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    utgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
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
    serial_numbers = models.JSONField(default=list)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=80)
    hsn_code = models.CharField(max_length=8, blank=True)
    unit = models.CharField(max_length=10, default='PCS')
    price_includes_tax = models.BooleanField(default=False)
    taxable_value = models.DecimalField(max_digits=14, decimal_places=2, null=True)
    cgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    utgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    quantity = models.DecimalField(max_digits=15, decimal_places=3)
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
    quantity = models.DecimalField(max_digits=15, decimal_places=3)
    balance_after = models.DecimalField(max_digits=15, decimal_places=3)
    reason = models.CharField(max_length=500)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    request_key = models.UUIDField(null=True, unique=True)


class Activity(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=80)
    detail = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)


class CreditNote(models.Model):
    number = models.CharField(max_length=16, unique=True)
    invoice = models.OneToOneField(Invoice, on_delete=models.PROTECT, related_name='credit_note')
    reason = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class PaymentLink(models.Model):
    request_key = models.UUIDField(unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='online_links')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    provider_id = models.CharField(max_length=100, blank=True)
    url = models.URLField(blank=True)
    status = models.CharField(max_length=20, default='CREATING')
    detail = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class GatewayReceipt(models.Model):
    provider_payment_id = models.CharField(max_length=100, unique=True)
    link = models.ForeignKey(PaymentLink, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, default='REVIEW')
    detail = models.CharField(max_length=500, blank=True)
    payment = models.OneToOneField(Payment, null=True, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class Reminder(models.Model):
    request_key = models.UUIDField(unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='reminders')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    phone = models.CharField(max_length=20)
    template = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='QUEUED')
    provider_id = models.CharField(max_length=200, blank=True)
    detail = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class SharedCache(models.Model):
    cache_key = models.CharField(max_length=255, primary_key=True)
    value = models.TextField()
    expires = models.DateTimeField(db_index=True)

    class Meta:
        db_table = 'shop_cache'


class Supplier(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    active = models.BooleanField(default=True)


class Purchase(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchases')
    reference = models.CharField(max_length=100)
    date = models.DateField(default=timezone.localdate)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    request_key = models.UUIDField(unique=True)
    request_hash = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['supplier','reference'], name='supplier_bill_reference')]


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.PROTECT, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=15, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    tax = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)


class SupplierEntry(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='ledger')
    purchase = models.ForeignKey(Purchase, null=True, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    method = models.CharField(max_length=10, blank=True)
    note = models.CharField(max_length=500)
    date = models.DateField(default=timezone.localdate)
    request_key = models.UUIDField(null=True, unique=True)
    request_hash = models.CharField(max_length=64, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class Expense(models.Model):
    category = models.CharField(max_length=100)
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=10)
    void_reason = models.CharField(max_length=500, blank=True)
    request_key = models.UUIDField(unique=True)
    request_hash = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class SaleReturn(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='returns')
    number = models.CharField(max_length=16, unique=True)
    reason = models.CharField(max_length=500)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    refund = models.DecimalField(max_digits=14, decimal_places=2)
    tax_parts = models.JSONField(default=dict)
    request_key = models.UUIDField(unique=True)
    request_hash = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(default=timezone.now)


class ReturnItem(models.Model):
    serial_numbers = models.JSONField(default=list)
    sale_return = models.ForeignKey(SaleReturn, on_delete=models.PROTECT, related_name='items')
    item = models.ForeignKey(InvoiceItem, on_delete=models.PROTECT, related_name='returns')
    quantity = models.DecimalField(max_digits=15, decimal_places=3)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    tax_parts = models.JSONField(default=dict)
    restock = models.BooleanField(default=True)


class StockCount(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    expected = models.DecimalField(max_digits=15, decimal_places=3)
    counted = models.DecimalField(max_digits=15, decimal_places=3)
    reason = models.CharField(max_length=500)
    request_key = models.UUIDField(unique=True)
    request_hash = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class ProductImport(models.Model):
    request_key = models.UUIDField(unique=True)
    digest = models.CharField(max_length=64)
    count = models.PositiveIntegerField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class StockLot(models.Model):
    product = models.ForeignKey(Product,on_delete=models.PROTECT,related_name='lots')
    batch = models.CharField(max_length=100)
    expiry = models.DateField(null=True,blank=True)
    available = models.DecimalField(max_digits=15,decimal_places=3)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['product','batch'],name='product_batch_unique')]


class LotAllocation(models.Model):
    lot = models.ForeignKey(StockLot,on_delete=models.PROTECT)
    item = models.ForeignKey(InvoiceItem,on_delete=models.PROTECT,related_name='lot_allocations')
    quantity = models.DecimalField(max_digits=15,decimal_places=3)
    returned = models.DecimalField(max_digits=15,decimal_places=3,default=0)


class SerialUnit(models.Model):
    product = models.ForeignKey(Product,on_delete=models.PROTECT,related_name='serials')
    serial = models.CharField(max_length=100,unique=True)
    status = models.CharField(max_length=10,default='AVAILABLE')
    item = models.ForeignKey(InvoiceItem,null=True,on_delete=models.PROTECT,related_name='serial_units')
    warranty_until = models.DateField(null=True)


class TrackingEvent(models.Model):
    product = models.ForeignKey(Product,on_delete=models.PROTECT)
    request_key = models.UUIDField(unique=True)
    request_hash = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
