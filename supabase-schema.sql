-- ===== RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR =====
-- This DROPS and RECREATES the dispatch table with all columns + functions

-- ===== DROP AND RECREATE DISPATCH TABLE (fixes all column issues) =====
DROP TABLE IF EXISTS dispatch CASCADE;

CREATE TABLE dispatch (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  production_id BIGINT,
  enquiry_id BIGINT,
  courier_name TEXT,
  tracking_id TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ADD MISSING COLUMNS TO ENQUIRIES =====
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS quotation BOOLEAN DEFAULT false;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS dtp BOOLEAN DEFAULT false;

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE dispatch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on dispatch" ON dispatch;
CREATE POLICY "Allow all on dispatch" ON dispatch FOR ALL USING (true) WITH CHECK (true);

-- ===== FUNCTION: create_dispatch =====
CREATE OR REPLACE FUNCTION create_dispatch(
  p_production_id BIGINT, p_enquiry_id BIGINT,
  p_courier_name TEXT, p_tracking_id TEXT, p_photo_urls TEXT[] DEFAULT '{}'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSONB;
BEGIN
  INSERT INTO dispatch (production_id, enquiry_id, courier_name, tracking_id, photo_urls)
  VALUES (p_production_id, p_enquiry_id, p_courier_name, p_tracking_id, p_photo_urls)
  RETURNING to_jsonb(dispatch.*) INTO result;
  RETURN result;
END;
$$;