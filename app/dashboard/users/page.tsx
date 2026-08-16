"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Plus,
  Power,
  Pencil,
  Trash2,
  Check,
  KeyRound,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { RoleBadge } from "@/components/ui/badge";
import {
  getProfiles,
  adminCreateUser,
  updateProfile,
  deleteProfile,
  adminResetPassword,
  type ProfileInput,
} from "@/lib/data/api";
import { DEFAULT_PASSWORD } from "@/lib/constants";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";

const PERMISSION_OPTIONS = [
  { key: "shipments.view", label: "عرض الشحنات" },
  { key: "shipments.create", label: "إضافة شحنات" },
  { key: "shipments.update", label: "تعديل الشحنات" },
  { key: "shipments.update.status", label: "تغيير حالة الشحنات" },
  { key: "shipments.delete", label: "حذف الشحنات" },
  { key: "shipments.bulk", label: "استيراد من إكسيل" },
  { key: "analytics.view", label: "عرض الإحصائيات" },
  { key: "notifications.view", label: "عرض التنبيهات" },
];

const DEFAULT_PERMS: Record<UserRole, Record<string, boolean>> = {
  admin: { "*": true },
  supervisor: {
    "shipments.view": true,
    "shipments.create": true,
    "shipments.update": true,
    "shipments.update.status": true,
    "shipments.bulk": true,
    "analytics.view": true,
    "notifications.view": true,
  },
  branch_manager: {
    "shipments.view": true,
    "shipments.create": true,
    "shipments.update": true,
    "shipments.update.status": true,
    "shipments.bulk": true,
    "analytics.view": true,
    "notifications.view": true,
  },
  driver: {
    "shipments.view": true,
    "shipments.update.status": true,
    "notifications.view": true,
  },
  accountant: {
    "shipments.view": true,
    "analytics.view": true,
    "notifications.view": true,
  },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetId, setResetId] = useState<Profile | null>(null);

  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: getProfiles });

  const mutation = useMutation({
    mutationFn: async (input: ProfileInput & { password?: string }) => {
      if (editing) await updateProfile(editing.id, input);
      else await adminCreateUser(input);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث بيانات الموظف" : "تمت إضافة الموظف وحسابه بنجاح");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPw = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminResetPassword(id, password),
    onSuccess: () => {
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
      setResetId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleChange = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateProfile(id, { role, custom_permissions: DEFAULT_PERMS[role] }),
    onSuccess: () => {
      toast.success("تم تحديث الدور والصلاحيات");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });

  const toggle = useMutation({
    mutationFn: (p: Profile) => updateProfile(p.id, { is_active: !p.is_active }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الحساب");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const del = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      toast.success("تم حذف الموظف");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">
            الموظفون وإدارة الصلاحيات
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            التحكم في الأدوار والصلاحيات وتفعيل الحسابات
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          إضافة موظف
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">الموظف</th>
                <th className="px-4 py-3 font-semibold">الدور</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-black text-white dark:bg-sky-600">
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{p.full_name}</p>
                        <p className="text-[11px] text-slate-400 ltr">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <RoleBadge role={p.role} />
                      <Select
                        value={p.role}
                        onChange={(e) => roleChange.mutate({ id: p.id, role: e.target.value as UserRole })}
                        className="w-36 py-1 text-xs"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.is_active ? "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-green-500" : "bg-red-500"}`} />
                      {p.is_active ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle.mutate(p)}
                        title={p.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                      >
                        <Power className={`h-4 w-4 ${p.is_active ? "text-green-600" : "text-slate-400"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                        title="تعديل الصلاحيات"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResetId(p)}
                        title="إعادة تعيين كلمة المرور"
                      >
                        <KeyRound className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا الموظف؟")) del.mutate(p.id);
                        }}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    لا يوجد موظفون بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing}
        saving={mutation.isPending}
        onSave={(input) => mutation.mutate(input)}
      />

      <ResetPasswordModal
        profile={resetId}
        onClose={() => setResetId(null)}
        saving={resetPw.isPending}
        onSave={(password) => resetPw.mutate({ id: resetId!.id, password })}
      />
    </div>
  );
}

function ResetPasswordModal({
  profile,
  onClose,
  saving,
  onSave,
}: {
  profile: Profile | null;
  onClose: () => void;
  saving: boolean;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (profile) {
      setPassword("");
      setConfirm("");
    }
  }, [profile]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();
    if (clean.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (clean !== confirm.trim()) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    onSave(clean);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password.trim());
      toast.success("تم نسخ كلمة المرور");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <Modal
      open={!!profile}
      onClose={onClose}
      title={profile ? `إعادة تعيين كلمة مرور: ${profile.full_name}` : ""}
      className="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        {profile && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <KeyRound className="h-4 w-4 flex-shrink-0" />
            <span>
              الحساب: <span dir="ltr" className="font-mono font-bold">{profile.email}</span>
            </span>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between">
            <Label>كلمة المرور الجديدة</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyPassword}
              disabled={!password.trim()}
            >
              <Copy className="h-3.5 w-3.5" />
              نسخ
            </Button>
          </div>
          <Input
            dir="ltr"
            type="text"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <p className="mt-1 text-[11px] text-slate-400">
            تُنسخ الكلمة كما هي دون أي مسافات، وسيستخدمها الموظف عند الدخول التالي.
          </p>
        </div>
        <div>
          <Label>تأكيد كلمة المرور</Label>
          <Input
            dir="ltr"
            type="text"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          عند الحفظ تُبطَل الجلسات المفتوحة للموظف فوراً، وتنتهي صلاحية كلمة المرور القديمة. تأكد من
          تسليمه الكلمة الجديدة بالضبط (انقر «نسخ» إن أردت).
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            <KeyRound className="h-4 w-4" />
            حفظ كلمة المرور
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserModal({
  open,
  onClose,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Profile | null;
  saving: boolean;
  onSave: (input: ProfileInput & { password?: string }) => void;
}) {
  const [form, setForm] = useState<ProfileInput>({
    full_name: "",
    phone: "",
    email: "",
    role: "driver",
    is_active: true,
  });
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const isEditing = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        full_name: editing.full_name,
        phone: editing.phone ?? "",
        email: editing.email,
        role: editing.role,
        license_number: editing.license_number ?? "",
        is_active: editing.is_active,
      });
      setPerms((editing.custom_permissions as Record<string, boolean>) ?? {});
    } else {
      setForm({ full_name: "", phone: "", email: "", role: "driver", is_active: true });
      setPerms({});
    }
    setPassword("");
  }, [open, editing]);

  const togglePerm = (key: string) => {
    setPerms((p) => {
      const next = { ...p };
      next[key] = !(p[key] === true);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "تعديل بيانات وصلاحيات الموظف" : "إضافة موظف جديد"} className="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            role: form.role,
            custom_permissions: perms,
            ...(!isEditing && { password }),
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>الاسم الكامل</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>الدور الوظيفي</Label>
            <Select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                setForm({ ...form, role });
                setPerms(DEFAULT_PERMS[role]);
              }}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!isEditing && (
          <div>
            <Label htmlFor="user-password">كلمة المرور الابتدائية (اختياري)</Label>
            <Input
              id="user-password"
              dir="ltr"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`الافتراضية: ${DEFAULT_PASSWORD}`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              اتركها فارغة ليحصل الموظف على كلمة المرور الافتراضية:{" "}
              <span dir="ltr" className="font-mono font-bold text-amber-600">{DEFAULT_PASSWORD}</span>
              ، وسيغيّرها بنفسه بعد أول دخول.
            </p>
          </div>
        )}

        {form.role !== "admin" && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <Label className="mb-0">الصلاحيات المخصصة</Label>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-700">
              {PERMISSION_OPTIONS.map((opt) => {
                const checked = perms[opt.key] === true;
                return (
                  <label
                    key={opt.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      checked
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-sky-600"
                      checked={checked}
                      onChange={() => togglePerm(opt.key)}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            <Check className="h-4 w-4" />
            {isEditing ? "حفظ التعديلات" : "إضافة الموظف"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
