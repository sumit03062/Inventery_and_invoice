from django.urls import path
from shop import views as v, reports as r, documents as d

urlpatterns = [
    path('api/session/', v.session), path('api/login/', v.login), path('api/logout/', v.logout), path('api/setup/', v.setup),
    path('api/shop/', v.shop_settings), path('api/shop/logo/', v.logo), path('api/shop/logo/image/', v.logo_image),
    path('api/categories/', v.categories), path('api/products/', v.products),
    path('api/products/<int:pk>/', v.product_detail), path('api/products/<int:pk>/stock/', v.adjust_stock),
    path('api/stock-history/', v.stock_history), path('api/customers/', v.customers),
    path('api/customers/<int:pk>/', v.customer_detail), path('api/customers/<int:pk>/payments/', v.payment),
    path('api/customers/<int:pk>/adjustments/', v.ledger_adjust), path('api/customers/<int:pk>/statement/', d.ledger_pdf),
    path('api/invoices/', v.invoices), path('api/invoices/<int:pk>/', v.invoice_detail),
    path('api/invoices/<int:pk>/void/', v.invoice_void), path('api/invoices/<int:pk>/pdf/', d.invoice_pdf),
    path('api/dashboard/', r.dashboard), path('api/reports/', r.reports), path('api/reports/export/', r.export),
    path('api/staff/', v.staff), path('api/staff/<int:pk>/', v.staff_detail), path('api/activity/', v.activity),
]
