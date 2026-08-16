"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Package,
  CircleDollarSign,
  Wallet,
  RotateCcw,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/badge";
import { getEmployeePerformance } from "@/lib/data/api";
import { formatCurrency } from "@/lib/utils";

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

export default function PerformancePage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["employee-performance"],
    queryFn: getEmployeePerformance,
    refetchInterval: 30_000,
  });

  const employees = rows.filter((r) => r.role === "driver").length;
  const staff = rows.length - employees;
  const totalAssigned = rows.reduce((a, r) => a + r.total, 0);
  const expected = rows.reduce((a, r) => a + r.expected_revenue, 0);
  const collected = rows.reduce((a, r) => a + r.collected_revenue, 0);
  const lost = rows.reduce((a, r) => a + r.lost_revenue, 0);
  const daysWorked = rows.reduce((a, r) => a + r.days_worked, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">إحصائيات الموظفين</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          أداء كل مندوب وموظف: أيام العمل، الشحنات، التسليم والمرتجعات، والإيرادات المتوقعة مقابل المحصّلة
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="المناديب"
          value={isLoading ? "..." : employees}
          sub={`${staff} موظف آخر`}
          icon={Users}
          color="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        />
        <KpiCard
          title="إجمالي الشحنات"
          value={isLoading ? "..." : totalAssigned}
          icon={Package}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        />
        <KpiCard
          title="أيام العمل"
          value={isLoading ? "..." : daysWorked}
          icon={CalendarDays}
          color="bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
        />
        <KpiCard
          title="الإيرادات المتوقعة"
          value={isLoading ? "..." : formatCurrency(expected)}
          icon={TrendingUp}
          color="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
        />
        <KpiCard
          title="الإيرادات المحصّلة"
          value={isLoading ? "..." : formatCurrency(collected)}
          icon={CircleDollarSign}
          color="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
        />
        <KpiCard
          title="الفاقد من المرتجعات"
          value={isLoading ? "..." : formatCurrency(lost)}
          icon={RotateCcw}
          color="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" />
            تفاصيل الأداء لكل موظف
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">الموظف</th>
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
              {rows.map((r) => {
                const closed = r.delivered + r.returned;
                const rate = closed > 0 ? Math.round((r.delivered / closed) * 100) : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 pr-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {r.full_name}
                        </span>
                        <RoleBadge role={r.role} />
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{r.days_worked}</td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">{r.total}</td>
                    <td className="py-3 font-semibold text-green-600 dark:text-green-400">{r.delivered}</td>
                    <td className="py-3 font-semibold text-red-600 dark:text-red-400">{r.returned}</td>
                    <td className="py-3 text-amber-600 dark:text-amber-400">{r.pending}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {closed > 0 ? `${rate}%` : "—"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatCurrency(r.expected_revenue)}</td>
                    <td className="py-3 font-bold text-green-600 dark:text-green-300">
                      {formatCurrency(r.collected_revenue)}
                    </td>
                    <td className="py-3 text-red-600 dark:text-red-400">{formatCurrency(r.lost_revenue)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    لا توجد بيانات أداء بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
