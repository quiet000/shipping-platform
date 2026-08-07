"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogIn,
  LogOut,
  ClipboardList,
  Clock4,
  CalendarDays,
  ShieldCheck,
  CalendarCheck,
  Timer,
  CheckCircle2,
  XCircle,
  UserCheck,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RoleBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  getAttendance,
  getAttendanceToday,
  markAttendance,
  getAttendanceReport,
  requestPermission,
  getPermissionRequests,
  getPendingPermissionRequests,
  reviewPermissionRequest,
  cancelPermissionRequest,
} from "@/lib/data/api";
import { cn, formatDateTime, formatDate, daysFromNow } from "@/lib/utils";
import { ATTENDANCE_LABELS, PERMISSION_LABELS, type AttendanceStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth";

const REPORT_ROLES = ["admin", "supervisor", "branch_manager", "accountant"];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatHours(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h} س ${m} د` : `${h} س`;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

const PERMISSION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const isDriver = user?.role === "driver";
  const canSeeReport = user ? REPORT_ROLES.includes(user.role) : false;
  const todayStr = daysFromNow(0);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqDate, setReqDate] = useState(todayStr);
  const [reqTime, setReqTime] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  const { data: today = null } = useQuery({
    queryKey: ["attendance-today", user?.id],
    queryFn: () => (user ? getAttendanceToday(user.id) : Promise.resolve(null)),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const { data: myMonth = [] } = useQuery({
    queryKey: ["attendance", month, user?.id],
    queryFn: () => (user ? getAttendance(month, user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["permission-requests", month, user?.id],
    queryFn: () => (user ? getPermissionRequests(month, user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const { data: report = [] } = useQuery({
    queryKey: ["attendance-report", month],
    queryFn: () => getAttendanceReport(month),
    enabled: canSeeReport,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["permission-pending"],
    queryFn: getPendingPermissionRequests,
    refetchInterval: 30_000,
    enabled: canSeeReport,
  });

  const pendingToday = myRequests.some(
    (r) => r.date === todayStr && r.status === "pending"
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-today", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["attendance", month, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["attendance-report", month] });
    queryClient.invalidateQueries({ queryKey: ["permission-requests", month, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["permission-pending"] });
  };

  const mark = useMutation({
    mutationFn: (args: { status: AttendanceStatus; action: "check_in" | "check_out" }) =>
      markAttendance(user!.id, args.status, args.action),
    onSuccess: () => {
      toast.success("تم تحديث الحضور بنجاح");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestPerm = useMutation({
    mutationFn: async () => {
      if (!reqTime) throw new Error("حدد وقت الخروج المتوقع أولاً");
      const leaveDate = new Date(`${reqDate}T${reqTime}:00`);
      const minTime = new Date(Date.now() + 30 * 60 * 1000);
      if (Number.isNaN(leaveDate.getTime()) || leaveDate.getTime() < minTime.getTime()) {
        throw new Error("يجب تقديم طلب الإذن قبل موعد المغادرة بـ 30 دقيقة على الأقل");
      }
      await requestPermission({
        employee_id: user!.id,
        date: reqDate,
        leave_time: leaveDate.toISOString(),
        notes: reqNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب الإذن بانتظار موافقة الإدارة");
      setReqOpen(false);
      setReqTime("");
      setReqNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: (args: { id: string; status: "approved" | "rejected" }) =>
      reviewPermissionRequest(args.id, args.status),
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: cancelPermissionRequest,
    onSuccess: () => {
      toast.success("تم إلغاء الطلب");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myPresent = myMonth.filter((a) => a.status === "present").length;
  const myPermission = myMonth.filter((a) => a.status === "permission").length;
  const myHours = myMonth.reduce((acc, a) => {
    if (!a.check_in || !a.check_out) return acc;
    return acc + Math.max(0, (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">الحضور والانصراف</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            سجّل حضورك، وسجّل الخروج، وقدّم طلب الإذن بانتظار موافقة الإدارة
          </p>
        </div>
        <div className="w-44">
          <Label htmlFor="month">الشهر</Label>
          <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {/* Today's attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock4 className="h-5 w-5 text-accent" />
            حضوري اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {today ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    today.status === "present"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  }`}
                >
                  {today.status === "present" ? "حاضر" : "إذن معتمد"}
                </span>
                {today.check_in && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <LogIn className="h-4 w-4 text-green-600 dark:text-green-400" />
                    الحضور: {formatDateTime(today.check_in)}
                  </span>
                )}
                {today.check_out && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <LogOut className="h-4 w-4 text-red-500" />
                    الخروج: {formatDateTime(today.check_out)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {today.status === "present" && !today.check_out && (
                  <Button onClick={() => mark.mutate({ status: "present", action: "check_out" })} loading={mark.isPending}>
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                  </Button>
                )}
                {today.status === "present" && !pendingToday && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReqDate(todayStr);
                      setReqOpen(true);
                    }}
                  >
                    <ClipboardList className="h-4 w-4" />
                    طلب إذن
                  </Button>
                )}
                {pendingToday && (
                  <span className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-bold text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400">
                    <Clock4 className="h-4 w-4" />
                    طلب الإذن قيد المراجعة
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              {pendingToday ? (
                <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400">
                  <Clock4 className="h-4 w-4" />
                  لديك طلب إذن قيد مراجعة الإدارة — لا يمكنك تسجيل الحضور حتى صدور القرار
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  لم تسجّل حضورك اليوم بعد
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => mark.mutate({ status: "present", action: "check_in" })}
                  loading={mark.isPending}
                  disabled={pendingToday}
                >
                  <LogIn className="h-4 w-4" />
                  تسجيل الحضور
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReqDate(todayStr);
                    setReqOpen(true);
                  }}
                  disabled={pendingToday}
                >
                  <ClipboardList className="h-4 w-4" />
                  طلب إذن
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My monthly summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard title="أيام الحضور" value={myPresent} icon={CalendarCheck} color="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400" />
        <SummaryCard title="أيام الإذن المعتمدة" value={myPermission} icon={ClipboardList} color="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
        <SummaryCard title="إجمالي الساعات" value={formatHours(myHours)} icon={Timer} color="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" />
        <SummaryCard title="أيام الشهر المسجلة" value={myMonth.length} icon={CalendarDays} color="bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" />
      </div>

      {/* My permission requests this month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            طلبات الإذن الخاصة بي — {month}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-2 font-semibold">التاريخ</th>
                <th className="pb-3 font-semibold">وقت الخروج المتوقع</th>
                <th className="pb-3 font-semibold">الملاحظات</th>
                <th className="pb-3 font-semibold">الحالة</th>
                <th className="pb-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-2 text-slate-600 dark:text-slate-300">{formatDate(r.date)}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300 ltr">
                    {r.leave_time
                      ? new Date(r.leave_time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">{r.notes ?? "—"}</td>
                  <td className="py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", PERMISSION_STATUS_STYLES[r.status])}>
                      {PERMISSION_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="py-3">
                    {r.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => cancel.mutate(r.id)}
                        loading={cancel.isPending}
                      >
                        <X className="h-4 w-4" />
                        إلغاء
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {myRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا توجد طلبات إذن لهذا الشهر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pending permission requests for management */}
      {canSeeReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-accent" />
              طلبات الإذن المعلّقة — بانتظار قرارك
              {pendingRequests.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {pendingRequests.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-2 font-semibold">الموظف</th>
                  <th className="pb-3 font-semibold">التاريخ</th>
                  <th className="pb-3 font-semibold">وقت الخروج المتوقع</th>
                  <th className="pb-3 font-semibold">الملاحظات</th>
                  <th className="pb-3 font-semibold">القرار</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 pr-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {r.employee?.full_name ?? "موظف"}
                        </span>
                        {r.employee?.role && <RoleBadge role={r.employee.role} />}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatDate(r.date)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 ltr">
                      {r.leave_time
                        ? new Date(r.leave_time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{r.notes ?? "—"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => review.mutate({ id: r.id, status: "approved" })}
                          loading={review.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => review.mutate({ id: r.id, status: "rejected" })}
                          loading={review.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                          رفض
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      لا توجد طلبات إذن معلّقة حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Monthly report for managers */}
      {canSeeReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              التقرير الشهري للموظفين
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
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
                {report.map((r) => (
                  <tr
                    key={r.employee_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 pr-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{r.full_name}</span>
                        <RoleBadge role={r.role} />
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-green-600 dark:text-green-400">{r.present_days}</td>
                    <td className="py-3 font-semibold text-amber-600 dark:text-amber-400">{r.permission_days}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{r.total_days}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatHours(r.total_hours)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 ltr">{r.avg_check_in ?? "—"}</td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      لا توجد سجلات حضور لهذا الشهر بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-slate-400">
              {isDriver
                ? "سيظهر تقريرك الشهري أعلاه."
                : "أيام الإذن تُحتسب فقط بعد موافقة الإدارة على الطلب."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Permission request modal */}
      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="طلب إذن">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestPerm.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="req-date">تاريخ الإذن</Label>
            <Input
              id="req-date"
              type="date"
              value={reqDate}
              onChange={(e) => setReqDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="req-time">وقت الخروج المتوقع</Label>
            <Input
              id="req-time"
              type="time"
              value={reqTime}
              onChange={(e) => setReqTime(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              يُقبل الطلب قبل موعد المغادرة بـ 30 دقيقة على الأقل
            </p>
          </div>
          <div>
            <Label htmlFor="req-notes">السبب / ملاحظات (اختياري)</Label>
            <Textarea
              id="req-notes"
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              placeholder="سبب الإذن..."
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setReqOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={requestPerm.isPending}>
              إرسال الطلب
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
