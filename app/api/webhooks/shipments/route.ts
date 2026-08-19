import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiKeyAuth } from "@/lib/api-auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function ensureWaybill(v?: string): string {
  return v?.trim() || `SHP-${Math.floor(100000 + Math.random() * 900000)}`;
}

function ensureDate(v?: string): string {
  if (v?.trim()) return v.trim();
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const keyAuth = await getApiKeyAuth(request);
  if (!keyAuth.ok) {
    return NextResponse.json({ error: keyAuth.error }, { status: 401 });
  }

  if (!keyAuth.permissions.includes("shipments:create")) {
    return NextResponse.json({ error: "Permission shipments:create not granted" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Accept single object or array
  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0) {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { waybill_number: string; id: string; status: string }[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const clientName = (item.client_name as string)?.trim();
    const clientPhone = (item.client_phone as string)?.trim();
    if (!clientName || !clientPhone) {
      errors.push({ index: i, error: "client_name and client_phone are required" });
      continue;
    }

    const payload = {
      waybill_number: ensureWaybill(item.waybill_number as string | undefined),
      client_name: clientName,
      client_phone: clientPhone,
      destination_address: ((item.destination_address as string) ?? "").trim(),
      destination_city: ((item.destination_city as string) ?? "").trim(),
      shipping_type: (item.shipping_type as string) ?? "standard",
      status: (item.status as string) ?? "in_warehouse",
      is_fragile: Boolean(item.is_fragile),
      agency_id: keyAuth.agency_id,
      assigned_driver_id: (item.assigned_driver_id as string) ?? null,
      price: Number(item.price) || 0,
      cod_amount: Number(item.cod_amount) || 0,
      expected_delivery_date: ensureDate(item.expected_delivery_date as string | undefined),
    };

    const { data, error } = await admin
      .from("shipments")
      .insert(payload)
      .select("id, waybill_number, status")
      .single();

    if (error) {
      errors.push({ index: i, error: error.message });
    } else {
      results.push(data);
    }
  }

  // Log activity for the agency
  if (results.length > 0) {
    await admin.from("shipment_logs").insert(
      results.map((r) => ({
        shipment_id: r.id,
        status: r.status,
        notes: `Created via API (key: ${keyAuth.key_id.slice(0, 8)}...)`,
      }))
    );
  }

  return NextResponse.json({
    created: results.length,
    errors: errors.length > 0 ? errors : undefined,
    shipments: results,
  });
}

// GET: query shipments — filter by status, waybill_number, or list all
export async function GET(request: Request) {
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const keyAuth = await getApiKeyAuth(request);
  if (!keyAuth.ok) {
    return NextResponse.json({ error: keyAuth.error }, { status: 401 });
  }

  if (!keyAuth.permissions.includes("shipments:read")) {
    return NextResponse.json({ error: "Permission shipments:read not granted" }, { status: 403 });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const urlObj = new URL(request.url);
  const limit = Math.min(Number(urlObj.searchParams.get("limit")) || 50, 200);
  const status = urlObj.searchParams.get("status")?.trim();
  const waybill = urlObj.searchParams.get("waybill_number")?.trim();

  let query = admin
    .from("shipments")
    .select("id, waybill_number, client_name, client_phone, destination_city, status, shipping_type, price, cod_amount, expected_delivery_date, created_at, updated_at")
    .eq("agency_id", keyAuth.agency_id);

  if (waybill) {
    query = query.ilike("waybill_number", waybill);
  }
  if (status) {
    query = query.eq("status", status);
  }

  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const STATUS_AR: Record<string, string> = {
    in_warehouse: "في المخزن",
    out_for_delivery: "خرجت للتوصيل",
    delivered: "تم التسليم",
    returned: "مرتجع",
    delayed: "متأخرة",
  };

  const result = (data ?? []).map((s) => ({
    ...s,
    status_ar: STATUS_AR[s.status] ?? s.status,
  }));

  return NextResponse.json({
    count: result.length,
    shipments: result,
  });
}
