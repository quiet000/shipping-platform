import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCallerAuth } from "@/lib/api-auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "whk_live_";
  const arr = new Uint8Array(40);
  crypto.getRandomValues(arr);
  for (const b of arr) key += chars[b % chars.length];
  return key;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: Request) {
  const auth = await getCallerAuth(request);
  if (auth !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, agency_id, created_by, is_active, permissions, last_used_at, created_at, expires_at, agency:agencies(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await getCallerAuth(request);
  if (auth !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name as string)?.trim();
  const agencyId = body.agency_id as string;
  const permissions = (body.permissions as string[]) ?? ["shipments:create"];
  const expiresAt = (body.expires_at as string) ?? null;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!agencyId) return NextResponse.json({ error: "agency_id is required" }, { status: 400 });

  const rawKey = generateApiKey();
  const keyHash = await sha256Hex(rawKey);
  const keyPrefix = rawKey.slice(0, 16) + "...";

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get caller's profile id
  const token = (request.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user } } = await anon.auth.getUser(token);

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      agency_id: agencyId,
      created_by: user?.id ?? null,
      permissions,
      expires_at: expiresAt,
    })
    .select("id, name, key_prefix, agency_id, is_active, permissions, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    key: rawKey,
    message: "Save this API key — it will NOT be shown again.",
  });
}
