import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCallerAuth } from "@/lib/api-auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase غير مهيّأ على الخادم" }, { status: 500 });
  }

  const caller = await getCallerAuth(request);
  if (caller === "unconfigured") {
    return NextResponse.json({ error: "Supabase غير مهيّأ على الخادم" }, { status: 500 });
  }
  if (caller !== "admin") {
    return NextResponse.json({ error: "غير مصرّح لك" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { id, password } = body;

  if (!id || !password || password.length < 6) {
    return NextResponse.json(
      { error: "بيانات غير مكتملة (كلمة مرور لا تقل عن 6 أحرف)" },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
