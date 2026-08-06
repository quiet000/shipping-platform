"use client";

import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type {
  Agency,
  Notification,
  Profile,
  Shipment,
  ShipmentLog,
  ShipmentStatus,
  ShippingType,
  Truck,
  UserRole,
} from "@/lib/types";
import {
  mockAgencies,
  mockDrivers,
  mockLogs,
  mockNotifications,
  mockShipments,
  mockTrucks,
} from "@/lib/data/mock";

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
  return v?.trim() || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
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
  notes?: string
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

export async function getNotifications(): Promise<Notification[]> {
  if (!hasSupabaseEnv) return [...mockNotifications];
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

export async function markAllNotificationsRead(): Promise<void> {
  if (!hasSupabaseEnv) {
    mockNotifications.forEach((n) => (n.is_read = true));
    return;
  }
  await db().from("notifications").update({ is_read: true }).neq("is_read", true);
}

export async function generateSlaAlerts(): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { error } = await db().rpc("generate_sla_alerts");
  if (error) throw new Error(error.message);
  return 1;
}
