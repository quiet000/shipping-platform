-- ============================================================
--  Logistics Platform - Fresh schema migration
--  Drops the app tables (all empty) and recreates the exact
--  schema the app expects. Run AFTER schema.sql if tables
--  were created with an older/different shape.
-- ============================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS shipment_logs CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS trucks CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS shipment_status CASCADE;
DROP TYPE IF EXISTS shipping_type CASCADE;

DROP FUNCTION IF EXISTS generate_sla_alerts CASCADE;
