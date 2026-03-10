-- Rodar este script no Supabase SQL Editor (https://supabase.com/dashboard)
-- Projeto: mffggmvygquumdngthcf

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  tickets INTEGER[] NOT NULL DEFAULT '{}',
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_purchase_history_customer ON purchase_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_campaign ON purchase_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_status ON purchase_history(status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS purchase_history_updated_at ON purchase_history;
CREATE TRIGGER purchase_history_updated_at BEFORE UPDATE ON purchase_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
CREATE POLICY "customers_insert_policy" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "customers_select_by_phone" ON customers;
CREATE POLICY "customers_select_by_phone" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "customers_update_policy" ON customers;
CREATE POLICY "customers_update_policy" ON customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "purchase_insert_policy" ON purchase_history;
CREATE POLICY "purchase_insert_policy" ON purchase_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "purchase_select_policy" ON purchase_history;
CREATE POLICY "purchase_select_policy" ON purchase_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "purchase_update_policy" ON purchase_history;
CREATE POLICY "purchase_update_policy" ON purchase_history FOR UPDATE USING (true);
