"use client";

import { useState } from "react";
import { Menu, ChevronDown, KeyRound, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { ChangePasswordModal } from "@/components/dashboard/change-password-modal";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const today = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-black text-slate-800 dark:text-white sm:text-lg">
            {title ?? "لوحة التحكم"}
          </h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationsBell />
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-black text-white dark:bg-blue-600">
              {user?.full_name?.charAt(0) ?? "م"}
            </div>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {user?.full_name ?? "موظف"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setPwOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  تغيير كلمة المرور
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}
