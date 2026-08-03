"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Building2,
  Users,
  Truck,
  Bell,
  LogOut,
  ShieldCheck,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";

const navItems = [
  {
    section: "الرئيسية",
    items: [
      { href: "/dashboard", label: "لوحة الإحصائيات", icon: LayoutDashboard, roles: ["admin", "supervisor", "branch_manager", "driver", "accountant"] },
      { href: "/dashboard/notifications", label: "التنبيهات والإنذارات", icon: Bell, roles: ["admin", "supervisor", "branch_manager", "driver", "accountant"] },
    ],
  },
  {
    section: "العمليات",
    items: [
      { href: "/dashboard/shipments", label: "إدارة الشحنات", icon: Package, roles: ["admin", "supervisor", "branch_manager", "driver", "accountant"] },
      { href: "/dashboard/agencies", label: "الوكلاء والشركات", icon: Building2, roles: ["admin", "supervisor", "branch_manager", "accountant"] },
    ],
  },
  {
    section: "الإدارة",
    items: [
      { href: "/dashboard/users", label: "الموظفون والصلاحيات", icon: ShieldCheck, roles: ["admin"] },
      { href: "/dashboard/drivers", label: "المناديب والسائقون", icon: Users, roles: ["admin"] },
      { href: "/dashboard/trucks", label: "الأسطول والشاحنات", icon: Truck, roles: ["admin"] },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 dark:bg-blue-600">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-black text-navy-900 dark:text-white">شحن إكسبريس</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">لوحة التحكم</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((group) => {
            const visible = group.items.filter((i) => !user || i.roles.includes(user.role));
            if (visible.length === 0) return null;
            return (
              <div key={group.section} className="mb-4">
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {group.section}
                </p>
                <div className="space-y-1">
                  {visible.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                          active
                            ? "bg-navy-900 text-white dark:bg-blue-600"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-black text-white dark:bg-blue-600">
              {user?.full_name?.charAt(0) ?? "م"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {user?.full_name ?? "موظف"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/15"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
