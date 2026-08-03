-- ============================================================
--  Logistics Platform - Supabase Schema (SQL Editor script)
--  Run this in Supabase SQL Editor before using the app.
-- ============================================================

-- 1. Enum types for status & roles
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'branch_manager', 'driver', 'accountant');
CREATE TYPE shipment_status AS ENUM ('in_warehouse', 'out_for_delivery', 'delivered', 'returned', 'delayed');
CREATE TYPE shipping_type AS ENUM ('standard', 'express');

-- 2. Agencies / Partner Companies (الوكالات والشركات المتعاقدة)
CREATE TABLE agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    commission_percent DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Profiles / Staff & Drivers (جدول الموظفين والمناديب وتحديد الصلاحيات)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    license_number VARCHAR(100),
    custom_permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trucks & Vehicles (الشاحنات والمركبات)
CREATE TABLE trucks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    model_type VARCHAR(100),
    capacity_tons DECIMAL(5,2),
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Shipments (الشحنات والطلبات)
CREATE TABLE shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    waybill_number VARCHAR(100) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    shipping_type shipping_type DEFAULT 'standard',
    status shipment_status DEFAULT 'in_warehouse',
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    assigned_driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cod_amount DECIMAL(10,2) DEFAULT 0.00,
    expected_delivery_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Shipment Tracking Logs (سجل المعالجة وحركة الشحنة)
CREATE TABLE shipment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    status shipment_status NOT NULL,
    location_description TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Notifications System (جدول التنبيهات والإنذارات)
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    alert_type VARCHAR(50) DEFAULT 'warning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  RLS Policies
-- ============================================================

-- Profiles: user can read all profiles, update own, admin manages all
CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can create their own profile (needed for Google OAuth sign-in)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can update any profile (roles & permissions management)
CREATE POLICY "profiles_admin_update_all" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_admin_delete" ON profiles
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Shipments: staff can read all, drivers see assigned, admin/supervisor write
CREATE POLICY "shipments_read_all_staff" ON shipments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "shipments_insert_staff" ON shipments
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager')
  );

CREATE POLICY "shipments_update_admin_supervisor" ON shipments
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager')
  );

CREATE POLICY "shipments_delete_admin" ON shipments
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "shipments_update_assigned_driver" ON shipments
  FOR UPDATE USING (
    assigned_driver_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
  );

-- Public tracking: anyone with the waybill number can look up a
-- shipment's status & logs (anonymous, no login required)
CREATE POLICY "shipments_read_public_track" ON shipments
  FOR SELECT USING (true);

CREATE POLICY "logs_read_public_track" ON shipment_logs
  FOR SELECT USING (true);

-- Agencies: read all, admin manages
CREATE POLICY "agencies_read_all" ON agencies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "agencies_insert_admin" ON agencies
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "agencies_update_admin" ON agencies
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "agencies_delete_admin" ON agencies
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Notifications: all staff read, admin creates
CREATE POLICY "notifications_read_all" ON notifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "notifications_update_all" ON notifications
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Trucks: read all, admin manages
CREATE POLICY "trucks_read_all" ON trucks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "trucks_write_admin" ON trucks
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Shipment logs: read all, insert staff
CREATE POLICY "logs_read_all" ON shipment_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "logs_insert_staff" ON shipment_logs
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager')
  );

-- ============================================================
--  Automation: create SLA notifications for shipments with
--  <= 2 days left until expected delivery (or overdue).
--  Run this periodically (pg_cron / external scheduler) OR
--  the app checks on dashboard load.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sla_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notifications (shipment_id, title, message, alert_type)
  SELECT
    s.id,
    'شحنة قاربت على موعد التسليم',
    'البوليصة ' || s.waybill_number || ' متبقّي على موعد تسليمها يومين أو أقل ولم تُسلَّم بعد.',
    CASE
      WHEN s.expected_delivery_date < CURRENT_DATE THEN 'urgent'
      ELSE 'warning'
    END
  FROM shipments s
  WHERE s.status IN ('in_warehouse', 'out_for_delivery', 'delayed')
    AND s.expected_delivery_date <= CURRENT_DATE + INTERVAL '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.shipment_id = s.id
        AND n.alert_type IN ('warning', 'urgent')
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$;

-- Optional: run automatically every 6 hours (enable pg_cron first)
-- SELECT cron.schedule('sla-alerts', '0 */6 * * *', 'SELECT generate_sla_alerts();');
