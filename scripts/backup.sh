#!/bin/bash
# Oscar Leather ERP - Database Backup Script
# Usage: SUPABASE_URL="https://xxx.supabase.co" SUPABASE_KEY="service_key" ./scripts/backup.sh

set -e

BACKUP_DATE=$(date +'%Y-%m-%d')
BACKUP_DIR="backups/$BACKUP_DATE"

mkdir -p "$BACKUP_DIR"

echo "Backing up enquiries..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/enquiries?select=*" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Accept: text/csv" \
  -o "${BACKUP_DIR}/enquiries.csv"

echo "Backing up productions..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/productions?select=*" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Accept: text/csv" \
  -o "${BACKUP_DIR}/productions.csv"

echo "Backing up dispatch..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/dispatch?select=*" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Accept: text/csv" \
  -o "${BACKUP_DIR}/dispatch.csv"

echo "Writing schema.sql..."
cat > "${BACKUP_DIR}/schema.sql" << HEREDOC
-- Oscar Leather ERP - Schema Backup
-- Date: ${BACKUP_DATE}

CREATE TABLE IF NOT EXISTS enquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_from TEXT NOT NULL DEFAULT 'direct',
  enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  location TEXT, state TEXT, contact TEXT, mobile TEXT,
  quotation BOOLEAN DEFAULT false, dtp BOOLEAN DEFAULT false,
  stage TEXT DEFAULT 'enquiry', notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enquiry_id BIGINT,
  model TEXT, quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0,
  extra_charge DECIMAL(10,2) DEFAULT 0,
  gst_percentage DECIMAL(5,2) DEFAULT 0, gst_amount DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0, advance DECIMAL(10,2) DEFAULT 0,
  claim DECIMAL(10,2) DEFAULT 0, balance DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'cutting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatch (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  production_id BIGINT, enquiry_id BIGINT,
  courier_name TEXT, tracking_id TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
HEREDOC

echo ""
echo "=== Backup Complete ==="
echo "Date: ${BACKUP_DATE}"
echo "Location: ${BACKUP_DIR}"
echo "Files:"
ls -lh "${BACKUP_DIR}/"
echo ""

# Print row counts
for f in "${BACKUP_DIR}"/*.csv; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    echo "  $(basename "$f"): ${lines} rows"
  fi
done