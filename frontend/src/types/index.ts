export type Money = string;
export interface User { id: number; username: string; name: string; role: 'OWNER'|'MANAGER'|'CASHIER'; permissions: string[] }
export interface Shop { id: number; name: string; owner_name: string; address: string; phone: string; email: string; gstin: string; logo: string|null; business_hours: string; invoice_prefix: string; next_invoice_number: number; invoice_footer: string; credit_days: number; tax_enabled: boolean; payment_methods: string[] }
export interface Product { id: number; name: string; sku: string; barcode: string|null; category: number|null; category_name: string; price: Money; purchase_price?: Money; gst_percent: Money; stock_quantity: number; low_stock_threshold: number; is_low_stock: boolean }
export interface Customer { id: number; name: string; phone: string; email: string; address: string; gstin: string; outstanding: Money; total_purchases: Money; overdue: boolean; opening_due_date: string|null; active: boolean }
export interface InvoiceItem { id: number; product: number; name: string; sku: string; quantity: number; price: Money; discount: Money; tax: Money; total: Money; gst_percent: Money }
export interface Invoice { id: number; number: string; customer: number|null; customer_snapshot: {name: string; phone?: string; address?: string; gstin?: string}; shop_snapshot: {name: string}; subtotal: Money; discount: Money; gst_amount: Money; grand_total: Money; outstanding: Money; payment_method: string; status: 'ACTIVE'|'VOID'; created_at: string; created_by_name: string; due_date: string; notes: string; void_reason: string; items: InvoiceItem[] }
export interface Payment { id: number; amount: Money; method: string; direction: string; note: string; transaction_date: string; customer_name: string; created_by_name: string }
export interface LedgerEntry { id: number; amount: Money; balance: Money; type: string; description: string; invoice_number: string; payment_method: string; transaction_date: string; created_by_name: string }
export interface CustomerDetail { customer: Customer; invoices: Invoice[]; ledger: LedgerEntry[]; payments: Payment[] }
export interface Stats { sales: Money; collections: Money; udhar: Money; outstanding?: Money; gst: Money; discount: Money; invoice_count: number; customer_count?: number; overdue_count?: number; low_stock_count?: number }
export interface Trend extends Stats { date: string }
export interface DashboardData { stats: Stats; trend: Trend[]; invoices: Invoice[] }
export interface ReportData { from: string; to: string; stats: Stats; methods: {method: string; receipts: Money; refunds: Money; net: Money}[]; top_products: {name: string; quantity: number; total: Money}[]; staff: {created_by__username: string; total: Money}[]; customers: {customer_snapshot__name: string; total: Money}[]; low_stock: Product[]; outstanding: Customer[]; total_outstanding: Money; trend: Trend[]; payments: Payment[] }
export interface StaffData { staff: (User & {active: boolean})[]; available_permissions: string[]; defaults: Record<string,string[]> }
export interface Activity { id: number; actor_name: string; action: string; detail: string; created_at: string }
export interface Movement { id: number; product_name: string; quantity: number; balance_after: number; reason: string; created_by_name: string; created_at: string }
