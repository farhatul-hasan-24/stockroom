import api from "./axios";
import type {
  AuthTokens, Product, Category, Supplier, Customer,
  Sale, Purchase, StockMovement, DashboardSummary,
  FinancialReport, PaginatedResponse,
} from "../types";

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>("/auth/login/", { email, password }),
  logout: (refresh: string) =>
    api.post("/auth/logout/", { refresh }),
  me: () => api.get("/auth/me/"),
  changePassword: (old_password: string, new_password: string) =>
    api.post("/auth/change-password/", { old_password, new_password }),
};

// ─── Dashboard ───────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary/"),
};

// ─── Products ────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Product>>("/products/", { params }),
  get: (id: number) => api.get<Product>(`/products/${id}/`),
  create: (data: Partial<Product>) => api.post<Product>("/products/", data),
  update: (id: number, data: Partial<Product>) => api.patch<Product>(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
};

// ─── Categories ──────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get<PaginatedResponse<Category>>("/products/categories/"),
  create: (data: Partial<Category>) => api.post<Category>("/products/categories/", data),
  update: (id: number, data: Partial<Category>) =>
    api.patch<Category>(`/products/categories/${id}/`, data),
  delete: (id: number) => api.delete(`/products/categories/${id}/`),
};

// ─── Suppliers ───────────────────────────────────────────
export const suppliersApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Supplier>>("/suppliers/", { params }),
  get: (id: number) => api.get<Supplier>(`/suppliers/${id}/`),
  create: (data: Partial<Supplier>) => api.post<Supplier>("/suppliers/", data),
  update: (id: number, data: Partial<Supplier>) =>
    api.patch<Supplier>(`/suppliers/${id}/`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}/`),
};

// ─── Customers ───────────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Customer>>("/customers/", { params }),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers/", data),
  update: (id: number, data: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, data),
  delete: (id: number) => api.delete(`/customers/${id}/`),
};

// ─── Sales / POS ─────────────────────────────────────────
export const salesApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Sale>>("/sales/", { params }),
  get: (id: number) => api.get<Sale>(`/sales/${id}/`),
  checkout: (payload: {
    customer?: number | null;
    items: { product: number; quantity: number; unit_price: string }[];
    discount?: string;
    payment_method?: string;
    notes?: string;
  }) => api.post<Sale>("/sales/checkout/", payload),
  reports: (period: string) =>
    api.get<FinancialReport>(`/sales/reports/?period=${period}`),
};

// ─── Purchases ───────────────────────────────────────────
export const purchasesApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Purchase>>("/purchases/list/", { params }),
  get: (id: number) => api.get<Purchase>(`/purchases/list/${id}/`),
  create: (payload: {
    supplier: number;
    items: { product: number; quantity: number; unit_cost: string }[];
    notes?: string;
  }) => api.post<Purchase>("/purchases/", payload),
};

// ─── Inventory ───────────────────────────────────────────
export const inventoryApi = {
  movements: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<StockMovement>>("/inventory/movements/", { params }),
  adjust: (product_id: number, new_stock_level: number, notes?: string) =>
    api.post("/inventory/adjust/", { product_id, new_stock_level, notes }),
};

// ─── Users (admin) ───────────────────────────────────────
export const usersApi = {
  list: () => api.get("/users/"),
  create: (data: object) => api.post("/users/", data),
  update: (id: number, data: object) => api.patch(`/users/${id}/`, data),
  toggleActive: (id: number) => api.post(`/users/${id}/toggle-active/`),
};
