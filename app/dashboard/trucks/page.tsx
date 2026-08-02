"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Pencil, Trash2, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  getTrucks,
  createTruck,
  updateTruck,
  deleteTruck,
  getDrivers,
  type TruckInput,
} from "@/lib/data/api";
import { formatDate } from "@/lib/utils";
import type { Truck as TruckModel } from "@/lib/types";

const empty: TruckInput = {
  plate_number: "",
  model_type: "",
  capacity_tons: 0,
  driver_id: "",
  status: "active",
};

const TRUCK_STATUS: Record<string, string> = {
  active: "نشطة",
  maintenance: "صيانة",
  inactive: "متوقفة",
};

export default function TrucksPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TruckModel | null>(null);

  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: getTrucks });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });

  const mutation = useMutation({
    mutationFn: async (input: TruckInput) => {
      if (editing) await updateTruck(editing.id, input);
      else await createTruck(input);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الشاحنة" : "تمت إضافة الشاحنة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: deleteTruck,
    onSuccess: () => {
      toast.success("تم حذف الشاحنة");
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });

  const active = trucks.filter((t) => t.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">الأسطول والشاحنات</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {trucks.length} شاحنة، {active} نشطة
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          إضافة شاحنة
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trucks.map((t) => (
          <Card key={t.id} className="transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-accent dark:bg-blue-600 dark:text-white">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black tracking-wider text-slate-800 dark:text-white">
                      {t.plate_number}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.model_type ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(t);
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
                      if (confirm("هل أنت متأكد من حذف هذه الشاحنة؟")) del.mutate(t.id);
                    }}
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-slate-400" />
                  السعة: {t.capacity_tons ?? "—"} طن
                </p>
                <p className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400" />
                  السائق: {drivers.find((d) => d.id === t.driver_id)?.full_name ?? "غير مسند"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    t.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                      : t.status === "maintenance"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
                  }`}
                >
                  {TRUCK_STATUS[t.status] ?? t.status}
                </span>
                <span className="text-[11px] text-slate-400">{formatDate(t.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {trucks.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center gap-3 p-16 text-center">
              <Truck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">لا توجد شاحنات في الأسطول بعد</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? "تعديل بيانات الشاحنة" : "إضافة شاحنة جديدة"}>
        <TruckForm
          editing={editing}
          drivers={drivers}
          saving={mutation.isPending}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          onSave={(input) => mutation.mutate(input)}
        />
      </Modal>
    </div>
  );
}

function TruckForm({
  editing,
  drivers,
  saving,
  onCancel,
  onSave,
}: {
  editing: TruckModel | null;
  drivers: { id: string; full_name: string }[];
  saving: boolean;
  onCancel: () => void;
  onSave: (input: TruckInput) => void;
}) {
  const [form, setForm] = useState<TruckInput>(empty);
  const isEditing = !!editing;

  useEffect(() => {
    if (!editing) return;
    setForm({
      plate_number: editing.plate_number,
      model_type: editing.model_type ?? "",
      capacity_tons: editing.capacity_tons ?? 0,
      driver_id: editing.driver_id ?? "",
      status: editing.status,
    });
  }, [editing]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...form,
          capacity_tons: Number(form.capacity_tons) || 0,
          driver_id: form.driver_id || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>رقم اللوحة</Label>
          <Input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required />
        </div>
        <div>
          <Label>الموديل</Label>
          <Input value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>السعة (طن)</Label>
          <Input dir="ltr" type="number" min="0" value={form.capacity_tons} onChange={(e) => setForm({ ...form, capacity_tons: Number(e.target.value) })} />
        </div>
        <div>
          <Label>حالة الشاحنة</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">نشطة</option>
            <option value="maintenance">صيانة</option>
            <option value="inactive">متوقفة</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>السائق المسند</Label>
        <Select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
          <option value="">بدون سائق</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" loading={saving}>
          {isEditing ? "حفظ التعديلات" : "إضافة الشاحنة"}
        </Button>
      </div>
    </form>
  );
}
