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
    is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
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

-- 7b. Attendance (حضور وانصراف الموظفين)
CREATE TYPE attendance_status AS ENUM ('present', 'permission');

CREATE TABLE attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    permission_start TIMESTAMP WITH TIME ZONE,
    permission_end TIMESTAMP WITH TIME ZONE,
    permission_resumed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

-- 7c. Permission Requests (طلبات الإذن — بموافقة الإدارة)
CREATE TABLE permission_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    leave_time TIMESTAMP WITH TIME ZONE,
    duration VARCHAR(20) CHECK (duration IN ('1hour', '2hours', 'rest_of_day')),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;

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

-- Public tracking goes through SECURITY DEFINER RPCs (track_shipment /
-- track_shipment_logs below) so anonymous users can only look up a shipment
-- by its exact waybill number — they cannot list or enumerate shipments.

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

-- Notifications: staff read their relevant ones; drivers only see their own shipments' alerts
DROP POLICY IF EXISTS "notifications_read_all" ON notifications;
CREATE POLICY "notifications_read_all" ON notifications
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
    OR EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = notifications.shipment_id
        AND s.assigned_driver_id = auth.uid()
    )
  );

CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "notifications_update_all" ON notifications;
CREATE POLICY "notifications_update_all" ON notifications
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
    OR EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = notifications.shipment_id
        AND s.assigned_driver_id = auth.uid()
    )
  );

-- Trucks: read all, admin manages
CREATE POLICY "trucks_read_all" ON trucks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "trucks_write_admin" ON trucks
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Shipment logs: read all, insert staff (drivers can log their own shipments)
CREATE POLICY "logs_read_all" ON shipment_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "logs_insert_staff" ON shipment_logs
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager')
  );

CREATE POLICY "logs_insert_driver_assigned" ON shipment_logs
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
    AND EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_id
        AND s.assigned_driver_id = auth.uid()
    )
  );

-- Attendance: each employee manages their own; management roles read all; admin manages all
CREATE POLICY "attendance_select_own" ON attendance
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "attendance_select_staff" ON attendance
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
  );

CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "attendance_insert_staff" ON attendance
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
  );

CREATE POLICY "attendance_update_own" ON attendance
  FOR UPDATE USING (auth.uid() = employee_id);

CREATE POLICY "attendance_update_staff" ON attendance
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
  );

CREATE POLICY "attendance_delete_own" ON attendance
  FOR DELETE USING (auth.uid() = employee_id);

CREATE POLICY "attendance_all_admin" ON attendance
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Permission requests: employees create/cancel their own pending, management reviews
CREATE POLICY "pr_select_own" ON permission_requests
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "pr_select_staff" ON permission_requests
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
  );

DROP POLICY IF EXISTS "pr_insert_own" ON permission_requests;
CREATE POLICY "pr_insert_own" ON permission_requests
  FOR INSERT WITH CHECK (
    auth.uid() = employee_id
    AND leave_time IS NOT NULL
    AND leave_time >= now() + interval '30 minutes'
  );

DROP POLICY IF EXISTS "pr_update_staff" ON permission_requests;
CREATE POLICY "pr_update_staff" ON permission_requests
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor', 'branch_manager', 'accountant')
  );

DROP POLICY IF EXISTS "pr_delete_own_pending" ON permission_requests;
CREATE POLICY "pr_delete_own_pending" ON permission_requests
  FOR DELETE USING (auth.uid() = employee_id AND status = 'pending');

-- Any submitted permission request instantly notifies management.
CREATE OR REPLACE FUNCTION public.notify_permission_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_lt TEXT;
  v_dur TEXT;
BEGIN
  SELECT full_name INTO v_name FROM profiles WHERE id = NEW.employee_id;
  v_lt := CASE WHEN NEW.leave_time IS NULL THEN ''
               ELSE to_char(NEW.leave_time, 'HH24:MI') END;
  v_dur := CASE NEW.duration
             WHEN '1hour' THEN U&'\0633\0627\0639\0629 \0648\0627\062d\062f\0629'
             WHEN '2hours' THEN U&'\0633\0627\0639\062a\0627\0646'
             WHEN 'rest_of_day' THEN U&'\0628\0627\0642\064a \0627\0644\064a\0648\0645'
             ELSE '' END;
  INSERT INTO notifications (title, message, alert_type)
  VALUES (
    U&'\0637\0644\0628 \0625\0630\0646 \062c\062f\064a\062f',
    COALESCE(v_name, U&'\0645\0648\0638\0641') || U&' \064a\0637\0644\0628 \0625\0630\0646 \062e\0631\0648\062c'
      || CASE WHEN v_dur = '' THEN '' ELSE U&' \0028' || v_dur || U&'\0029' END
      || CASE WHEN v_lt = '' THEN '' ELSE U&' \0641\064a ' || v_lt END
      || U&' \0628\062a\0627\0631\064a\062e ' || to_char(NEW.date, 'YYYY-MM-DD'),
    'warning'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_permission_request ON permission_requests;
CREATE TRIGGER trg_notify_permission_request
  AFTER INSERT ON permission_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_permission_request();

-- ============================================================
--  Public tracking (anonymous): SECURITY DEFINER RPCs so users
--  can only fetch a shipment by its exact waybill number.
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_shipment(p_waybill text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'waybill_number', s.waybill_number,
    'client_name', s.client_name,
    'client_phone', s.client_phone,
    'destination_address', s.destination_address,
    'destination_city', s.destination_city,
    'shipping_type', s.shipping_type,
    'status', s.status,
    'agency_id', s.agency_id,
    'assigned_driver_id', s.assigned_driver_id,
    'price', s.price,
    'cod_amount', s.cod_amount,
    'expected_delivery_date', s.expected_delivery_date,
    'created_at', s.created_at,
    'updated_at', s.updated_at,
    'agency', CASE WHEN a.name IS NULL THEN NULL ELSE jsonb_build_object('name', a.name) END,
    'assigned_driver', CASE WHEN p.full_name IS NULL THEN NULL ELSE jsonb_build_object('full_name', p.full_name) END
  ) INTO v
  FROM shipments s
  LEFT JOIN agencies a ON a.id = s.agency_id
  LEFT JOIN profiles p ON p.id = s.assigned_driver_id
  WHERE s.waybill_number = p_waybill
  LIMIT 1;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_shipment_logs(p_waybill text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', l.id,
    'shipment_id', l.shipment_id,
    'status', l.status,
    'location_description', l.location_description,
    'notes', l.notes,
    'created_by', l.created_by,
    'created_at', l.created_at
  ) ORDER BY l.created_at DESC)
  INTO v
  FROM shipment_logs l
  JOIN shipments s ON s.id = l.shipment_id
  WHERE s.waybill_number = p_waybill;
  RETURN v;
END;
$$;

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
