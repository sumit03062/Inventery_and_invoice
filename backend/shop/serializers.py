import re
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from .models import Shop, Product, Customer, Category, Invoice, InvoiceItem, Payment, LedgerEntry, StockMovement, Activity
from .permissions import permissions_for
from .services import balance, invoice_due, ZERO, quantity
from .tax import validate_state


def validate_gstin(value):
    value = value.strip().upper()
    if value and not re.fullmatch(r'\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]', value):
        raise serializers.ValidationError('Enter a 15-character GSTIN, or leave it blank.')
    return value


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        exclude = ['revision']
        read_only_fields = ['id', 'next_credit_number']

    validate_gstin = staticmethod(validate_gstin)
    validate_state_code = staticmethod(validate_state)

    def validate(self, data):
        mode = data.get('gst_mode', getattr(self.instance, 'gst_mode', 'BASIC'))
        gstin = data.get('gstin', getattr(self.instance, 'gstin', ''))
        state = data.get('state_code', getattr(self.instance, 'state_code', ''))
        if gstin and state and gstin[:2] != state:
            raise serializers.ValidationError('GSTIN prefix must match the shop state code.')
        if mode == 'DOMESTIC' and (not gstin or not state or not data.get('address', getattr(self.instance, 'address', ''))):
            raise serializers.ValidationError('Domestic GST requires shop GSTIN, state and address.')
        return data

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
    stock_quantity = serializers.DecimalField(max_digits=15, decimal_places=3, read_only=True, coerce_to_string=False)
    low_stock_threshold = serializers.DecimalField(max_digits=15, decimal_places=3, min_value=0, required=False, coerce_to_string=False)

    is_low_stock = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default='')

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['stock_quantity', 'active', 'created_at', 'updated_at']

    def get_is_low_stock(self, obj):
        return obj.stock_quantity <= obj.low_stock_threshold

    def validate(self, data):
        unit = data.get('unit', getattr(self.instance, 'unit', 'PCS'))
        if unit not in ['PCS', 'KG', 'LTR'] and (not self.instance or unit != self.instance.unit):
            raise serializers.ValidationError({'unit': 'Choose pieces, kg or litres.'})
        if self.instance and unit != self.instance.unit and (self.instance.stock_quantity or self.instance.movements.exists() or self.instance.invoiceitem_set.exists()):
            raise serializers.ValidationError({'unit': 'Unit cannot change after stock movements or sales. Create a new product for a different unit.'})
        quantity(data.get('low_stock_threshold', getattr(self.instance, 'low_stock_threshold', 5)), unit, minimum=0)
        tracking = data.get('tracking', getattr(self.instance,'tracking','NONE'))
        if tracking=='SERIAL' and unit!='PCS':
            raise serializers.ValidationError('Serial tracking requires pieces.')
        if data.get('warranty_days',0)>36500:
            raise serializers.ValidationError('Warranty cannot exceed 100 years.')
        if self.instance and tracking!=self.instance.tracking and (self.instance.stock_quantity or self.instance.movements.exists()):
            raise serializers.ValidationError('Tracking cannot change after stock has been recorded.')
        pieces = data.get('pieces_per_box', getattr(self.instance, 'pieces_per_box', 1))
        if not 1 <= pieces <= 1000000:
            raise serializers.ValidationError({'pieces_per_box': 'Use 1 to 1,000,000 pieces per box.'})
        hsn = data.get('hsn_code', '')
        if hsn and not re.fullmatch(r'(?:\d{4}|\d{6}|\d{8})', hsn):
            raise serializers.ValidationError({'hsn_code': 'Enter 4, 6 or 8 digits.'})
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
    credit_limit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, allow_null=True, required=False)

    outstanding = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['active', 'created_at', 'whatsapp_consent_at']

    validate_gstin = staticmethod(validate_gstin)
    validate_state_code = staticmethod(validate_state)

    def validate(self, data):
        gstin = data.get('gstin', getattr(self.instance, 'gstin', ''))
        state = data.get('state_code', getattr(self.instance, 'state_code', ''))
        if gstin and state and gstin[:2] != state:
            raise serializers.ValidationError('GSTIN prefix must match the customer state code.')
        consent = data.get('whatsapp_consent', getattr(self.instance, 'whatsapp_consent', False))
        if consent and not data.get('whatsapp_consent_note', getattr(self.instance, 'whatsapp_consent_note', '')):
            raise serializers.ValidationError('Record when/how the customer agreed to WhatsApp payment reminders.')
        if self.instance and data.get('phone', self.instance.phone) != self.instance.phone:
            data['whatsapp_consent'] = False
            data['whatsapp_consent_at'] = None
        elif 'whatsapp_consent' in data:
            data['whatsapp_consent_at'] = timezone.now() if consent else None
        return data

    def validate_phone(self, value):
        if not re.fullmatch(r'\+?[0-9 ()-]{7,20}', value):
            raise serializers.ValidationError('Enter a valid mobile number.')
        return value

    def get_outstanding(self, obj):
        return str(balance(obj))

    def get_total_purchases(self, obj):
        from .models import SaleReturn
        sales = obj.invoices.filter(status='ACTIVE').aggregate(total=Sum('grand_total'))['total'] or ZERO
        credits = SaleReturn.objects.filter(invoice__customer=obj).aggregate(total=Sum('total'))['total'] or ZERO
        return str(sales-credits)

    def get_overdue(self, obj):
        if balance(obj) <= 0:
            return False
        today = timezone.localdate()
        opening = obj.ledger.filter(invoice__isnull=True).aggregate(total=Sum('amount'))['total'] or ZERO
        return bool((obj.opening_due_date and obj.opening_due_date < today and opening > 0) or
                    any(invoice_due(i) > 0 for i in obj.invoices.filter(status='ACTIVE', due_date__lt=today)))


class ItemSerializer(serializers.ModelSerializer):
    returned_quantity = serializers.SerializerMethodField()
    def get_returned_quantity(self,obj):
        return obj.returns.aggregate(v=Sum('quantity'))['v'] or 0

    quantity = serializers.DecimalField(max_digits=15, decimal_places=3, read_only=True, coerce_to_string=False)
    class Meta:
        model = InvoiceItem
        exclude = ['purchase_price', 'invoice']


class InvoiceSerializer(serializers.ModelSerializer):
    returned_total = serializers.SerializerMethodField()
    def get_returned_total(self,obj):
        return str(obj.returns.aggregate(v=Sum('total'))['v'] or 0)

    items = ItemSerializer(many=True, read_only=True)
    outstanding = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    credit_note_number = serializers.CharField(source='credit_note.number', read_only=True, default='')

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
    quantity = serializers.DecimalField(max_digits=15, decimal_places=3, read_only=True, coerce_to_string=False)
    balance_after = serializers.DecimalField(max_digits=15, decimal_places=3, read_only=True, coerce_to_string=False)
    unit = serializers.CharField(source='product.unit', read_only=True)

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
