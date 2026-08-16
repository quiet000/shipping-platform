export type UserRole = "admin" | "supervisor" | "branch_manager" | "driver" | "accountant";

export type ShipmentStatus =
  | "in_warehouse"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "delayed";

export type ShippingType = "standard" | "express";

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  email: string;
  role: UserRole;
  license_number?: string | null;
  custom_permissions: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  commission_percent?: number | null;
  created_at: string;
}

export interface Truck {
  id: string;
  plate_number: string;
  model_type?: string | null;
  capacity_tons?: number | null;
  driver_id?: string | null;
  status: string;
  created_at: string;
}

export interface Shipment {
  id: string;
  waybill_number: string;
  client_name: string;
  client_phone: string;
  destination_address: string;
  destination_city: string;
  shipping_type: ShippingType;
  status: ShipmentStatus;
  is_fragile?: boolean;
  agency_id?: string | null;
  assigned_driver_id?: string | null;
  price: number;
  cod_amount: number;
  expected_delivery_date: string;
  created_at: string;
  updated_at: string;
  agency?: Pick<Agency, "name"> | null;
  assigned_driver?: Pick<Profile, "full_name"> | null;
}

export interface ShipmentLog {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location_description?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  shipment_id?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  alert_type: "warning" | "info" | "urgent";
  created_at: string;
  shipment?: { waybill_number: string; expected_delivery_date: string } | null;
}

export type AttendanceStatus = "present" | "permission";

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type PermissionStatus = "pending" | "approved" | "rejected";

export type PermissionDuration = "1hour" | "2hours" | "rest_of_day";

export interface PermissionRequest {
  id: string;
  employee_id: string;
  date: string;
  leave_time?: string | null;
  duration?: string | null;
  notes?: string | null;
  status: PermissionStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  employee?: Pick<Profile, "full_name" | "role"> | null;
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  permission: "إذن",
};

export const PERMISSION_LABELS: Record<PermissionStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
};

export const PERMISSION_DURATION_LABELS: Record<PermissionDuration, string> = {
  "1hour": "ساعة واحدة",
  "2hours": "ساعتان",
  rest_of_day: "باقي اليوم",
};

export const PERMISSION_DURATION_OPTIONS: PermissionDuration[] = [
  "1hour",
  "2hours",
  "rest_of_day",
];

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  in_warehouse: "في المخزن",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التسليم",
  returned: "مرتجع",
  delayed: "متأخرة",
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  in_warehouse: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  out_for_delivery: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  returned: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  delayed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

export const STATUS_DOT: Record<ShipmentStatus, string> = {
  in_warehouse: "bg-amber-500",
  out_for_delivery: "bg-sky-500",
  delivered: "bg-green-500",
  returned: "bg-red-500",
  delayed: "bg-amber-500",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مدير",
  supervisor: "مشرف",
  branch_manager: "مدير فرع",
  driver: "سائق / مندوب",
  accountant: "محاسب",
};

export const ROLE_BADGE: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  supervisor: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  branch_manager: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  driver: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  accountant: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
};

export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = {
  standard: "عادي",
  express: "سريع",
};

export const ALERT_STYLES: Record<string, string> = {
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

export const ALERT_ICON_COLORS: Record<string, string> = {
  warning: "text-amber-500",
  urgent: "text-red-500",
  info: "text-sky-500",
};
