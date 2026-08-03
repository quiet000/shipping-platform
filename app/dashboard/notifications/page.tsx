"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCheck,
  RefreshCcw,
  CalendarClock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  generateSlaAlerts,
  getShipments,
} from "@/lib/data/api";
import { cn, formatDateTime, daysUntil, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ALERT_STYLES, ALERT_ICON_COLORS, STATUS_LABELS, type ShipmentStatus } from "@/lib/types";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const { data: shipments = [] } = useQuery({ queryKey: ["shipments"], queryFn: getShipments });

  const sla = useMutation({
    mutationFn: generateSlaAlerts,
    onSuccess: () => {
      toast.success("تم فحص الشحنات وإنشاء تنبيهات SLA جديدة");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const urgentShipments = useMemo(() => {
    return shipments
      .filter(
        (s) =>
          !["delivered", "returned"].includes(s.status) &&
          daysUntil(s.expected_delivery_date) <= 2
      )
      .sort(
        (a, b) =>
          new Date(a.expected_delivery_date).getTime() -
          new Date(b.expected_delivery_date).getTime()
      );
  }, [shipments]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "urgent") return n.alert_type === "urgent";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">التنبيهات والإنذارات</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            كشف تلقائي للشحنات القريبة من موعد تسليمها (يومان أو أقل)
          </p>
        </div>
        {user?.role === "admin" && (
          <Button variant="outline" onClick={() => sla.mutate()} loading={sla.isPending}>
            <RefreshCcw className="h-4 w-4" />
            فحص الشحنات الآن
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>قائمة التنبيهات</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-36">
                  <option value="all">الكل</option>
                  <option value="unread">غير المقروءة</option>
                  <option value="urgent">العاجلة</option>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>
                  <CheckCheck className="h-4 w-4" />
                  تحديد الكل
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400">لا توجد تنبيهات بهذا التصنيف</p>
                </div>
              )}
              {filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-right transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
                    n.is_read
                      ? "border-slate-200 dark:border-slate-800"
                      : "border-blue-300 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5"
                  )}
                >
                  {n.alert_type === "urgent" ? (
                    <AlertTriangle className={cn("mt-0.5 h-6 w-6 flex-shrink-0", ALERT_ICON_COLORS[n.alert_type])} />
                  ) : (
                    <Info className={cn("mt-0.5 h-6 w-6 flex-shrink-0", ALERT_ICON_COLORS[n.alert_type])} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-800 dark:text-white">{n.title}</p>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", ALERT_STYLES[n.alert_type])}>
                        {n.alert_type === "urgent" ? "عاجل" : n.alert_type === "warning" ? "تحذير" : "معلومات"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                    {n.shipment && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold tracking-wider text-navy-900 dark:text-white ltr">
                          {n.shipment.waybill_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          الموعد: {formatDate(n.shipment.expected_delivery_date)}
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {daysUntil(n.shipment.expected_delivery_date) >= 0
                            ? `متبقّي ${daysUntil(n.shipment.expected_delivery_date)} يوم`
                            : "متأخرة عن الموعد"}
                        </span>
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-slate-400">{formatDateTime(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>شحنات تحتاج متابعة عاجلة</CardTitle>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                {urgentShipments.length}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentShipments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Package className="h-10 w-10 text-green-500/70" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    ممتاز! لا توجد شحنات متأخرة أو قريبة من موعد التسليم
                  </p>
                </div>
              ) : (
                urgentShipments.map((s) => {
                  const late = daysUntil(s.expected_delivery_date) < 0;
                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/shipments`}
                      className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold tracking-wider text-navy-900 dark:text-white ltr">
                          {s.waybill_number}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {s.client_name} — {s.destination_city}
                      </p>
                      <div className={cn("mt-2 flex items-center gap-1.5 text-xs font-bold", late ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {late
                          ? `متأخرة ${Math.abs(daysUntil(s.expected_delivery_date))} يوم عن الموعد`
                          : `متبقّي ${daysUntil(s.expected_delivery_date)} يوم على الموعد`}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">الموعد: {formatDate(s.expected_delivery_date)}</p>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
