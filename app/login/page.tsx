"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profile = await login(email, password);
      toast.success(`مرحباً ${profile.full_name}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 p-4">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <ThemeToggle />
        <Link href="/" className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800">
          <ArrowRight className="h-5 w-5 rotate-180" />
        </Link>
      </div>

      <div className="relative w-full max-w-md">
        <div className="animate-fade-up mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Truck className="h-9 w-9 text-sky-300" />
          </div>
          <h1 className="text-2xl font-black text-white">بوابة الموظفين</h1>
          <p className="mt-1 text-sm text-slate-400">تسجيل الدخول إلى نظام إدارة الشحنات</p>
        </div>

        <div
          className="animate-fade-up glass rounded-2xl border border-slate-200/40 p-8 shadow-2xl shadow-sky-950/40"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-sky-50 p-3 dark:bg-sky-500/10">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              الدخول مخصص لموظفي الشركة فقط. يتم تحديد الصلاحيات حسب الدور الوظيفي لكل موظف.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                dir="ltr"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="accent" className="w-full" size="lg" loading={loading}>
              {!loading && <LogIn className="h-5 w-5" />}
              تسجيل الدخول
            </Button>
          </form>

          {!hasSupabaseEnv && (
            <div className="mt-6 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-center dark:bg-amber-500/10">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                وضع العرض التجريبي (بدون Supabase)
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                يمكنك الدخول بأي بيانات لتجربة لوحة التحكم.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          مشكلة في الدخول؟ تواصل مع مدير النظام.
        </p>
      </div>
    </div>
  );
}
