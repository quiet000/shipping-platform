"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarRange,
  CalendarDays,
  Package,
  CircleCheck,
  RotateCcw,
  TrendingUp,
  CircleDollarSign,
  UserCheck,
  ClipboardList,
  FileBarChart,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import {
  getReportsData,
  type ReportAttendanceRow,
  type ReportPermissionRow,
  type ReportShipmentRow,
} from "@/lib/data/api";
import { cn, formatCurrency } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

type PeriodMode = "monthly" | "yearly";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function roleLabel(role: string | null): string {
  return role && ROLE_LABELS[role as UserRole] ? ROLE_LABELS[role as UserRole] : role ?? "";
}

function hoursText(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh} س ${mm} د` : `${hh} س`;
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [mode, setMode] = useState<PeriodMode>("monthly");
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const period = useMemo(() => {
    if (mode === "monthly") return { start: `${month}-01`, end: `${month}-31` };
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }, [mode, month, year]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["reports", period.start, period.end],
    queryFn: () => getReportsData(period.start, period.end),
  });

  const s = report?.summary;
  const periodLabel = mode === "monthly" ? month : year;

  const buildAttendanceRows = (): (string | number | null | undefined)[][] => [
    ["الموظف", "الدور", "أيام الحضور", "أيام الإذن", "إجمالي الأيام", "ساعات العمل", "متوسط الحضور"],
    ...(report?.attendance ?? []).map((r) => [
      r.full_name,
      roleLabel(r.role),
      r.present_days,
      r.permission_days,
      r.total_days,
      hoursText(r.total_hours),
      r.avg_check_in ?? "—",
    ]),
  ];

  const buildPermissionRows = (): (string | number | null | undefined)[][] => [
    ["الموظف", "الدور", "الطلبات", "موافَق عليها", "مرفوضة", "معلّقة", "ساعات الإذن"],
    ...(report?.permissions ?? []).map((r) => [
      r.full_name,
      roleLabel(r.role),
      r.requested,
      r.approved,
      r.rejected,
      r.pending,
      r.hours_requested,
    ]),
  ];

  const buildShipmentRows = (): (string | number | null | undefined)[][] => [
    ["الموظف", "الدور", "أيام العمل", "الشحنات", "تم التسليم", "مرتجع", "قيد التنفيذ", "نسبة التسليم", "الإيراد المتوقع", "الإيراد المحصّل", "الفاقد"],
    ...(report?.shipments ?? []).map((r) => [
      r.full_name,
      roleLabel(r.role),
      r.days_worked,
      r.total,
      r.delivered,
      r.returned,
      r.pending,
      r.delivery_rate !== null ? `${r.delivery_rate}%` : "—",
      formatCurrency(r.expected_revenue),
      formatCurrency(r.collected_revenue),
      formatCurrency(r.lost_revenue),
    ]),
  ];

  const downloadFull = () => {
    const periodText = `الفترة: ${periodLabel} (${period.start} إلى ${period.end})`;
    const rows: (string | number | null | undefined)[][] = [];
    rows.push([periodText]);
    rows.push([]);
    rows.push(["تقرير الحضور"]);
    rows.push(...buildAttendanceRows());
    rows.push([]);
    rows.push(["تقرير الإذونات"]);
    rows.push(...buildPermissionRows());
    rows.push([]);
    rows.push(["تقرير الشحنات حسب المندوب"]);
    rows.push(...buildShipmentRows());
    downloadCsv(`reports-${periodLabel}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">التقارير</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            تقارير شاملة حسب الفترة: الحضور، الإذونات، الشحنات، والإيرادات
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            <Button
              type="button"
              variant={mode === "monthly" ? "primary" : "ghost"}
              className="rounded-none"
              onClick={() => setMode("monthly")}
            >
              شهري
            </Button>
            <Button
              type="button"
              variant={mode === "yearly" ? "primary" : "ghost"}
              className="rounded-none border-r border-slate-300 dark:border-slate-700"
              onClick={() => setMode("yearly")}
            >
              سنوي
            </Button>
          </div>
          {mode === "monthly" ? (
            <div className="w-44">
              <Label htmlFor="rep-month">الشهر</Label>
              <Input
                id="rep-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          ) : (
            <div className="w-44">
              <Label htmlFor="rep-year">السنة</Label>
              <Input
                id="rep-year"
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          )}
          <Button variant="accent" onClick={downloadFull}>
            <Download className="h-4 w-4" />
            تحميل التقرير
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="الموظفون"
          value={isLoading ? "..." : s?.employees ?? 0}
          sub={`${s?.drivers ?? 0} مندوب`}
          icon={UserCheck}
          color="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
        />
        <KpiCard
          title="الشحنات"
          value={isLoading ? "..." : s?.total_shipments ?? 0}
          sub={`${s?.pending_shipments ?? 0} قيد التنفيذ`}
          icon={Package}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        />
        <KpiCard
          title="تم التسليم"
          value={isLoading ? "..." : s?.delivered ?? 0}
          sub={`نسبة ${s?.delivery_rate ?? 0}%`}
          icon={CircleCheck}
          color="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
        />
        <KpiCard
          title="مرتجع"
          value={isLoading ? "..." : s?.returned ?? 0}
          icon={RotateCcw}
          color="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
        <KpiCard
          title="أيام الحضور"
          value={isLoading ? "..." : s?.attendance_days ?? 0}
          sub={`${s?.permission_days ?? 0} يوم إذن`}
          icon={CalendarDays}
          color="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <KpiCard
          title="الإيرادات المتوقعة"
          value={isLoading ? "..." : formatCurrency(s?.expected_revenue ?? 0)}
          sub={`محصّل ${formatCurrency(s?.collected_revenue ?? 0)}`}
          icon={TrendingUp}
          color="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-accent" />
            تقرير الحضور — {periodLabel}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => downloadCsv(`attendance-${periodLabel}.csv`, buildAttendanceRows())}>
            <Download className="h-4 w-4" />
            تحميل CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">الموظف</th>
                <th className="pb-3 font-semibold">أيام الحضور</th>
                <th className="pb-3 font-semibold">أيام الإذن</th>
                <th className="pb-3 font-semibold">إجمالي الأيام</th>
                <th className="pb-3 font-semibold">ساعات العمل</th>
                <th className="pb-3 font-semibold">متوسط الحضور</th>
              </tr>
            </thead>
            <tbody>
              {(report?.attendance ?? []).map((r) => (
                <tr
                  key={r.employee_id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{r.full_name}</span>
                      {r.role && <RoleBadge role={r.role as UserRole} />}
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-green-600 dark:text-green-400">{r.present_days}</td>
                  <td className="py-3 font-semibold text-amber-600 dark:text-amber-400">{r.permission_days}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{r.total_days}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {Math.floor(r.total_hours)} س {Math.round((r.total_hours - Math.floor(r.total_hours)) * 60)} د
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300 ltr">{r.avg_check_in ?? "—"}</td>
                </tr>
              ))}
              {(report?.attendance ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    لا توجد بيانات حضور لهذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            تقرير الإذونات — {periodLabel}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => downloadCsv(`permissions-${periodLabel}.csv`, buildPermissionRows())}>
            <Download className="h-4 w-4" />
            تحميل CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">الموظف</th>
                <th className="pb-3 font-semibold">الطلبات</th>
                <th className="pb-3 font-semibold">موافَق عليها</th>
                <th className="pb-3 font-semibold">مرفوضة</th>
                <th className="pb-3 font-semibold">معلّقة</th>
                <th className="pb-3 font-semibold">ساعات الإذن</th>
              </tr>
            </thead>
            <tbody>
              {(report?.permissions ?? []).map((r) => (
                <tr
                  key={r.employee_id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{r.full_name}</span>
                      {r.role && <RoleBadge role={r.role as UserRole} />}
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{r.requested}</td>
                  <td className="py-3 font-semibold text-green-600 dark:text-green-400">{r.approved}</td>
                  <td className="py-3 font-semibold text-red-600 dark:text-red-400">{r.rejected}</td>
                  <td className="py-3 font-semibold text-amber-600 dark:text-amber-400">{r.pending}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{r.hours_requested}</td>
                </tr>
              ))}
              {(report?.permissions ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    لا توجد طلبات إذن لهذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-400">
            ساعات الإذن: المدة تُحتسب على أساس ساعة واحدة، أو ساعتين، أو 8 ساعات لباقي اليوم
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-accent" />
            تقرير الشحنات حسب المندوب — {periodLabel}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => downloadCsv(`shipments-${periodLabel}.csv`, buildShipmentRows())}>
            <Download className="h-4 w-4" />
            تحميل CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">المندوب</th>
                <th className="pb-3 font-semibold">أيام العمل</th>
                <th className="pb-3 font-semibold">الشحنات</th>
                <th className="pb-3 font-semibold">تم التسليم</th>
                <th className="pb-3 font-semibold">مرتجع</th>
                <th className="pb-3 font-semibold">قيد التنفيذ</th>
                <th className="pb-3 font-semibold">نسبة التسليم</th>
                <th className="pb-3 font-semibold">الإيراد المتوقع</th>
                <th className="pb-3 font-semibold">الإيراد المحصّل</th>
                <th className="pb-3 font-semibold">الفاقد</th>
              </tr>
            </thead>
            <tbody>
              {(report?.shipments ?? []).map((r) => (
                <tr
                  key={r.employee_id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{r.full_name}</span>
                      {r.role && <RoleBadge role={r.role as UserRole} />}
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{r.days_worked}</td>
                  <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">{r.total}</td>
                  <td className="py-3 font-semibold text-green-600 dark:text-green-400">{r.delivered}</td>
                  <td className="py-3 font-semibold text-red-600 dark:text-red-400">{r.returned}</td>
                  <td className="py-3 text-yellow-600 dark:text-yellow-400">{r.pending}</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        r.delivery_rate !== null && r.delivery_rate >= 80
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {r.delivery_rate !== null ? `${r.delivery_rate}%` : "—"}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{formatCurrency(r.expected_revenue)}</td>
                  <td className="py-3 font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(r.collected_revenue)}
                  </td>
                  <td className="py-3 text-red-600 dark:text-red-400">{formatCurrency(r.lost_revenue)}</td>
                </tr>
              ))}
              {(report?.shipments ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    لا توجد شحنات لهذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <CircleDollarSign className="h-4 w-4" />
        الفترة المعروضة: {periodLabel} ({period.start} ← {period.end})
      </div>
    </div>
  );
}
