from django.urls import path
from shop import views as v, reports as r, documents as d
from shop import integrations as integrations
from shop import operations as o, account as a, catalog_tools as c, tracking as t

urlpatterns = [
    path('api/products/<int:pk>/tracking/', t.inventory),
    path('api/account/', a.profile), path('api/account/password/', a.change_password),
    path('api/forgot-password/', a.forgot_password), path('api/reset-password/', a.reset_password),
    path('api/suppliers/', o.suppliers), path('api/suppliers/<int:pk>/', o.supplier_detail),
    path('api/suppliers/<int:pk>/payments/', o.supplier_payment), path('api/purchases/', o.purchases),
    path('api/expenses/', o.expenses), path('api/expenses/<int:pk>/void/', o.void_expense),
    path('api/stock-counts/', o.stock_counts), path('api/profit/', o.profit),
    path('api/invoices/<int:pk>/returns/', o.returns), path('api/returns/<int:pk>/pdf/', o.return_pdf),
    path('api/products/import/', c.import_products), path('api/products/import-template/', c.import_template),
    path('api/products/labels/', c.labels),

    path('api/health/', v.health),
    path('api/integrations/', integrations.status),
    path('api/integrations/receipts/', integrations.gateway_receipts),
    path('api/invoices/<int:pk>/payment-links/', integrations.payment_links),
    path('api/customers/<int:pk>/reminders/', integrations.reminders),
    path('api/webhooks/razorpay/', integrations.razorpay_webhook),
    path('api/webhooks/whatsapp/', integrations.whatsapp_webhook),
    path('api/session/', v.session), path('api/login/', v.login), path('api/logout/', v.logout), path('api/setup/', v.setup),
    path('api/shop/', v.shop_settings), path('api/shop/logo/', v.logo), path('api/shop/logo/image/', v.logo_image),
    path('api/categories/', v.categories), path('api/products/', v.products),
    path('api/products/<int:pk>/', v.product_detail), path('api/products/<int:pk>/stock/', v.adjust_stock),
    path('api/stock-history/', v.stock_history), path('api/customers/', v.customers),
    path('api/customers/<int:pk>/', v.customer_detail), path('api/customers/<int:pk>/payments/', v.payment),
    path('api/customers/<int:pk>/adjustments/', v.ledger_adjust), path('api/customers/<int:pk>/statement/', d.ledger_pdf),
    path('api/invoices/', v.invoices), path('api/invoices/<int:pk>/', v.invoice_detail),
    path('api/invoices/<int:pk>/void/', v.invoice_void), path('api/invoices/<int:pk>/pdf/', d.invoice_pdf),
    path('api/invoices/<int:pk>/credit-note/', d.credit_note_pdf),
    path('api/dashboard/', r.dashboard), path('api/reports/', r.reports), path('api/reports/export/', r.export),
    path('api/reports/gst-export/', r.gst_export),
    path('api/staff/', v.staff), path('api/staff/<int:pk>/', v.staff_detail), path('api/activity/', v.activity),
]
