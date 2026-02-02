// Database Types for Kanaku360

export type UserRole = 'admin' | 'cashier';
export type EmployeeStatus = 'pending' | 'active' | 'inactive';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'credit';
export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'return';
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  name_tamil: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopEmployee {
  id: string;
  shop_id: string;
  user_id: string | null;
  invited_email: string;
  role: UserRole;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: User;
  shop?: Shop;
}

export interface Category {
  id: string;
  shop_id: string;
  parent_id: string | null;
  name: string;
  name_tamil: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Nested fields
  children?: Category[];
  parent?: Category;
}

export interface Brand {
  id: string;
  shop_id: string;
  name: string;
  name_tamil: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceType {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  brand_id: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  name_tamil: string | null;
  description: string | null;
  mrp: number;
  cost_price: number;
  default_selling_price: number;
  gst_percent: number;
  hsn_code: string | null;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  brand?: Brand;
  prices?: ProductPrice[];
}

export interface ProductPrice {
  id: string;
  product_id: string;
  price_type_id: string;
  selling_price: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  price_type?: PriceType;
}

export interface Bill {
  id: string;
  shop_id: string;
  bill_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  price_type_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  taxable_amount: number;
  gst_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: 'paid' | 'pending' | 'partial';
  notes: string | null;
  created_by: string;
  created_at: string;
  // Joined fields
  items?: BillItem[];
  price_type?: PriceType;
  created_by_user?: User;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  product_name: string;
  product_name_tamil: string | null;
  sku: string | null;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  taxable_amount: number;
  gst_percent: number;
  gst_amount: number;
  total: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  shop_id: string;
  supplier_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total: number;
  created_at: string;
  // Joined fields
  product?: Product;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: 'bill' | 'purchase_order' | 'adjustment' | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  // Joined fields
  product?: Product;
  created_by_user?: User;
}

// Cart types for billing
export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  gst_amount: number;
  total: number;
}

export interface Cart {
  items: CartItem[];
  price_type_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  taxable_amount: number;
  gst_amount: number;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: PaymentMethod;
  notes: string | null;
}

// Form types
export interface CreateShopForm {
  name: string;
  name_tamil?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface CreateProductForm {
  category_id?: string;
  brand_id?: string;
  sku?: string;
  barcode?: string;
  name: string;
  name_tamil?: string;
  description?: string;
  mrp: number;
  cost_price: number;
  default_selling_price: number;
  gst_percent: number;
  hsn_code?: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

export interface CreateCategoryForm {
  parent_id?: string;
  name: string;
  name_tamil?: string;
  sort_order?: number;
}

export interface CreateBrandForm {
  name: string;
  name_tamil?: string;
}

export interface CreatePriceTypeForm {
  name: string;
  description?: string;
  is_default: boolean;
}

export interface CreateSupplierForm {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface DashboardStats {
  todaySales: number;
  todayBillCount: number;
  lowStockCount: number;
  totalProducts: number;
  monthSales: number;
  monthBillCount: number;
}

// Shop context
export interface ShopContextType {
  shop: Shop | null;
  userRole: UserRole | null;
  isOwner: boolean;
  isLoading: boolean;
  refetch: () => void;
}
