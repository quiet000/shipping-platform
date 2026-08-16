"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  PackageCheck,
  Clock4,
  Users,
  Truck,
  CircleDollarSign,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import {
  getDashboardData,
  type StatsRange,
} from "@/lib/data/api";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";
import { SHIPPING_TYPE_LABELS, STATUS_LABELS, type Shipment } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}) {
  return (
    <Card
      className="animate-fade-up transition hover:shadow-md"
      style={{ animationDelay: `${delay}s` }}
    >
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

export default function DashboardPage() {
  const { user } = useAuth();
  const isDriver = user?.role === "driver";
  const driverId = isDriver ? user.id : undefined;
  const [range, setRange] = useState<StatsRange>("all");
  const {
    data,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ["dashboard", range, driverId],
    queryFn: () => getDashboardData(range, driverId),
    refetchInterval: 30_000,
  });
  const stats = data?.stats;
  const trend = data?.trend ?? [];
  const agencyData = data?.agencyBreakdown ?? [];
  const shipments = data?.shipments ?? [];

  const recent = [...shipments]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">لوحة الإحصائيات</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">الفترة:</span>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value as StatsRange)}
            className="w-40"
          >
            <option value="month">الشهر الحالي</option>
            <option value="3months">آخر 3 شهور</option>
            <option value="year">آخر سنة</option>
            <option value="all">كل الفترة</option>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="إجمالي الشحنات"
          value={loadingStats ? "..." : stats?.total ?? 0}
          icon={Package}
          color="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
          delay={0}
        />
        <KpiCard
          title="تم التسليم"
          value={loadingStats ? "..." : stats?.delivered ?? 0}
          icon={PackageCheck}
          color="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
          delay={0.06}
        />
        <KpiCard
          title="قيد المعالجة"
          value={loadingStats ? "..." : stats?.pending ?? 0}
          sub={`${stats?.outForDelivery ?? 0} خرجت للتوصيل`}
          icon={Clock4}
          color="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          delay={0.12}
        />
        <KpiCard
          title="مرتجعات"
          value={loadingStats ? "..." : stats?.returned ?? 0}
          icon={RotateCcw}
          color="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          delay={0.18}
        />
        {isDriver ? (
          <KpiCard
            title="خرجت للتوصيل"
            value={loadingStats ? "..." : stats?.outForDelivery ?? 0}
            icon={Truck}
            color="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
            delay={0.24}
          />
        ) : (
          <KpiCard
            title="سائقون نشطون"
            value={loadingStats ? "..." : stats?.activeDrivers ?? 0}
            icon={Users}
            color="bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            delay={0.24}
          />
        )}
        <KpiCard
          title="إجمالي الإيرادات"
          value={loadingStats ? "..." : formatCurrency(stats?.revenue ?? 0)}
          icon={CircleDollarSign}
          color="bg-accent/15 text-accent"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معدل التسليم الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="delivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    direction: "rtl",
                    background: "var(--tw-colors-slate-900, #0f172a)",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="شحنات جديدة"
                  stroke="#2563EB"
                  fill="url(#created)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  name="تم تسليمها"
                  stroke="#16a34a"
                  fill="url(#delivered)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع الشحنات حسب الوكالة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agencyData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    interval={0}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(name) =>
                      String(name).length > 22 ? `${String(name).slice(0, 22)}…` : String(name)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      direction: "rtl",
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "إجمالي" ? "إجمالي الشحنات" : "تم التسليم",
                    ]}
                    labelFormatter={(name) => String(name)}
                  />
                  <Bar dataKey="total" name="إجمالي" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={18} />
                  <Bar dataKey="delivered" name="تم التسليم" fill="#16a34a" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {agencyData.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                {agencyData.map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-amber-500" />
                      <span className="truncate">{a.name}</span>
                    </span>
                    <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {a.total} شحنة
                      <span className="text-green-600 dark:text-green-400"> · {a.delivered} مُسلَّمة</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {agencyData.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">لا توجد وكلاء بعد</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Delivery Stream */}
      <Card>
        <CardHeader>
          <CardTitle>آخر تحديثات التسليم المباشر</CardTitle>
          <Button variant="ghost" size="sm" className="pointer-events-none text-slate-400">
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
            مباشر
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">البوليصة</th>
                <th className="pb-3 font-semibold">العميل</th>
                <th className="pb-3 font-semibold">المدينة</th>
                <th className="pb-3 font-semibold">النوع</th>
                <th className="pb-3 font-semibold">الحالة</th>
                <th className="pb-3 font-semibold">التحديث</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s: Shipment) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-2 font-bold tracking-wider text-navy-900 dark:text-white ltr">
                    {s.waybill_number}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{s.client_name}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{s.destination_city}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {SHIPPING_TYPE_LABELS[s.shipping_type]}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 text-xs text-slate-400">{formatTimeAgo(s.updated_at)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    لا توجد شحنات بعد
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
