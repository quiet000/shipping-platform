"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { Loader2, ShieldAlert } from "lucide-react";
import type { UserRole } from "@/lib/types";

const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard/users": ["admin"],
  "/dashboard/drivers": ["admin"],
  "/dashboard/trucks": ["admin"],
  "/dashboard/performance": ["admin", "supervisor", "branch_manager", "accountant"],
  "/dashboard/reports": ["admin", "supervisor", "branch_manager", "accountant"],
  "/dashboard/agencies": ["admin", "supervisor", "branch_manager", "accountant"],
};

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const allowedRoles = ROUTE_ROLES[pathname];
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:mr-64">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 sm:p-6">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-800">
              <ShieldAlert className="h-12 w-12 text-amber-500" />
              <div>
                <p className="text-lg font-black text-slate-800 dark:text-white">
                  هذه الصفحة غير متاحة لدورك الوظيفي
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  تواصل مع مدير النظام إذا كنت تحتاج الوصول إليها.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:mr-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
