"use client";

import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  PERMISSION_DURATION_LABELS,
  type Agency,
  type Attendance,
  type AttendanceStatus,
  type Notification,
  type PermissionDuration,
  type PermissionRequest,
  type PermissionStatus,
  type Profile,
  type Shipment,
  type ShipmentLog,
  type ShipmentStatus,
  type ShippingType,
  type Truck,
  type UserRole,
} from "@/lib/types";
import {
  mockAgencies,
  mockDrivers,
  mockLogs,
  mockNotifications,
  mockShipments,
  mockTrucks,
} from "@/lib/data/mock";
import { daysFromNow } from "@/lib/utils";

export type ShipmentInput = {
  waybill_number?: string;
  client_name: string;
  client_phone: string;
  destination_address: string;
  destination_city: string;
  shipping_type?: ShippingType;
  status?: ShipmentStatus;
  is_fragile?: boolean;
  agency_id?: string;
  assigned_driver_id?: string;
  price?: number;
  cod_amount?: number;
  expected_delivery_date: string;
};

export type AgencyInput = {
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  commission_percent?: number;
};

export type ProfileInput = {
  full_name: string;
  phone?: string;
  email: string;
  role: UserRole;
  license_number?: string;
  is_active?: boolean;
  custom_permissions?: Record<string, unknown>;
};

export type TruckInput = {
  plate_number: string;
  model_type?: string;
  capacity_tons?: number;
  driver_id?: string | null;
  status?: string;
};

const db = () => createClient();

async function getSessionToken(): Promise<string | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

// ---------------- Shipments ----------------

export async function getShipments(driverId?: string): Promise<Shipment[]> {
  if (!hasSupabaseEnv) {
    return driverId
      ? mockShipments.filter((s) => s.assigned_driver_id === driverId)
      : [...mockShipments];
  }
  let query = db()
    .from("shipments")
    .select(
      "*, agency:agencies(name), assigned_driver:profiles!shipments_assigned_driver_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false });
  if (driverId) query = query.eq("assigned_driver_id", driverId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Shipment[];
}

export async function getShipment(id: string): Promise<Shipment | null> {
  if (!hasSupabaseEnv)
    return mockShipments.find((s) => s.id === id) ?? null;
  const { data, error } = await db()
    .from("shipments")
    .select("*, agency:agencies(name), assigned_driver:profiles(full_name)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Shipment;
}

export async function trackShipment(waybill: string): Promise<{
  shipment: Shipment;
  logs: ShipmentLog[];
} | null> {
  const q = waybill.trim();
  if (!hasSupabaseEnv) {
    const shipment = mockShipments.find(
      (s) => s.waybill_number.toLowerCase() === q.toLowerCase()
    );
    if (!shipment) return null;
    return { shipment, logs: mockLogs[shipment.id] ?? [] };
  }
  const { data: shipment, error } = await db().rpc("track_shipment", {
    p_waybill: q,
  });
  if (error) throw new Error(error.message);
  if (!shipment) return null;
  const { data: logs } = await db().rpc("track_shipment_logs", {
    p_waybill: q,
  });
  return {
    shipment: shipment as Shipment,
    logs: (logs as ShipmentLog[]) ?? [],
  };
}

export async function getShipmentLogs(shipmentId: string): Promise<ShipmentLog[]> {
  if (!hasSupabaseEnv) return mockLogs[shipmentId] ?? [];
  const { data, error } = await db()
    .from("shipment_logs")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ShipmentLog[];
}

function ensureWaybill(v?: string): string {
  return v?.trim() || `SHP-${Math.floor(100000 + Math.random() * 900000)}`;
}

function ensureDeliveryDate(v?: string): string {
  return v?.trim() || daysFromNow(3);
}

function ensureStatus(v?: ShipmentStatus): ShipmentStatus {
  return v || "in_warehouse";
}

export async function createShipment(input: ShipmentInput): Promise<Shipment> {
  const waybill_number = ensureWaybill(input.waybill_number);
  const expected_delivery_date = ensureDeliveryDate(input.expected_delivery_date);
  const status = ensureStatus(input.status);

  if (!hasSupabaseEnv) {
    const s: Shipment = {
      id: `shp-${Math.random().toString(36).slice(2, 8)}`,
      waybill_number,
      client_name: input.client_name,
      client_phone: input.client_phone,
      destination_address: input.destination_address,
      destination_city: input.destination_city,
      shipping_type: input.shipping_type ?? "standard",
      status,
      is_fragile: input.is_fragile ?? false,
      agency_id: input.agency_id ?? null,
      assigned_driver_id: input.assigned_driver_id ?? null,
      price: input.price ?? 0,
      cod_amount: input.cod_amount ?? 0,
      expected_delivery_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agency: mockAgencies.find((a) => a.id === input.agency_id) ?? null,
      assigned_driver: mockDrivers.find((d) => d.id === input.assigned_driver_id) ?? null,
    };
    mockShipments.unshift(s);
    return s;
  }

  const payload: Record<string, unknown> = {
    waybill_number,
    client_name: input.client_name,
    client_phone: input.client_phone,
    destination_address: input.destination_address,
    destination_city: input.destination_city,
    shipping_type: input.shipping_type ?? "standard",
    status,
    is_fragile: input.is_fragile ?? false,
    agency_id: input.agency_id ?? null,
    assigned_driver_id: input.assigned_driver_id ?? null,
    price: input.price ?? 0,
    cod_amount: input.cod_amount ?? 0,
    expected_delivery_date,
  };
  const { data, error } = await db()
    .from("shipments")
    .insert(payload)
    .select(
      "*, agency:agencies(name), assigned_driver:profiles(full_name)"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as Shipment;
}

export async function createShipmentsBulk(inputs: ShipmentInput[]): Promise<number> {
  if (!hasSupabaseEnv) {
    inputs.forEach((i) => createShipment(i));
    return inputs.length;
  }
  const payload = inputs.map((i) => ({
    waybill_number: ensureWaybill(i.waybill_number),
    client_name: i.client_name,
    client_phone: i.client_phone,
    destination_address: i.destination_address,
    destination_city: i.destination_city,
    shipping_type: i.shipping_type ?? "standard",
    status: ensureStatus(i.status),
    is_fragile: i.is_fragile ?? false,
    agency_id: i.agency_id ?? null,
    assigned_driver_id: i.assigned_driver_id ?? null,
    price: i.price ?? 0,
    cod_amount: i.cod_amount ?? 0,
    expected_delivery_date: ensureDeliveryDate(i.expected_delivery_date),
  }));
  const { error } = await db().from("shipments").insert(payload);
  if (error) throw new Error(error.message);
  return payload.length;
}

export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
  notes?: string,
  createdBy?: string
): Promise<void> {
  if (!hasSupabaseEnv) {
    const s = mockShipments.find((x) => x.id === id);
    if (s) {
      s.status = status;
      s.updated_at = new Date().toISOString();
      mockLogs[id] = [
        {
          id: `${id}-l${Date.now()}`,
          shipment_id: id,
          status,
          location_description: s.destination_city,
          notes: notes ?? "تم تحديث الحالة",
          created_by: createdBy ?? null,
          created_at: new Date().toISOString(),
        },
        ...(mockLogs[id] ?? []),
      ];
    }
    return;
  }
  const { error } = await db()
    .from("shipments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await db().from("shipment_logs").insert({
    shipment_id: id,
    status,
    notes: notes ?? "تم تحديث الحالة",
    created_by: createdBy ?? null,
  });
}

export async function updateShipment(id: string, patch: Partial<Shipment>): Promise<void> {
  if (!hasSupabaseEnv) {
    const s = mockShipments.find((x) => x.id === id);
    if (s) Object.assign(s, patch, { updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await db()
    .from("shipments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteShipment(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const i = mockShipments.findIndex((x) => x.id === id);
    if (i >= 0) mockShipments.splice(i, 1);
    return;
  }
  const { error } = await db().from("shipments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------- Analytics ----------------

export type StatsRange = "month" | "3months" | "year" | "all";

function statsCutoff(range: StatsRange): number | null {
  const now = new Date();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (range === "3months") return now.setMonth(now.getMonth() - 3);
  if (range === "year") return now.setFullYear(now.getFullYear() - 1);
  return null;
}

export async function getDashboardStats(range: StatsRange = "all", driverId?: string) {
  const shipments = await getShipments(driverId);
  const cutoff = statsCutoff(range);
  const inRange = cutoff
    ? shipments.filter((s) => new Date(s.created_at).getTime() >= cutoff)
    : shipments;
  const total = inRange.length;
  const delivered = inRange.filter((s) => s.status === "delivered");
  const pending = inRange.filter(
    (s) => !["delivered", "returned"].includes(s.status)
  );
  const revenue = delivered.reduce(
    (acc, s) => acc + (s.cod_amount || 0) + (s.price || 0),
    0
  );
  const drivers = await getDrivers();
  const trucks = await getTrucks();
  return {
    total,
    delivered: delivered.length,
    pending: pending.length,
    returned: inRange.filter((s) => s.status === "returned").length,
    outForDelivery: inRange.filter((s) => s.status === "out_for_delivery").length,
    activeDrivers: drivers.filter((d) => d.is_active).length,
    totalTrucks: trucks.length,
    revenue,
  };
}

export async function getDeliveryTrend(driverId?: string) {
  const shipments = await getShipments(driverId);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return last7.map((day) => {
    const key = day.toISOString().slice(0, 10);
    const dayShipments = shipments.filter(
      (s) => s.created_at.slice(0, 10) === key
    );
    return {
      date: key,
      delivered: dayShipments.filter((s) => s.status === "delivered").length,
      created: dayShipments.length,
    };
  });
}

export async function getAgencyBreakdown(driverId?: string) {
  const agencies = await getAgencies();
  const shipments = await getShipments(driverId);
  return agencies.map((a) => {
    const list = shipments.filter((s) => s.agency_id === a.id);
    return {
      name: a.name,
      total: list.length,
      delivered: list.filter((s) => s.status === "delivered").length,
    };
  });
}

// ---------------- Employee Performance ----------------

export type EmployeePerformanceRow = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  total: number;
  delivered: number;
  returned: number;
  pending: number;
  expected_revenue: number;
  collected_revenue: number;
  lost_revenue: number;
  days_worked: number;
};

export async function getEmployeePerformance(): Promise<EmployeePerformanceRow[]> {
  const profiles = (await getProfiles()).filter((p) => p.role !== "admin");
  const shipments = await getShipments();

  let logs: { created_by: string | null; created_at: string }[] = [];
  if (!hasSupabaseEnv) {
    logs = Object.values(mockLogs)
      .flat()
      .map((l) => ({ created_by: l.created_by ?? null, created_at: l.created_at }));
  } else {
    const { data, error } = await db()
      .from("shipment_logs")
      .select("created_by, created_at")
      .limit(5000);
    if (error) throw new Error(error.message);
    logs = (data ?? []) as { created_by: string | null; created_at: string }[];
  }

  const revenue = (list: Shipment[]) =>
    list.reduce((acc, s) => acc + (s.price || 0) + (s.cod_amount || 0), 0);

  const rows: EmployeePerformanceRow[] = profiles.map((p) => {
    const assigned = shipments.filter((s) => s.assigned_driver_id === p.id);
    const delivered = assigned.filter((s) => s.status === "delivered");
    const returned = assigned.filter((s) => s.status === "returned");
    const days = new Set(
      logs.filter((l) => l.created_by === p.id).map((l) => l.created_at.slice(0, 10))
    ).size;
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      is_active: p.is_active,
      total: assigned.length,
      delivered: delivered.length,
      returned: returned.length,
      pending: assigned.length - delivered.length - returned.length,
      expected_revenue: revenue(assigned),
      collected_revenue: revenue(delivered),
      lost_revenue: revenue(returned),
      days_worked: days,
    };
  });

  return rows.sort(
    (a, b) => b.collected_revenue - a.collected_revenue || b.total - a.total
  );
}

// ---------------- Agencies ----------------

export async function getAgencies(): Promise<Agency[]> {
  if (!hasSupabaseEnv) return [...mockAgencies];
  const { data, error } = await db().from("agencies").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data as Agency[];
}

export async function createAgency(input: AgencyInput): Promise<Agency> {
  if (!hasSupabaseEnv) {
    const a: Agency = {
      id: `ag-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      created_at: new Date().toISOString(),
    };
    mockAgencies.push(a);
    return a;
  }
  const { data, error } = await db().from("agencies").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Agency;
}

export async function updateAgency(id: string, input: Partial<AgencyInput>): Promise<void> {
  if (!hasSupabaseEnv) {
    const a = mockAgencies.find((x) => x.id === id);
    if (a) Object.assign(a, input);
    return;
  }
  const { error } = await db().from("agencies").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAgency(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const i = mockAgencies.findIndex((x) => x.id === id);
    if (i >= 0) mockAgencies.splice(i, 1);
    return;
  }
  const { error } = await db().from("agencies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAgencyStats(id: string) {
  const shipments = (await getShipments()).filter((s) => s.agency_id === id);
  const delivered = shipments.filter((s) => s.status === "delivered");
  const pending = shipments.filter((s) => !["delivered", "returned"].includes(s.status));
  const totalValue = shipments.reduce((acc, s) => acc + (s.price || 0), 0);
  const collected = delivered.reduce((acc, s) => acc + (s.cod_amount || 0), 0);
  const pendingValue = pending.reduce((acc, s) => acc + (s.cod_amount || 0), 0);
  const revenueBase = delivered.reduce(
    (acc, s) => acc + (s.price || 0) + (s.cod_amount || 0),
    0
  );
  const agencies = await getAgencies();
  const agency = agencies.find((a) => a.id === id);
  const commissionPercent = agency?.commission_percent ?? 10;
  const commission = (revenueBase * commissionPercent) / 100;
  return {
    total: shipments.length,
    delivered: delivered.length,
    pending: pending.length,
    returned: shipments.filter((s) => s.status === "returned").length,
    totalValue,
    collected,
    pendingValue,
    commissionPercent,
    commission,
  };
}

// ---------------- Profiles / Drivers / RBAC ----------------

export async function getProfiles(): Promise<Profile[]> {
  if (!hasSupabaseEnv) {
    return [mockAdminProfile, ...mockDrivers];
  }
  const { data, error } = await db().from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data as Profile[];
}

export async function getDrivers(): Promise<Profile[]> {
  const profiles = await getProfiles();
  return profiles.filter((p) => p.role === "driver");
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  if (!hasSupabaseEnv) {
    const p: Profile = {
      id: `drv-${Math.random().toString(36).slice(2, 8)}`,
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email,
      role: input.role,
      license_number: input.license_number ?? null,
      custom_permissions: input.custom_permissions ?? {},
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    mockDrivers.push(p);
    return p;
  }
  const { data, error } = await db().from("profiles").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function adminCreateUser(input: ProfileInput & { password?: string }): Promise<Profile> {
  if (!hasSupabaseEnv) {
    return createProfile(input);
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/users", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "تعذّر إنشاء حساب الموظف");
  return json as Profile;
}

export async function updateProfile(id: string, input: Partial<ProfileInput>): Promise<void> {
  if (!hasSupabaseEnv) {
    const p = mockDrivers.find((x) => x.id === id) ?? mockAdminProfile;
    Object.assign(p, input);
    return;
  }
  const { error } = await db().from("profiles").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function changePassword(current: string, next: string): Promise<void> {
  if (!hasSupabaseEnv) throw new Error("غير متاح في وضع العرض التجريبي");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("تعذر الوصول إلى حسابك");
  const { error: signinError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signinError) throw new Error("كلمة المرور الحالية غير صحيحة");
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

export async function adminResetPassword(id: string, password: string): Promise<void> {
  if (!hasSupabaseEnv) throw new Error("غير متاح في وضع العرض التجريبي");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/users/reset-password", {
    method: "POST",
    headers,
    body: JSON.stringify({ id, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "تعذّر إعادة تعيين كلمة المرور");
}

export async function deleteProfile(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const i = mockDrivers.findIndex((x) => x.id === id);
    if (i >= 0) mockDrivers.splice(i, 1);
    return;
  }
  const { error } = await db().from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const mockAdminProfile: Profile = {
  id: "admin-local",
  full_name: "مدير النظام",
  phone: "01000000000",
  email: "admin@example.com",
  role: "admin",
  license_number: null,
  custom_permissions: {},
  is_active: true,
  created_at: new Date().toISOString(),
};

export function getMockAdmin() {
  return mockAdminProfile;
}

// ---------------- Trucks ----------------

export async function getTrucks(): Promise<Truck[]> {
  if (!hasSupabaseEnv) return [...mockTrucks];
  const { data, error } = await db().from("trucks").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data as Truck[];
}

export async function createTruck(input: TruckInput): Promise<Truck> {
  if (!hasSupabaseEnv) {
    const t: Truck = {
      id: `trk-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      driver_id: input.driver_id ?? null,
      model_type: input.model_type ?? null,
      capacity_tons: input.capacity_tons ?? null,
      status: input.status ?? "active",
      created_at: new Date().toISOString(),
    };
    mockTrucks.push(t);
    return t;
  }
  const { data, error } = await db().from("trucks").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Truck;
}

export async function updateTruck(id: string, input: Partial<TruckInput>): Promise<void> {
  if (!hasSupabaseEnv) {
    const t = mockTrucks.find((x) => x.id === id);
    if (t) Object.assign(t, input);
    return;
  }
  const { error } = await db().from("trucks").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTruck(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const i = mockTrucks.findIndex((x) => x.id === id);
    if (i >= 0) mockTrucks.splice(i, 1);
    return;
  }
  const { error } = await db().from("trucks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------- Notifications ----------------

export async function getNotifications(driverId?: string): Promise<Notification[]> {
  if (!hasSupabaseEnv) {
    let list = [...mockNotifications];
    if (driverId) {
      const mine = new Set(
        mockShipments.filter((s) => s.assigned_driver_id === driverId).map((s) => s.id)
      );
      list = list.filter((n) => n.shipment_id && mine.has(n.shipment_id));
    }
    return list;
  }
  if (driverId) {
    const { data, error } = await db()
      .from("notifications")
      .select("*, shipment:shipments!inner(waybill_number, expected_delivery_date)")
      .eq("shipment.assigned_driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data as Notification[];
  }
  const { data, error } = await db()
    .from("notifications")
    .select("*, shipment:shipments(waybill_number, expected_delivery_date)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!hasSupabaseEnv) {
    const n = mockNotifications.find((x) => x.id === id);
    if (n) n.is_read = true;
    return;
  }
  await db().from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead(driverId?: string): Promise<void> {
  if (!hasSupabaseEnv) {
    let list = [...mockNotifications];
    if (driverId) {
      const mine = new Set(
        mockShipments.filter((s) => s.assigned_driver_id === driverId).map((s) => s.id)
      );
      list = list.filter((n) => n.shipment_id && mine.has(n.shipment_id));
    }
    list.forEach((n) => (n.is_read = true));
    return;
  }
  if (driverId) {
    const mine = await getShipments(driverId);
    const ids = mine.map((s) => s.id);
    if (ids.length === 0) return;
    const { error } = await db()
      .from("notifications")
      .update({ is_read: true })
      .in("shipment_id", ids)
      .neq("is_read", true);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db().from("notifications").update({ is_read: true }).neq("is_read", true);
  if (error) throw new Error(error.message);
}

export async function generateSlaAlerts(): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { error } = await db().rpc("generate_sla_alerts");
  if (error) throw new Error(error.message);
  return 1;
}

// ---------------- Attendance ----------------

export async function getAttendance(month: string, employeeId?: string): Promise<Attendance[]> {
  const start = `${month}-01`;
  const end = `${month}-31`;
  if (!hasSupabaseEnv) return [];
  let q = db()
    .from("attendance")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Attendance[];
}

export async function getAttendanceToday(employeeId: string): Promise<Attendance | null> {
  const today = daysFromNow(0);
  if (!hasSupabaseEnv) return null;
  const { data, error } = await db()
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("date", today)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Attendance) ?? null;
}

export async function markAttendance(
  employeeId: string,
  status: AttendanceStatus,
  action: "check_in" | "check_out"
): Promise<void> {
  const today = daysFromNow(0);
  const now = new Date().toISOString();
  if (!hasSupabaseEnv) return;
  const existing = await getAttendanceToday(employeeId);
  if (!existing) {
    const { error } = await db().from("attendance").insert({
      employee_id: employeeId,
      date: today,
      status,
      check_in: now,
      ...(action === "check_out" ? { check_out: now } : {}),
    });
    if (error) throw new Error(error.message);
    return;
  }
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (action === "check_in" && !existing.check_in) patch.check_in = now;
  if (action === "check_out") patch.check_out = now;
  const { error } = await db().from("attendance").update(patch).eq("id", existing.id);
  if (error) throw new Error(error.message);
}

export type AttendanceReportRow = {
  employee_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  present_days: number;
  permission_days: number;
  total_days: number;
  total_hours: number;
  avg_check_in: string | null;
};

export function workedHours(att: Attendance): number {
  if (!att.check_in) return 0;
  if (att.permission_start) {
    let total = Math.max(
      0,
      (new Date(att.permission_start).getTime() - new Date(att.check_in).getTime()) / 3600000
    );
    if (att.permission_resumed_at && att.check_out) {
      total += Math.max(
        0,
        (new Date(att.check_out).getTime() - new Date(att.permission_resumed_at).getTime()) / 3600000
      );
    }
    return total;
  }
  if (!att.check_out) return 0;
  return Math.max(
    0,
    (new Date(att.check_out).getTime() - new Date(att.check_in).getTime()) / 3600000
  );
}

export async function getAttendanceReport(month: string): Promise<AttendanceReportRow[]> {
  const records = await getAttendance(month);
  const profiles = (await getProfiles()).filter((p) => p.role !== "admin");
  return profiles
    .map((p) => {
      const mine = records.filter((a) => a.employee_id === p.id);
      const withTimes = mine.filter((a) => a.check_in);
      const avgIn =
        withTimes.length > 0
          ? withTimes.reduce((s, a) => s + new Date(a.check_in!).getTime(), 0) / withTimes.length
          : null;
      return {
        employee_id: p.id,
        full_name: p.full_name,
        role: p.role,
        is_active: p.is_active,
        present_days: mine.filter((a) => a.status === "present").length,
        permission_days: mine.filter((a) => a.status === "permission").length,
        total_days: mine.length,
        total_hours: mine.reduce((acc, a) => acc + workedHours(a), 0),
        avg_check_in: avgIn
          ? new Intl.DateTimeFormat("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(avgIn))
          : null,
      };
    })
    .sort((a, b) => b.total_days - a.total_days || b.total_hours - a.total_hours);
}

// ---------------- Permission Requests ----------------

export type PermissionInput = {
  employee_id: string;
  date: string;
  leave_time: string;
  duration: string;
  notes?: string;
};

export async function requestPermission(input: PermissionInput): Promise<void> {
  if (!hasSupabaseEnv) return;
  const { error } = await db().from("permission_requests").insert(input);
  if (error) throw new Error(error.message);
}

export async function getPermissionRequests(
  month?: string,
  employeeId?: string
): Promise<PermissionRequest[]> {
  if (!hasSupabaseEnv) return [];
  let q = db()
    .from("permission_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as PermissionRequest[];
}

export async function getPendingPermissionRequests(): Promise<PermissionRequest[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await db()
    .from("permission_requests")
    .select("*, employee:profiles!permission_requests_employee_id_fkey(full_name, role)")
    .eq("status", "pending")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return data as PermissionRequest[];
}

export async function reviewPermissionRequest(
  id: string,
  status: PermissionStatus
): Promise<void> {
  if (!hasSupabaseEnv) return;
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const reviewerId = session?.user.id ?? null;
  const now = new Date().toISOString();
  const { error } = await db()
    .from("permission_requests")
    .update({ status, reviewed_by: reviewerId, reviewed_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (status !== "approved") return;
  const { data: req, error: reqErr } = await db()
    .from("permission_requests")
    .select("employee_id, date, leave_time, duration")
    .eq("id", id)
    .single();
  if (reqErr || !req) return;
  const permissionStart = req.leave_time ?? now;
  const durMs =
    req.duration === "1hour" ? 3600000 : req.duration === "2hours" ? 7200000 : null;
  const permissionEnd = durMs
    ? new Date(new Date(permissionStart).getTime() + durMs).toISOString()
    : null;
  const { data: existing } = await db()
    .from("attendance")
    .select("*")
    .eq("employee_id", req.employee_id)
    .eq("date", req.date)
    .maybeSingle();
  if (existing) {
    await db()
      .from("attendance")
      .update({
        status: "permission",
        permission_start: permissionStart,
        permission_end: permissionEnd,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await db()
      .from("attendance")
      .insert({
        employee_id: req.employee_id,
        date: req.date,
        status: "permission",
        permission_start: permissionStart,
        permission_end: permissionEnd,
      });
  }
}

export async function resumeAttendance(employeeId: string): Promise<void> {
  if (!hasSupabaseEnv) return;
  const existing = await getAttendanceToday(employeeId);
  if (!existing || !existing.permission_start || existing.permission_resumed_at) {
    throw new Error("لا يوجد إذن نشط لاستئناف الحضور");
  }
  if (!existing.permission_end) {
    throw new Error("إذن اليوم الكامل لا يتطلب استئناف حضور");
  }
  if (new Date(existing.permission_end).getTime() > Date.now()) {
    throw new Error("لم تنتهِ مدة الإذن بعد");
  }
  const now = new Date().toISOString();
  const { error } = await db()
    .from("attendance")
    .update({ status: "present", permission_resumed_at: now, updated_at: now })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
}

export async function cancelPermissionRequest(id: string): Promise<void> {
  if (!hasSupabaseEnv) return;
  const { error } = await db().from("permission_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------- Activity Log ----------------

export type ActivityLogType =
  | "check_in"
  | "check_out"
  | "permission_requested"
  | "permission_approved"
  | "permission_rejected";

export type ActivityLogEntry = {
  key: string;
  employee_id: string;
  full_name: string;
  role: string | null;
  type: ActivityLogType;
  at: string;
  date: string;
  detail?: string;
};

export async function getActivityLog(month: string): Promise<ActivityLogEntry[]> {
  if (!hasSupabaseEnv) return [];
  const start = `${month}-01`;
  const end = `${month}-31`;
  const entries: ActivityLogEntry[] = [];

  const { data: attendance, error: aErr } = await db()
    .from("attendance")
    .select("*, employee:profiles(full_name, role)")
    .gte("date", start)
    .lte("date", end);
  if (aErr) throw new Error(aErr.message);
  for (const a of (attendance ?? []) as Array<
    Attendance & { employee?: Pick<Profile, "full_name" | "role"> | null }
  >) {
    const name = a.employee?.full_name ?? "موظف";
    if (a.check_in) {
      entries.push({
        key: `in-${a.id}`,
        employee_id: a.employee_id,
        full_name: name,
        role: a.employee?.role ?? null,
        type: "check_in",
        at: a.check_in,
        date: a.date,
      });
    }
    if (a.check_out) {
      entries.push({
        key: `out-${a.id}`,
        employee_id: a.employee_id,
        full_name: name,
        role: a.employee?.role ?? null,
        type: "check_out",
        at: a.check_out,
        date: a.date,
      });
    }
  }

  const { data: perms, error: pErr } = await db()
    .from("permission_requests")
    .select("*, employee:profiles!permission_requests_employee_id_fkey(full_name, role)")
    .gte("date", start)
    .lte("date", end);
  if (pErr) throw new Error(pErr.message);
  for (const p of (perms ?? []) as Array<
    PermissionRequest & { employee?: Pick<Profile, "full_name" | "role"> | null }
  >) {
    const name = p.employee?.full_name ?? "موظف";
    const dur = p.duration
      ? PERMISSION_DURATION_LABELS[p.duration as PermissionDuration] ?? p.duration
      : undefined;
    if (p.created_at) {
      entries.push({
        key: `pr-req-${p.id}`,
        employee_id: p.employee_id,
        full_name: name,
        role: p.employee?.role ?? null,
        type: "permission_requested",
        at: p.created_at,
        date: p.date,
        detail: dur,
      });
    }
    if (p.reviewed_at && p.status === "approved") {
      entries.push({
        key: `pr-ok-${p.id}`,
        employee_id: p.employee_id,
        full_name: name,
        role: p.employee?.role ?? null,
        type: "permission_approved",
        at: p.reviewed_at,
        date: p.date,
        detail: dur,
      });
    }
    if (p.reviewed_at && p.status === "rejected") {
      entries.push({
        key: `pr-no-${p.id}`,
        employee_id: p.employee_id,
        full_name: name,
        role: p.employee?.role ?? null,
        type: "permission_rejected",
        at: p.reviewed_at,
        date: p.date,
        detail: dur,
      });
    }
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

// ---------------- Reports ----------------

export type ReportAttendanceRow = {
  employee_id: string;
  full_name: string;
  role: string | null;
  present_days: number;
  permission_days: number;
  total_days: number;
  total_hours: number;
  avg_check_in: string | null;
};

export type ReportPermissionRow = {
  employee_id: string;
  full_name: string;
  role: string | null;
  requested: number;
  approved: number;
  rejected: number;
  pending: number;
  hours_requested: number;
};

export type ReportShipmentRow = {
  employee_id: string;
  full_name: string;
  role: string | null;
  total: number;
  delivered: number;
  returned: number;
  pending: number;
  delivery_rate: number | null;
  expected_revenue: number;
  collected_revenue: number;
  lost_revenue: number;
  days_worked: number;
};

export type ReportsData = {
  attendance: ReportAttendanceRow[];
  permissions: ReportPermissionRow[];
  shipments: ReportShipmentRow[];
  summary: {
    employees: number;
    drivers: number;
    total_shipments: number;
    delivered: number;
    returned: number;
    pending_shipments: number;
    delivery_rate: number | null;
    attendance_days: number;
    permission_days: number;
    expected_revenue: number;
    collected_revenue: number;
    lost_revenue: number;
  };
};

export async function getReportsData(start: string, end: string): Promise<ReportsData> {
  const empty: ReportsData = {
    attendance: [],
    permissions: [],
    shipments: [],
    summary: {
      employees: 0,
      drivers: 0,
      total_shipments: 0,
      delivered: 0,
      returned: 0,
      pending_shipments: 0,
      delivery_rate: null,
      attendance_days: 0,
      permission_days: 0,
      expected_revenue: 0,
      collected_revenue: 0,
      lost_revenue: 0,
    },
  };
  if (!hasSupabaseEnv) return empty;

  const profiles = (await getProfiles()).filter((p) => p.role !== "admin");
  const shipments = await getShipments();

  const [attRes, permRes, logRes] = await Promise.all([
    db()
      .from("attendance")
      .select("*, employee:profiles(full_name, role)")
      .gte("date", start)
      .lte("date", end),
    db()
      .from("permission_requests")
      .select("*, employee:profiles!permission_requests_employee_id_fkey(full_name, role)")
      .gte("date", start)
      .lte("date", end),
    db().from("shipment_logs").select("created_by, created_at").limit(5000),
  ]);
  if (attRes.error) throw new Error(attRes.error.message);
  if (permRes.error) throw new Error(permRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);

  const attendance = (attRes.data ?? []) as Array<
    Attendance & { employee?: Pick<Profile, "full_name" | "role"> | null }
  >;
  const perms = (permRes.data ?? []) as Array<
    PermissionRequest & { employee?: Pick<Profile, "full_name" | "role"> | null }
  >;
  const logs = (logRes.data ?? []) as { created_by: string | null; created_at: string }[];

  const inPeriod = (d?: string | null) => !!d && d.slice(0, 10) >= start && d.slice(0, 10) <= end;
  const periodShipments = shipments.filter((s) => inPeriod(s.created_at));
  const revenue = (list: Shipment[]) =>
    list.reduce((acc, s) => acc + (s.price || 0) + (s.cod_amount || 0), 0);

  const attendanceRows: ReportAttendanceRow[] = profiles.map((p) => {
    const mine = attendance.filter((a) => a.employee_id === p.id);
    const withTimes = mine.filter((a) => a.check_in);
    const avgIn =
      withTimes.length > 0
        ? withTimes.reduce((s, a) => s + new Date(a.check_in!).getTime(), 0) / withTimes.length
        : null;
    const total_hours = mine.reduce((acc, a) => acc + workedHours(a), 0);
    return {
      employee_id: p.id,
      full_name: p.full_name,
      role: p.role,
      present_days: mine.filter((a) => a.status === "present").length,
      permission_days: mine.filter((a) => a.status === "permission").length,
      total_days: mine.length,
      total_hours,
      avg_check_in: avgIn
        ? new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(
            new Date(avgIn)
          )
        : null,
    };
  });

  const permissionRows: ReportPermissionRow[] = profiles.map((p) => {
    const mine = perms.filter((r) => r.employee_id === p.id);
    const hours = mine.reduce(
      (acc, r) =>
        acc +
        (r.duration === "1hour" ? 1 : r.duration === "2hours" ? 2 : r.duration === "rest_of_day" ? 8 : 0),
      0
    );
    return {
      employee_id: p.id,
      full_name: p.full_name,
      role: p.role,
      requested: mine.length,
      approved: mine.filter((r) => r.status === "approved").length,
      rejected: mine.filter((r) => r.status === "rejected").length,
      pending: mine.filter((r) => r.status === "pending").length,
      hours_requested: hours,
    };
  });

  const shipmentRows: ReportShipmentRow[] = profiles.map((p) => {
    const assigned = periodShipments.filter((s) => s.assigned_driver_id === p.id);
    const delivered = assigned.filter((s) => s.status === "delivered");
    const returned = assigned.filter((s) => s.status === "returned");
    const closed = delivered.length + returned.length;
    const days = new Set(
      logs
        .filter((l) => l.created_by === p.id && inPeriod(l.created_at))
        .map((l) => l.created_at.slice(0, 10))
    ).size;
    return {
      employee_id: p.id,
      full_name: p.full_name,
      role: p.role,
      total: assigned.length,
      delivered: delivered.length,
      returned: returned.length,
      pending: assigned.length - delivered.length - returned.length,
      delivery_rate: closed > 0 ? Math.round((delivered.length / closed) * 100) : null,
      expected_revenue: revenue(assigned),
      collected_revenue: revenue(delivered),
      lost_revenue: revenue(returned),
      days_worked: days,
    };
  });

  const deliveredTotal = periodShipments.filter((s) => s.status === "delivered").length;
  const returnedTotal = periodShipments.filter((s) => s.status === "returned").length;
  const closedTotal = deliveredTotal + returnedTotal;

  return {
    attendance: attendanceRows,
    permissions: permissionRows,
    shipments: shipmentRows
      .filter((r) => r.role === "driver")
      .sort((a, b) => b.collected_revenue - a.collected_revenue || b.total - a.total),
    summary: {
      employees: profiles.length,
      drivers: profiles.filter((p) => p.role === "driver").length,
      total_shipments: periodShipments.length,
      delivered: deliveredTotal,
      returned: returnedTotal,
      pending_shipments: periodShipments.filter(
        (s) => !["delivered", "returned"].includes(s.status)
      ).length,
      delivery_rate: closedTotal > 0 ? Math.round((deliveredTotal / closedTotal) * 100) : null,
      attendance_days: attendanceRows.reduce((a, r) => a + r.total_days, 0),
      permission_days: attendanceRows.reduce((a, r) => a + r.permission_days, 0),
      expected_revenue: revenue(periodShipments),
      collected_revenue: revenue(periodShipments.filter((s) => s.status === "delivered")),
      lost_revenue: revenue(periodShipments.filter((s) => s.status === "returned")),
    },
  };
}
