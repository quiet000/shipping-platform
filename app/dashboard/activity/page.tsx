"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogIn,
  LogOut,
  ClipboardList,
  CheckCircle2,
  XCircle,
  History,
  UserCheck,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoleBadge } from "@/components/ui/badge";
import { getActivityLog, type ActivityLogType } from "@/lib/data/api";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const LOG_STYLES: Record<ActivityLogType, { label: string; cls: string; icon: React.ElementType }> = {
  check_in: {
    label: "تسجيل حضور",
    cls: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    icon: LogIn,
  },
  check_out: {
    label: "تسجيل خروج",
    cls: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    icon: LogOut,
  },
  permission_requested: {
    label: "طلب إذن",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icon: ClipboardList,
  },
  permission_approved: {
    label: "تمت الموافقة على الإذن",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  permission_rejected: {
    label: "تم رفض الإذن",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    icon: XCircle,
  },
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState<ActivityLogType | "all">("all");

  const { data: log = [] } = useQuery({
    queryKey: ["activity-log", month],
    queryFn: () => getActivityLog(month),
  });

  const filtered = useMemo(() => {
    const items = filter === "all" ? log : log.filter((e) => e.type === filter);
    return items;
  }, [log, filter]);

  const counts = useMemo(() => {
    const c: Record<ActivityLogType, number> = {
      check_in: 0,
      check_out: 0,
      permission_requested: 0,
      permission_approved: 0,
      permission_rejected: 0,
    };
    for (const e of log) c[e.type]++;
    return c;
  }, [log]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">سجل الحضور والنشاط</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            متى سجّل الموظفون حضورهم وخروجهم، ومتى طُلب وأُقرّ الإذن
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Label htmlFor="month">الشهر</Label>
            <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="w-44">
            <Label htmlFor="filter">تصفية حسب</Label>
            <Select id="filter" value={filter} onChange={(e) => setFilter(e.target.value as ActivityLogType | "all")}>
              <option value="all">الكل</option>
              <option value="check_in">الحضور</option>
              <option value="check_out">الخروج</option>
              <option value="permission_requested">طلبات الإذن</option>
              <option value="permission_approved">الموافقات</option>
              <option value="permission_rejected">الرفض</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryTile icon={LogIn} label="تسجيل حضور" value={counts.check_in} cls="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400" />
        <SummaryTile icon={LogOut} label="تسجيل خروج" value={counts.check_out} cls="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
        <SummaryTile icon={ClipboardList} label="طلبات إذن" value={counts.permission_requested} cls="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
        <SummaryTile icon={CheckCircle2} label="إذونات موافَق عليها" value={counts.permission_approved} cls="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
        <SummaryTile icon={XCircle} label="إذونات مرفوضة" value={counts.permission_rejected} cls="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            الأحداث — {month}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {filtered.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <History className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">لا توجد أحداث بهذا التصفية</p>
            </div>
          ) : (
            <div className="relative space-y-1 before:absolute before:right-[13px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {filtered.map((e) => {
                const meta = LOG_STYLES[e.type];
                const Icon = meta.icon;
                return (
                  <div key={e.key} className="relative flex items-start gap-3 rounded-lg p-2 pr-8 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span
                      className={cn(
                        "absolute right-[6px] z-10 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900",
                        meta.cls
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold", meta.cls)}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                        <UserCheck className="h-4 w-4 text-slate-400" />
                        {e.full_name}
                        {e.role && <RoleBadge role={e.role as UserRole} />}
                      </span>
                      {e.detail && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          المدة: {e.detail}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(e.date)} — {formatDateTime(e.at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
