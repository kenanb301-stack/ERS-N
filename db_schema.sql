
-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products Table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  short_id TEXT UNIQUE,
  part_code TEXT,
  product_name TEXT NOT NULL,
  barcode TEXT,
  unit TEXT,
  current_stock NUMERIC DEFAULT 0,
  min_stock_level NUMERIC,
  max_stock_level NUMERIC,
  location TEXT,
  last_counted_at TIMESTAMPTZ,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  critical_level NUMERIC
);

-- Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT,
  type TEXT,
  quantity NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_by TEXT,
  previous_stock NUMERIC,
  new_stock NUMERIC
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL TO authenticated USING (true);
