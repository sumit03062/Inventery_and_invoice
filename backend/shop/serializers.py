import re
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from .models import Shop, Product, Customer, Category, Invoice, InvoiceItem, Payment, LedgerEntry, StockMovement, Activity
from .permissions import permissions_for
from .services import balance, invoice_due, ZERO


def validate_gstin(value):
    value = value.strip().upper()
    if value and not re.fullmatch(r'\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]', value):
        raise serializers.ValidationError('Enter a 15-character GSTIN, or leave it blank.')
    return value


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        exclude = ['revision']
        read_only_fields = ['id']

    validate_gstin = staticmethod(validate_gstin)

    def validate_invoice_prefix(self, value):
        if not re.fullmatch(r'[A-Za-z0-9-]{1,20}', value):
            raise serializers.ValidationError('Use up to 20 letters, numbers or hyphens.')
        return value.upper()

    def validate_next_invoice_number(self, value):
        if value < 1 or (self.instance and value < self.instance.next_invoice_number):
            raise serializers.ValidationError('Invoice numbering can only move forward.')
        return value

    def validate_credit_days(self, value):
        if value > 365:
            raise serializers.ValidationError('Credit terms must be between 0 and 365 days.')
        return value

    def validate_payment_methods(self, value):
        if not isinstance(value, list) or not value or any(x not in ['CASH', 'UPI', 'CARD', 'CREDIT'] for x in value):
            raise serializers.ValidationError('Select cash, UPI, card or credit methods.')
        if not set(value) & {'CASH', 'UPI', 'CARD'}:
            raise serializers.ValidationError('Enable at least one collection method.')
        return list(dict.fromkeys(value))

    def validate_logo(self, value):
        if value.size > 2 * 1024 * 1024 or value.image.format not in ['PNG', 'JPEG', 'WEBP']:
            raise serializers.ValidationError('Upload a PNG, JPEG or WebP image under 2 MB.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default='')

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['stock_quantity', 'active', 'created_at', 'updated_at']

    def get_is_low_stock(self, obj):
        return obj.stock_quantity <= obj.low_stock_threshold

    def validate(self, data):
        for field in ['purchase_price', 'price', 'gst_percent']:
            if data.get(field, 0) < 0:
                raise serializers.ValidationError({field: 'Cannot be negative.'})
        if data.get('gst_percent', 0) > 100:
            raise serializers.ValidationError({'gst_percent': 'Cannot exceed 100%.'})
        if 'barcode' in data and not data['barcode']:
            data['barcode'] = None
        return data

    def to_representation(self, obj):
        data = super().to_representation(obj)
        if 'prices.write' not in permissions_for(self.context['request'].user):
            data.pop('purchase_price', None)
        return data


class CustomerSerializer(serializers.ModelSerializer):
    outstanding = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['active', 'created_at']

    validate_gstin = staticmethod(validate_gstin)

    def validate_phone(self, value):
        if not re.fullmatch(r'\+?[0-9 ()-]{7,20}', value):
            raise serializers.ValidationError('Enter a valid mobile number.')
        return value

    def get_outstanding(self, obj):
        return str(balance(obj))

    def get_total_purchases(self, obj):
        return str(obj.invoices.filter(status='ACTIVE').aggregate(total=Sum('grand_total'))['total'] or ZERO)

    def get_overdue(self, obj):
        if balance(obj) <= 0:
            return False
        today = timezone.localdate()
        opening = obj.ledger.filter(invoice__isnull=True).aggregate(total=Sum('amount'))['total'] or ZERO
        return bool((obj.opening_due_date and obj.opening_due_date < today and opening > 0) or
                    any(invoice_due(i) > 0 for i in obj.invoices.filter(status='ACTIVE', due_date__lt=today)))


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        exclude = ['purchase_price', 'invoice']


class InvoiceSerializer(serializers.ModelSerializer):
    items = ItemSerializer(many=True, read_only=True)
    outstanding = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Invoice
        exclude = ['request_hash', 'request_key']

    def get_outstanding(self, obj):
        return str(invoice_due(obj))


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='Walk-in customer')

    class Meta:
        model = Payment
        exclude = ['request_hash', 'request_key']


class LedgerSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.number', read_only=True, default='')
    payment_method = serializers.CharField(source='payment.method', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = LedgerEntry
        exclude = ['request_key']


class MovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockMovement
        exclude = ['request_key']


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username')

    class Meta:
        model = Activity
        fields = '__all__'
