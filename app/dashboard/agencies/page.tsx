"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  BarChart3,
  Package,
  PackageCheck,
  Clock4,
  RotateCcw,
  CircleDollarSign,
  Wallet,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  getAgencyStats,
  type AgencyInput,
} from "@/lib/data/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Agency } from "@/lib/types";

const emptyAgency: AgencyInput = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  commission_percent: 10,
};

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";

  const { data: agencies = [] } = useQuery({ queryKey: ["agencies"], queryFn: getAgencies });

  const mutation = useMutation({
    mutationFn: async (input: AgencyInput) => {
      if (editing) await updateAgency(editing.id, input);
      else await createAgency(input);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الوكالة" : "تمت إضافة الوكالة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deleteAgency,
    onSuccess: () => {
      toast.success("تم حذف الوكالة");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">الوكلاء والشركات المتعاقدة</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {agencies.length} شركة شريكة في التوزيع
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            إضافة وكيل
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {agencies.map((a) => (
          <Card key={a.id} className="transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-sky-300 dark:bg-blue-600 dark:text-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white">{a.name}</h3>
                    {a.contact_person && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDrawerId(a.id)} title="عرض الإحصائيات">
                    <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(a);
                          setModalOpen(true);
                        }}
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذه الوكالة؟")) del.mutate(a.id);
                        }}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="ltr">{a.phone}</span>
                </p>
                {a.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="ltr">{a.email}</span>
                  </p>
                )}
                {a.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {a.address}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  انضم في {formatDate(a.created_at)}
                </span>
                <Button variant="outline" size="sm" onClick={() => setDrawerId(a.id)}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  عرض الإحصائيات
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {agencies.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-center gap-3 p-16 text-center">
              <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">لا توجد وكالات بعد</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AgencyModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSave={(input) => mutation.mutate(input)}
        saving={mutation.isPending}
      />

      <AgencyStatsDrawer agencyId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}

function AgencyModal({
  open,
  onClose,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  editing: Agency | null;
  onSave: (input: AgencyInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AgencyInput>(emptyAgency);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        contact_person: editing.contact_person ?? "",
        phone: editing.phone,
        email: editing.email ?? "",
        address: editing.address ?? "",
        commission_percent: editing.commission_percent ?? 10,
      });
    } else {
      setForm(emptyAgency);
    }
  }, [open, editing]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "تعديل بيانات الوكيل" : "إضافة وكيل جديد"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="space-y-4"
      >
        <div>
          <Label>اسم الشركة</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>مسؤول التواصل</Label>
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label>البريد الإلكتروني</Label>
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>العنوان</Label>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Label>نسبة العمولة على التحصيل (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            dir="ltr"
            value={form.commission_percent ?? 10}
            onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            تُحسب العمولة تلقائياً من إجمالي المبالغ المحصلة.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "حفظ التعديلات" : "إضافة الوكيل"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AgencyStatsDrawer({
  agencyId,
  onClose,
}: {
  agencyId: string | null;
  onClose: () => void;
}) {
  const { data: agency } = useQuery({
    queryKey: ["agency", agencyId],
    queryFn: () => getAgencies().then((list) => list.find((a) => a.id === agencyId) ?? null),
    enabled: !!agencyId,
  });
  const { data: stats } = useQuery({
    queryKey: ["agency-stats", agencyId],
    queryFn: () => getAgencyStats(agencyId!),
    enabled: !!agencyId,
    refetchInterval: 15_000,
  });

  const items = [
    { icon: Package, label: "إجمالي الأوردرات", value: stats?.total ?? 0, color: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
    { icon: PackageCheck, label: "تم التسليم", value: stats?.delivered ?? 0, color: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400" },
    { icon: Clock4, label: "قيد المعالجة", value: stats?.pending ?? 0, color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400" },
    { icon: RotateCcw, label: "مرتجعات", value: stats?.returned ?? 0, color: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" },
    { icon: Package, label: "إجمالي قيمة الطلبات", value: formatCurrency(stats?.totalValue ?? 0), color: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
    { icon: Wallet, label: "المبالغ المحصلة", value: formatCurrency(stats?.collected ?? 0), color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
    { icon: Clock4, label: "مبالغ معلقة", value: formatCurrency(stats?.pendingValue ?? 0), color: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
    { icon: Percent, label: `العمولة المستحقة (${stats?.commissionPercent ?? 10}%)`, value: formatCurrency(stats?.commission ?? 0), color: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" },
  ];

  return (
    <Drawer open={!!agencyId} onClose={onClose} title={`إحصائيات ${agency?.name ?? ""}`}>
      <div className="space-y-4">
        <div className="rounded-xl bg-navy-900 p-4 dark:bg-slate-800">
          <p className="text-sm text-slate-300">تقرير أداء الشركة الشريكة</p>
          <div className="mt-3 flex items-center gap-2 text-2xl font-black text-accent">
            <CircleDollarSign className="h-6 w-6" />
            {formatCurrency(stats?.collected ?? 0)}
          </div>
          <p className="mt-1 text-xs text-slate-400">إجمالي المحصّل من الشحنات المسلمة</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((x) => (
            <div key={x.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${x.color}`}>
                <x.icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-lg font-black text-slate-800 dark:text-white">{x.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{x.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
