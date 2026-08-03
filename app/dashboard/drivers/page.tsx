"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  User,
  Phone,
  Mail,
  IdCard,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { RoleBadge } from "@/components/ui/badge";
import {
  getDrivers,
  adminCreateUser,
  updateProfile,
  deleteProfile,
  getTrucks,
  type ProfileInput,
} from "@/lib/data/api";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const empty: ProfileInput = {
  full_name: "",
  phone: "",
  email: "",
  role: "driver",
  license_number: "",
  is_active: true,
};

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: getTrucks });

  const mutation = useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (editing) await updateProfile(editing.id, input);
      else await adminCreateUser(input);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث بيانات المندوب" : "تمت إضافة المندوب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      toast.success("تم حذف المندوب");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const toggle = useMutation({
    mutationFn: (p: Profile) => updateProfile(p.id, { is_active: !p.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });

  const truckFor = (driverId: string) =>
    trucks.find((t) => t.driver_id === driverId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">المناديب والسائقون</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {drivers.length} مندوب، {drivers.filter((d) => d.is_active).length} نشط
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          إضافة مندوب
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">المندوب</th>
                <th className="px-4 py-3 font-semibold">بيانات التواصل</th>
                <th className="px-4 py-3 font-semibold">رقم الرخصة</th>
                <th className="px-4 py-3 font-semibold">الشاحنة المسندة</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-black text-white dark:bg-blue-600">
                        {d.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{d.full_name}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(d.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="ltr">{d.phone ?? "—"}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="ltr">{d.email}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <IdCard className="h-3.5 w-3.5 text-slate-400" />
                      <span className="ltr">{d.license_number ?? "—"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {truckFor(d.id)?.plate_number ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={d.role} />
                    <span className={`mr-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
                      {d.is_active ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle.mutate(d)}
                        title={d.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                      >
                        <Power className={`h-4 w-4 ${d.is_active ? "text-green-600" : "text-slate-400"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(d);
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
                          if (confirm("هل أنت متأكد من حذف هذا المندوب؟")) del.mutate(d.id);
                        }}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    لا يوجد مناديب بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}>
        <DriverForm
          editing={editing}
          saving={mutation.isPending}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          onSave={(input) => mutation.mutate(input)}
        />
      </Modal>
    </div>
  );
}

function DriverForm({
  editing,
  saving,
  onCancel,
  onSave,
}: {
  editing: Profile | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ProfileInput) => void;
}) {
  const [form, setForm] = useState<ProfileInput>(empty);
  const isEditing = !!editing;

  useEffect(() => {
    if (!editing) return;
    setForm({
      full_name: editing.full_name,
      phone: editing.phone ?? "",
      email: editing.email,
      role: editing.role,
      license_number: editing.license_number ?? "",
      is_active: editing.is_active,
    });
  }, [editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>الاسم الكامل</Label>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>رقم الهاتف</Label>
          <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label>البريد الإلكتروني</Label>
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
      </div>
      <div>
        <Label>رقم رخصة القيادة</Label>
        <Input dir="ltr" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
      </div>
      <div>
        <Label>الدور</Label>
        <Select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as ProfileInput["role"] })}
        >
          <option value="driver">سائق / مندوب</option>
          <option value="supervisor">مشرف</option>
          <option value="branch_manager">مدير فرع</option>
        </Select>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" loading={saving}>
          {isEditing ? "حفظ التعديلات" : "إضافة المندوب"}
        </Button>
      </div>
    </form>
  );
}
