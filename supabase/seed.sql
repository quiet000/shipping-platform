-- ============================================================
--  Seed demo data for the logistics platform
--  Run after schema.sql + trigger-profile.sql
-- ============================================================

-- Set supervisor role + driver license numbers
UPDATE profiles SET role = 'supervisor', license_number = 'SUP-1001' WHERE email = 'mona@example.com';
UPDATE profiles SET license_number = 'DL-55321' WHERE email = 'ahmed@example.com';
UPDATE profiles SET license_number = 'DL-77840' WHERE email = 'mohamed@example.com';
UPDATE profiles SET license_number = 'DL-11920' WHERE email = 'samir@example.com';

-- Agencies with commission rates
INSERT INTO agencies (id, name, contact_person, phone, email, address, commission_percent) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'شركة النيل للشحن', 'خالد عبد الرحمن', '01012345678', 'nile@example.com', 'القاهرة - مدينة نصر', 10.00),
  ('a0000000-0000-4000-8000-000000000002', 'الفرعونية للبريد السريع', 'هالة مراد', '01198765432', 'pharaoh@example.com', 'الجيزة - الدقي', 12.00),
  ('a0000000-0000-4000-8000-000000000003', 'أمواج للتوصيل', 'طارق سليم', '01234567890', 'amwaj@example.com', 'الإسكندرية - سموحة', 8.00)
ON CONFLICT (id) DO NOTHING;

-- Shipments
INSERT INTO shipments (id, waybill_number, client_name, client_phone, destination_address, destination_city, shipping_type, status, agency_id, assigned_driver_id, price, cod_amount, expected_delivery_date, created_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'SHP-849201', 'عمر الشاذلي', '01099988776', 'شارع 9، المعادي', 'القاهرة', 'standard', 'delivered', 'a0000000-0000-4000-8000-000000000001', 'e52bdca0-0fc1-4301-a7df-2fd0685f33c8', 60, 450, CURRENT_DATE - 6, CURRENT_DATE - 6),
  ('b0000000-0000-4000-8000-000000000002', 'SHP-118477', 'سارة محمود', '01122233445', 'شارع جمال عبد الناصر', 'الإسكندرية', 'express', 'in_warehouse', 'a0000000-0000-4000-8000-000000000002', NULL, 120, 0, CURRENT_DATE + 3, CURRENT_DATE - 2),
  ('b0000000-0000-4000-8000-000000000003', 'SHP-203944', 'حسن مصطفى', '01277665544', 'ميدان المحطة', 'طنطا', 'standard', 'out_for_delivery', 'a0000000-0000-4000-8000-000000000001', '02441903-a442-4070-b96f-3535d1ab4bf0', 45, 0, CURRENT_DATE + 1, CURRENT_DATE - 1),
  ('b0000000-0000-4000-8000-000000000004', 'SHP-903311', 'ليلى إبراهيم', '01011122233', 'شارع الحرية', 'المنصورة', 'standard', 'delayed', 'a0000000-0000-4000-8000-000000000003', '8e150269-73b3-4b1e-ac9b-20301565df93', 55, 220, CURRENT_DATE - 1, CURRENT_DATE - 5),
  ('b0000000-0000-4000-8000-000000000005', 'SHP-199005', 'يوسف عادل', '01544455666', 'كمب شيزار', 'الإسكندرية', 'standard', 'returned', 'a0000000-0000-4000-8000-000000000002', 'e52bdca0-0fc1-4301-a7df-2fd0685f33c8', 40, 0, CURRENT_DATE - 4, CURRENT_DATE - 8),
  ('b0000000-0000-4000-8000-000000000006', 'SHP-510023', 'نور الهدى', '01066778899', 'شارع التحرير', 'القاهرة', 'express', 'in_warehouse', 'a0000000-0000-4000-8000-000000000001', NULL, 90, 700, CURRENT_DATE + 5, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Tracking logs
INSERT INTO shipment_logs (shipment_id, status, location_description, notes, created_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'in_warehouse', 'مخزن القاهرة الرئيسي', 'استلام الشحنة وتوثيقها', CURRENT_DATE - 6),
  ('b0000000-0000-4000-8000-000000000001', 'out_for_delivery', 'في الطريق إلى المعادي', 'خرجت شحنة للتسليم', CURRENT_DATE - 5),
  ('b0000000-0000-4000-8000-000000000001', 'delivered', 'المعادي', 'تم التسليم واستلام المبلغ', CURRENT_DATE - 4),
  ('b0000000-0000-4000-8000-000000000002', 'in_warehouse', 'مخزن القاهرة الرئيسي', 'بانتظار التجهيز', CURRENT_DATE - 2),
  ('b0000000-0000-4000-8000-000000000003', 'in_warehouse', 'مخزن القاهرة الرئيسي', 'استلام الشحنة', CURRENT_DATE - 1),
  ('b0000000-0000-4000-8000-000000000003', 'out_for_delivery', 'الطريق الصحراوي', 'في الطريق إلى طنطا', CURRENT_DATE),
  ('b0000000-0000-4000-8000-000000000004', 'in_warehouse', 'مخزن الإسكندرية', 'استلام الشحنة', CURRENT_DATE - 5),
  ('b0000000-0000-4000-8000-000000000004', 'out_for_delivery', 'المنصورة', 'محاولة تسليم غير ناجحة - العنوان غير متاح', CURRENT_DATE - 2),
  ('b0000000-0000-4000-8000-000000000004', 'delayed', 'مخزن المنصورة', 'تأجيل التسليم بناءً على طلب العميل', CURRENT_DATE - 1),
  ('b0000000-0000-4000-8000-000000000005', 'in_warehouse', 'مخزن الإسكندرية', 'استلام الشحنة', CURRENT_DATE - 8),
  ('b0000000-0000-4000-8000-000000000005', 'out_for_delivery', 'كمب شيزار', 'العميل رفض الاستلام', CURRENT_DATE - 6),
  ('b0000000-0000-4000-8000-000000000005', 'returned', 'مخزن الإسكندرية', 'إرجاع الشحنة إلى المخزن', CURRENT_DATE - 5),
  ('b0000000-0000-4000-8000-000000000006', 'in_warehouse', 'مخزن القاهرة الرئيسي', 'استلام الشحنة وتجهيزها', CURRENT_DATE);

-- Notifications
INSERT INTO notifications (shipment_id, title, message, is_read, alert_type, created_at) VALUES
  ('b0000000-0000-4000-8000-000000000004', 'شحنة متأخرة', 'البوليصة SHP-903311 تأخرت عن موعد التسليم المحدد. يرجى التواصل مع الوكيل.', false, 'urgent', CURRENT_DATE),
  ('b0000000-0000-4000-8000-000000000003', 'شحنة في الطريق', 'البوليصة SHP-203944 في الطريق إلى طنطا ومن المتوقع تسليمها خلال يوم.', false, 'warning', CURRENT_DATE);
