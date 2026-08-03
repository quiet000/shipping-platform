import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PASSWORD } from "@/lib/constants";
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
  const {
    email,
    password,
    full_name,
    role,
    phone,
    license_number,
    is_active,
    custom_permissions,
  } = body;

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: "بيانات غير مكتملة (بريد، اسم، دور)" }, { status: 400 });
  }

  const finalPassword = password && password.length > 0 ? password : DEFAULT_PASSWORD;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authUser.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "تعذر إنشاء الحساب" }, { status: 500 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name,
        email,
        role,
        phone: phone ?? null,
        license_number: license_number ?? null,
        is_active: is_active ?? true,
        custom_permissions: custom_permissions ?? {},
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ id: userId });
}
