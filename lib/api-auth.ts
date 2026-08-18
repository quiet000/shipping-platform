import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type CallerAuth =
  | "admin"
  | "authenticated"
  | "unauthorized"
  | "unconfigured";

export async function getCallerAuth(request: Request): Promise<CallerAuth> {
  if (!url || !anonKey || !serviceRoleKey) return "unconfigured";
  const token = (request.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return "unauthorized";

  const anon = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return "unauthorized";

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();
  if (!profile) return "unauthorized";
  if (profile.is_active === false) return "unauthorized";
  if (profile.role === "admin") return "admin";
  return "authenticated";
}

// --- API Key auth (for external webhooks like n8n) ---

export type ApiKeyAuthResult =
  | { ok: true; agency_id: string; key_id: string; permissions: string[] }
  | { ok: false; error: string };

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getApiKeyAuth(request: Request): Promise<ApiKeyAuthResult> {
  if (!url || !serviceRoleKey) return { ok: false, error: "API not configured" };

  const bearer = (request.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!bearer || !bearer.startsWith("whk_")) {
    return { ok: false, error: "Invalid API key format" };
  }

  const keyHash = await sha256Hex(bearer);
  const prefix = bearer.slice(0, 16) + "...";

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error } = await admin
    .from("api_keys")
    .select("id, agency_id, is_active, permissions, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !row) return { ok: false, error: "Invalid API key" };
  if (!row.is_active) return { ok: false, error: "API key is disabled" };
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "API key has expired" };
  }

  // Update last_used_at asynchronously (fire-and-forget)
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return {
    ok: true,
    agency_id: row.agency_id,
    key_id: row.id,
    permissions: row.permissions ?? [],
  };
}
