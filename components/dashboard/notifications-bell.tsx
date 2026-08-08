"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { cn, formatTimeAgo, daysUntil } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/data/api";
import { ALERT_STYLES, ALERT_ICON_COLORS } from "@/lib/types";
import { PERMISSION_NOTIFICATION_TITLE } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const driverId = user?.role === "driver" ? user.id : undefined;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", driverId],
    queryFn: () => getNotifications(driverId),
    refetchInterval: 30_000,
  });

  const unread = notifications.filter((n) => !n.is_read).length;
  const urgent = notifications.filter((n) => n.alert_type === "urgent").length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", driverId] });
  };

  const markAll = async () => {
    await markAllNotificationsRead(driverId);
    queryClient.invalidateQueries({ queryKey: ["notifications", driverId] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">التنبيهات</h3>
              {urgent > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {urgent} عاجلة
                </span>
              )}
            </div>
            <button
              onClick={markAll}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              تحديد الكل كمقروء
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">لا توجد تنبيهات حالياً</div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.title === PERMISSION_NOTIFICATION_TITLE) {
                      router.push("/dashboard/attendance");
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-slate-100 p-3 text-right transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800",
                    !n.is_read && "bg-blue-50/60 dark:bg-blue-500/5"
                  )}
                >
                  {n.alert_type === "urgent" ? (
                    <AlertTriangle className={cn("mt-0.5 h-5 w-5 flex-shrink-0", ALERT_ICON_COLORS[n.alert_type])} />
                  ) : (
                    <Info className={cn("mt-0.5 h-5 w-5 flex-shrink-0", ALERT_ICON_COLORS[n.alert_type])} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {n.message}
                    </p>
                    {n.title === PERMISSION_NOTIFICATION_TITLE && (
                      <p className="mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        اضغط للانتقال إلى الطلب المعلّق
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">{formatTimeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 p-2 dark:border-slate-800">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full">
                عرض جميع التنبيهات
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
