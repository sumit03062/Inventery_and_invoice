// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  price: number;
  gst_percent: number;
  stock_quantity: number;
  price_with_gst: number;
  is_low_stock: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  gst_percent: number;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface UpdateProductInput extends CreateProductInput {}

// Invoice Types
export interface InvoiceItem {
  product_id: string | number;
  quantity: number;
  price?: number;
  gst_amount?: number;
  subtotal?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceInput {
  items: InvoiceItem[];
}

// Report Types
export interface DailySalesStats {
  invoice_count: number;
  subtotal: number;
  gst_collected: number;
  total_sales: number;
  avg_invoice: number;
  max_invoice: number;
}

export interface WeeklySalesStats {
  week_start: string;
  week_end: string;
  total_invoices: number;
  total_sales: number;
  daily_breakdown: DailySalesStats[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiListResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Form State Types
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Navigation Types
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

// Form Error Type
export interface FormErrors {
  [key: string]: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// Filter Types
export interface ProductFilter {
  name?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export interface InvoiceFilter {
  invoice_number?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}