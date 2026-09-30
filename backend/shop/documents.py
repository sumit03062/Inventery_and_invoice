"""Printable documents use saved invoice snapshots and a full customer ledger."""
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
from django.http import HttpResponse
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from rest_framework.decorators import api_view
from .models import Shop, Invoice, Customer, CreditNote
from .services import ZERO, invoice_due
from .tax import STATES

STYLES = getSampleStyleSheet()
STYLES['Normal'].fontSize = 9
STYLES['Normal'].leading = 13
pdfmetrics.registerFont(TTFont('Shopbook', str(Path(__file__).parent / 'fonts' / 'NotoSansDevanagari.ttf'), shapable=True))
for _style in STYLES.byName.values():
    _style.fontName = 'Shopbook'
    _style.shaping = True


def p(value, style='Normal'):
    return Paragraph(escape(str(value)).replace('\n', '<br/>'), STYLES[style])


def table(rows, widths):
    result = Table([[p(c) for c in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f4ef')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), .3, colors.HexColor('#dce3e8')),
        ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return result


def document(elements, filename, thermal=False):
    stream = BytesIO()
    def footer(canvas, doc):
        canvas.setFont('Helvetica', 8)
        canvas.drawString((5 if thermal else 18) * mm, 8 * mm, f'INR (Rs.) | Page {doc.page}')
    margin = (5 if thermal else 18)*mm
    doc = SimpleDocTemplate(stream, pagesize=(80*mm,297*mm) if thermal else A4,
        rightMargin=margin, leftMargin=margin, topMargin=margin, bottomMargin=16*mm, title=filename)
    doc.build(elements, onFirstPage=footer, onLaterPages=footer)
    response = HttpResponse(stream.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}.pdf"'
    return response


@api_view(['GET'])
def invoice_pdf(request, pk):
    inv = get_object_or_404(Invoice, pk=pk)
    return invoice_document(inv, thermal=request.query_params.get('layout') == 'thermal')


@api_view(['GET'])
def credit_note_pdf(request, pk):
    note = get_object_or_404(CreditNote.objects.select_related('invoice'), invoice_id=pk)
    return invoice_document(note.invoice, credit_note=note, thermal=request.query_params.get('layout') == 'thermal')


def invoice_document(inv, credit_note=None, thermal=False):
    shop = inv.shop_snapshot
    elements = []
    if shop.get('logo'):
        try:
            logo = Image(default_storage.path(shop['logo']))
            logo._restrictSize(40*mm, 20*mm)
            logo.hAlign = 'LEFT'
            elements += [logo, Spacer(1, 8)]
        except OSError:
            pass
    elements += [p(shop['name'], 'Title'), p(shop.get('address', '')),
        p(f"Phone: {shop.get('phone', '')} | GSTIN: {shop.get('gstin') or 'Not provided'}"), Spacer(1, 14),
        p(f'Credit note {credit_note.number}' if credit_note else f"{'VOID - ' if inv.status == 'VOID' else ''}Invoice {inv.number}", 'Heading2' if thermal else 'Heading1'),
        p(f'Date: {timezone.localtime(inv.created_at):%d %b %Y, %I:%M %p} | Due: {inv.due_date:%d %b %Y}'),
        p(f"Bill to: {inv.customer_snapshot.get('name', 'Walk-in customer')}"),
        p(inv.customer_snapshot.get('address', '')),
        p(f"Phone: {inv.customer_snapshot.get('phone', '')} | GSTIN: {inv.customer_snapshot.get('gstin') or '-'}"), Spacer(1, 14)]
    if credit_note:
        elements += [p(f'Original invoice: {inv.number}'), p(f'Credit note date: {timezone.localtime(credit_note.created_at):%d %b %Y}'), p('Reason: '+credit_note.reason)]
    if inv.place_of_supply:
        elements += [p(f'Place of supply: {inv.place_of_supply} - {STATES.get(inv.place_of_supply, "")}')]
    if shop.get('gst_mode') == 'DOMESTIC':
        elements += [p('Reverse charge: No | Domestic retail goods')]
    rows = [['Item', 'Total']] if thermal else [['Product / HSN / unit', 'Qty', 'Rate', 'Discount', 'GST %', 'Tax', 'Total']]
    for item in inv.items.all():
        label = f'{item.name}\n{item.sku} | HSN {item.hsn_code or "-"} | {item.unit}'
        if item.price_includes_tax:
            label += '\nRate includes GST'
        if thermal:
            rows.append([f'{label}\n{item.quantity} x {item.price}\nDiscount {item.discount}; GST {item.gst_percent}%: {item.tax}', item.total])
        else:
            rows.append([label, item.quantity, item.price, item.discount, item.gst_percent, item.tax, item.total])
    elements += [table(rows, [140,46] if thermal else [148, 27, 57, 58, 47, 65, 91]), Spacer(1, 14),
        p(f'Subtotal: Rs. {inv.subtotal} | Discount: Rs. {inv.discount} | GST: Rs. {inv.gst_amount}'),
        p(f'{"Credit total" if credit_note else "Grand total"}: Rs. {inv.grand_total}', 'Heading2'),
        p(f'Taxable value: Rs. {inv.subtotal-inv.discount}'),
        p(f'Payment type: {inv.payment_method} | Issued by: {inv.created_by.username}'),
        p(inv.notes), Spacer(1, 16), p(shop.get('invoice_footer', ''))]
    if not credit_note:
        elements += [p(f'Outstanding on this invoice: Rs. {invoice_due(inv)}')]
    for component in ['cgst','sgst','utgst','igst']:
        if getattr(inv, component):
            elements += [p(f'{component.upper()}: Rs. {getattr(inv, component)}')]
    if shop.get('gst_mode') == 'DOMESTIC':
        elements += [Spacer(1,12), p('Authorized signatory: __________________')]
    if inv.status == 'VOID':
        elements += [p(f'Voided: {inv.void_reason}')]
    return document(elements, credit_note.number if credit_note else inv.number, thermal=thermal)


@api_view(['GET'])
def ledger_pdf(request, pk):
    customer = get_object_or_404(Customer, pk=pk)
    shop = Shop.objects.get(pk=1)
    elements = [p(shop.name, 'Title'), p('Customer statement', 'Heading1'),
        p(f'{customer.name} | {customer.phone}'), p(customer.address),
        p(f'Generated: {timezone.localtime():%d %b %Y, %I:%M %p}'), Spacer(1, 14)]
    rows = [['Date', 'Description / reference', 'Debit', 'Credit', 'Balance']]
    running = ZERO
    for row in customer.ledger.select_related('invoice', 'payment'):
        running += row.amount
        reference = row.invoice.number if row.invoice else row.type
        method = row.payment.method if row.payment else ''
        rows.append([f'{timezone.localtime(row.transaction_date):%d %b %Y\n%I:%M %p}',
            f'{reference} {method}\n{row.description}', row.amount if row.amount > 0 else '-',
            -row.amount if row.amount < 0 else '-', running])
    elements += [table(rows, [80, 188, 70, 70, 85]), Spacer(1, 14), p(f'Outstanding: Rs. {running}', 'Heading2')]
    return document(elements, f'customer-{customer.id}-statement')
