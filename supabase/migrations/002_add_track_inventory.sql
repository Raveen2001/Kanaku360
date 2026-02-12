-- Add track_inventory column to products table
-- This column determines whether inventory/stock should be tracked for a product

ALTER TABLE products
ADD COLUMN track_inventory BOOLEAN DEFAULT TRUE;

-- Update existing products to have track_inventory enabled by default
UPDATE products SET track_inventory = TRUE WHERE track_inventory IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.track_inventory IS 'Whether to track stock/inventory for this product';
