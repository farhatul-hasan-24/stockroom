// ─── Auth ───────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "sales_staff";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: AuthUser;
}

// ─── Products ───────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export type ProductStatus = "active" | "inactive" | "discontinued";

export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: number | null;
  category_name: string;
  supplier: number | null;
  supplier_name: string;
  purchase_price: string;
  selling_price: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  image_url: string;
  status: ProductStatus;
  is_low_stock: boolean;
  profit_margin: number;
  created_at: string;
}

// ─── Suppliers / Customers ───────────────────────────────
export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: number;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

// ─── Inventory ───────────────────────────────────────────
export type MovementType = "PURCHASE" | "SALE" | "DAMAGED" | "ADJUSTMENT" | "RETURN";

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  movement_type: MovementType;
  quantity: number;
  prev_stock: number;
  new_stock: number;
  ref_type: string;
  ref_id: string;
  notes: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

// ─── Sales ───────────────────────────────────────────────
export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Sale {
  id: number;
  reference: string;
  customer: number | null;
  customer_name: string;
  grand_total: string;
  discount: string;
  payment_method: "cash" | "card" | "mobile_banking";
  status: "completed" | "refunded" | "voided";
  notes: string;
  items: SaleItem[];
  item_count: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

// ─── Cart (POS) ──────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

// ─── Purchases ───────────────────────────────────────────
export interface PurchaseItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_cost: string;
  subtotal: string;
}

export interface Purchase {
  id: number;
  reference: string;
  supplier: number;
  supplier_name: string;
  total_cost: string;
  status: "pending" | "received" | "cancelled";
  notes: string;
  items: PurchaseItem[];
  item_count: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

// ─── Dashboard ───────────────────────────────────────────
export interface DashboardSummary {
  total_products: number;
  low_stock_alerts: number;
  out_of_stock: number;
  today_sales_bdt: number;
  daily_sales: { date: string; total: number; count: number }[];
  low_stock_products: {
    id: number;
    name: string;
    sku: string;
    current_stock: number;
    minimum_stock: number;
    unit: string;
  }[];
}

// ─── Paginated Response ──────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Financial Report ────────────────────────────────────
export interface FinancialReport {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_discount: number;
  total_orders: number;
  avg_order_value: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}
