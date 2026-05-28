# OSCAR LEATHER PRODUCTS ERP - SETUP GUIDE

## Step 1: Run Database SQL
1. Go to https://supabase.com and login
2. Select your project: `zvqkzysnteasdotiftgs`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase-schema.sql`
6. Paste and click **Run** (or Ctrl+Enter)

## Step 2: Create Storage Bucket
1. In Supabase, go to **Storage** (left sidebar)
2. Click **New Bucket**
3. Bucket name: `dispatch-photos`
4. Select **Public bucket**
5. Click **Create bucket**

## Step 3: Run the App
The app is already running at:
- **http://localhost:3000**
- Login password: **oscar2024**

## Step 4: Usage Flow
1. **Enquiries** → Click "New Enquiry" → Fill form → Save
2. **MTP (Move to Production)** → Click MTP button → Fill details → Confirm
3. **Production** → Click stage buttons to advance (Cutting → Attaching → Plate → Embossing → Stitching → Packing → Ready → Shipping)
4. **Copy tracking link** from Production page → Send to customer
5. **Dispatch** → When "Shipping" stage → Enter courier details → Upload photo → Dispatch
6. **Customer** clicks link → Sees order progress (no login needed)