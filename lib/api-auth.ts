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
