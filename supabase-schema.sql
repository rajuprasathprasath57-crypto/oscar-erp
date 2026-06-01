-- Run this ENTIRE SQL in Supabase SQL Editor to reset sequences
-- This will make new entries start from ID #1
ALTER SEQUENCE enquiries_id_seq RESTART WITH 1;
ALTER SEQUENCE productions_id_seq RESTART WITH 1;
ALTER SEQUENCE dispatch_id_seq RESTART WITH 1;

-- Also delete any remaining data just in case
DELETE FROM dispatch;
DELETE FROM productions;
DELETE FROM enquiries;