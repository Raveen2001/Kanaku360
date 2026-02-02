-- Kanaku360 Database Schema
-- Complete billing application with multi-shop, inventory, and GST support

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'cashier');
CREATE TYPE employee_status AS ENUM ('pending', 'active', 'inactive');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'credit');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial');
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'return');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'ordered', 'partial', 'received', 'cancelled');
CREATE TYPE reference_type AS ENUM ('bill', 'purchase_order', 'adjustment');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shops table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_tamil TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shop employees table
CREATE TABLE shop_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    status employee_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(shop_id, invited_email)
);

-- Categories table (self-referencing for nested categories)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    name_tamil TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Brands table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_tamil TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Price types table
CREATE TABLE price_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    name_tamil TEXT,
    description TEXT,
    mrp DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    default_selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    hsn_code TEXT,
    unit TEXT DEFAULT 'pcs',
    stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(10, 2) NOT NULL DEFAULT 10,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Product prices table (for multiple pricing)
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_type_id UUID NOT NULL REFERENCES price_types(id) ON DELETE CASCADE,
    selling_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(product_id, price_type_id)
);

-- Bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    bill_number TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    price_type_id UUID REFERENCES price_types(id) ON DELETE SET NULL,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    taxable_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    payment_status payment_status NOT NULL DEFAULT 'paid',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(shop_id, bill_number)
);

-- Bill items table
CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_name_tamil TEXT,
    sku TEXT,
    hsn_code TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit TEXT DEFAULT 'pcs',
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    taxable_amount DECIMAL(10, 2) NOT NULL,
    gst_percent DECIMAL(5, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    po_number TEXT NOT NULL,
    status purchase_order_status NOT NULL DEFAULT 'draft',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(shop_id, po_number)
);

-- Purchase order items table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Stock movements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type stock_movement_type NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_before DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2) NOT NULL,
    reference_type reference_type,
    reference_id UUID,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shop_employees_shop ON shop_employees(shop_id);
CREATE INDEX idx_shop_employees_user ON shop_employees(user_id);
CREATE INDEX idx_shop_employees_email ON shop_employees(invited_email);
CREATE INDEX idx_categories_shop ON categories(shop_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_brands_shop ON brands(shop_id);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_product_prices_product ON product_prices(product_id);
CREATE INDEX idx_product_prices_type ON product_prices(price_type_id);
CREATE INDEX idx_bills_shop ON bills(shop_id);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX idx_suppliers_shop ON suppliers(shop_id);
CREATE INDEX idx_purchase_orders_shop ON purchase_orders(shop_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_stock_movements_shop ON stock_movements(shop_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if user is a shop member
CREATE OR REPLACE FUNCTION is_shop_member(p_shop_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.shops WHERE id = p_shop_id AND owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.shop_employees 
        WHERE shop_id = p_shop_id 
        AND user_id = p_user_id 
        AND status = 'active'
    );
END;
$$;

-- Function to get user role in shop
CREATE OR REPLACE FUNCTION get_user_role_in_shop(p_shop_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Check if owner
    IF EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND owner_id = p_user_id) THEN
        RETURN 'admin';
    END IF;
    
    -- Check employee role
    SELECT role::TEXT INTO v_role
    FROM public.shop_employees
    WHERE shop_id = p_shop_id AND user_id = p_user_id AND status = 'active';
    
    RETURN v_role;
END;
$$;

-- Function to check if user is admin in shop
CREATE OR REPLACE FUNCTION is_shop_admin(p_shop_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN get_user_role_in_shop(p_shop_id, p_user_id) = 'admin';
END;
$$;

-- Function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_date TEXT;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM bills
    WHERE shop_id = p_shop_id
    AND DATE(created_at) = CURRENT_DATE;
    
    RETURN 'INV-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_date TEXT;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM purchase_orders
    WHERE shop_id = p_shop_id
    AND DATE(created_at) = CURRENT_DATE;
    
    RETURN 'PO-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Check and activate any pending employee invitations
    UPDATE public.shop_employees
    SET user_id = NEW.id, status = 'active', updated_at = NOW()
    WHERE invited_email = NEW.email AND status = 'pending';
    
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shop_employees_updated_at BEFORE UPDATE ON shop_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_price_types_updated_at BEFORE UPDATE ON price_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_prices_updated_at BEFORE UPDATE ON product_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to ensure only one default price type per shop
CREATE OR REPLACE FUNCTION ensure_single_default_price_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE price_types
        SET is_default = FALSE, updated_at = NOW()
        WHERE shop_id = NEW.shop_id AND id != NEW.id AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_price_type_trigger
    BEFORE INSERT OR UPDATE ON price_types
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_price_type();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Shops policies
CREATE POLICY "Users can view shops they own or work at"
    ON shops FOR SELECT
    USING (is_shop_member(id, auth.uid()));

CREATE POLICY "Users can create shops"
    ON shops FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shop owners can update their shops"
    ON shops FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Shop owners can delete their shops"
    ON shops FOR DELETE
    USING (owner_id = auth.uid());

-- Shop employees policies
CREATE POLICY "Shop members can view employees"
    ON shop_employees FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage employees"
    ON shop_employees FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update employees"
    ON shop_employees FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete employees"
    ON shop_employees FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Categories policies
CREATE POLICY "Shop members can view categories"
    ON categories FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage categories"
    ON categories FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update categories"
    ON categories FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete categories"
    ON categories FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Brands policies
CREATE POLICY "Shop members can view brands"
    ON brands FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage brands"
    ON brands FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update brands"
    ON brands FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete brands"
    ON brands FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Price types policies
CREATE POLICY "Shop members can view price types"
    ON price_types FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage price types"
    ON price_types FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update price types"
    ON price_types FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete price types"
    ON price_types FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Products policies
CREATE POLICY "Shop members can view products"
    ON products FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage products"
    ON products FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update products"
    ON products FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete products"
    ON products FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Product prices policies
CREATE POLICY "Shop members can view product prices"
    ON product_prices FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = product_prices.product_id 
        AND is_shop_member(p.shop_id, auth.uid())
    ));

CREATE POLICY "Shop admins can manage product prices"
    ON product_prices FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = product_prices.product_id 
        AND is_shop_admin(p.shop_id, auth.uid())
    ));

CREATE POLICY "Shop admins can update product prices"
    ON product_prices FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = product_prices.product_id 
        AND is_shop_admin(p.shop_id, auth.uid())
    ));

CREATE POLICY "Shop admins can delete product prices"
    ON product_prices FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = product_prices.product_id 
        AND is_shop_admin(p.shop_id, auth.uid())
    ));

-- Bills policies
CREATE POLICY "Shop members can view bills"
    ON bills FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop members can create bills"
    ON bills FOR INSERT
    WITH CHECK (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update bills"
    ON bills FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Bill items policies
CREATE POLICY "Shop members can view bill items"
    ON bill_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bills b 
        WHERE b.id = bill_items.bill_id 
        AND is_shop_member(b.shop_id, auth.uid())
    ));

CREATE POLICY "Shop members can create bill items"
    ON bill_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM bills b 
        WHERE b.id = bill_items.bill_id 
        AND is_shop_member(b.shop_id, auth.uid())
    ));

-- Suppliers policies
CREATE POLICY "Shop members can view suppliers"
    ON suppliers FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage suppliers"
    ON suppliers FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update suppliers"
    ON suppliers FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete suppliers"
    ON suppliers FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Purchase orders policies
CREATE POLICY "Shop members can view purchase orders"
    ON purchase_orders FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop admins can manage purchase orders"
    ON purchase_orders FOR INSERT
    WITH CHECK (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can update purchase orders"
    ON purchase_orders FOR UPDATE
    USING (is_shop_admin(shop_id, auth.uid()));

CREATE POLICY "Shop admins can delete purchase orders"
    ON purchase_orders FOR DELETE
    USING (is_shop_admin(shop_id, auth.uid()));

-- Purchase order items policies
CREATE POLICY "Shop members can view purchase order items"
    ON purchase_order_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.id = purchase_order_items.purchase_order_id 
        AND is_shop_member(po.shop_id, auth.uid())
    ));

CREATE POLICY "Shop admins can manage purchase order items"
    ON purchase_order_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.id = purchase_order_items.purchase_order_id 
        AND is_shop_admin(po.shop_id, auth.uid())
    ));

CREATE POLICY "Shop admins can update purchase order items"
    ON purchase_order_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.id = purchase_order_items.purchase_order_id 
        AND is_shop_admin(po.shop_id, auth.uid())
    ));

-- Stock movements policies
CREATE POLICY "Shop members can view stock movements"
    ON stock_movements FOR SELECT
    USING (is_shop_member(shop_id, auth.uid()));

CREATE POLICY "Shop members can create stock movements"
    ON stock_movements FOR INSERT
    WITH CHECK (is_shop_member(shop_id, auth.uid()));

-- ============================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================
-- Note: Storage bucket creation typically needs to be done via Supabase dashboard
-- or using the Supabase admin API. Here's the SQL for reference:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('shop-assets', 'shop-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brand-images', 'brand-images', true);

-- Storage policies would be:
-- CREATE POLICY "Shop members can upload shop assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-assets' AND ...);
