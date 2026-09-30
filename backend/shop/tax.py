"""Domestic retail goods tax; excludes exports, SEZ and reverse-charge supplies."""
from decimal import Decimal, ROUND_HALF_UP
from rest_framework.exceptions import ValidationError

STATES = {'01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
    '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
    '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
    '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
    '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat',
    '26':'Dadra and Nagar Haveli and Daman and Diu','27':'Maharashtra','29':'Karnataka',
    '30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry',
    '35':'Andaman and Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh'}
UNION_TERRITORIES = {'04','26','31','35','38'}

def rounded(value):
    return value.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)

def validate_state(value):
    if value and value not in STATES:
        raise ValidationError('Select a valid Indian state or union territory.')
    return value

def tax_parts(base, rate, mode, origin, destination):
    parts = dict.fromkeys(['cgst','sgst','utgst','igst'], Decimal('0.00'))
    if mode != 'DOMESTIC':
        return rounded(base * rate / 100), parts
    if origin != destination:
        parts['igst'] = rounded(base * rate / 100)
    else:
        half = rounded(base * rate / 200)
        parts['cgst'] = half
        parts['utgst' if origin in UNION_TERRITORIES else 'sgst'] = half
    return sum(parts.values()), parts
