"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAgencies, getDrivers, createShipment, type ShipmentInput } from "@/lib/data/api";
import { generateWaybillNumber, daysUntil } from "@/lib/utils";
import { STATUS_LABELS, SHIPPING_TYPE_LABELS, type ShipmentStatus, type ShippingType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const empty: Omit<ShipmentInput, "expected_delivery_date"> & {
  expected_delivery_date: string;
} = {
  client_name: "",
  client_phone: "",
  destination_address: "",
  destination_city: "",
  waybill_number: "",
  shipping_type: "standard",
  status: "in_warehouse",
  agency_id: "",
  assigned_driver_id: "",
  price: 0,
  cod_amount: 0,
  expected_delivery_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
};

export function AddShipmentModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [useAutoWaybill, setUseAutoWaybill] = useState(true);

  const { data: agencies = [] } = useQuery({ queryKey: ["agencies"], queryFn: getAgencies });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });

  useEffect(() => {
    if (open) {
      setForm({ ...empty, waybill_number: generateWaybillNumber() });
      setUseAutoWaybill(true);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      toast.success("تمت إضافة الشحنة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      waybill_number: form.waybill_number,
      agency_id: form.agency_id || undefined,
      assigned_driver_id: form.assigned_driver_id || undefined,
      price: Number(form.price) || 0,
      cod_amount: Number(form.cod_amount) || 0,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة شحنة جديدة" className="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>رقم البوليصة</Label>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                value={form.waybill_number}
                onChange={(e) => set("waybill_number", e.target.value)}
                disabled={!useAutoWaybill}
                className="text-center font-bold tracking-wider"
              />
              <button
                type="button"
                title={useAutoWaybill ? "تحرير يدوي" : "توليد رقم تلقائي"}
                onClick={() => {
                  if (useAutoWaybill) {
                    setUseAutoWaybill(false);
                  } else {
                    setUseAutoWaybill(true);
                    set("waybill_number", generateWaybillNumber());
                  }
                }}
                className="flex h-9 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-300 text-amber-500 transition hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              يمكنك الكتابة يدوياً أو الضغط على الأيقونة لتوليد رقم عشوائي فريد
            </p>
          </div>
          <div>
            <Label htmlFor="status">حالة الشحنة البدائية</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ShipmentStatus)}
            >
              {(Object.keys(STATUS_LABELS) as ShipmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="client_name">اسم العميل</Label>
            <Input
              id="client_name"
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="client_phone">رقم هاتف العميل</Label>
            <Input
              id="client_phone"
              dir="ltr"
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="destination_address">عنوان التوصيل</Label>
            <Textarea
              id="destination_address"
              value={form.destination_address}
              onChange={(e) => set("destination_address", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="destination_city">مدينة الوجهة</Label>
            <Input
              id="destination_city"
              value={form.destination_city}
              onChange={(e) => set("destination_city", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="expected_delivery_date">التسليم المتوقع</Label>
            <Input
              id="expected_delivery_date"
              type="date"
              value={form.expected_delivery_date}
              onChange={(e) => set("expected_delivery_date", e.target.value)}
              required
            />
            {form.expected_delivery_date && (
              <p className="mt-1 text-[11px] text-slate-400">
                {daysUntil(form.expected_delivery_date) >= 0
                  ? `بعد ${daysUntil(form.expected_delivery_date)} يوم`
                  : "تاريخ فات موعده"}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="shipping_type">نوع الشحن</Label>
            <Select
              id="shipping_type"
              value={form.shipping_type}
              onChange={(e) => set("shipping_type", e.target.value as ShippingType)}
            >
              <option value="standard">{SHIPPING_TYPE_LABELS.standard}</option>
              <option value="express">{SHIPPING_TYPE_LABELS.express}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="agency_id">الوكالة / الشركة المتعاقدة</Label>
            <Select
              id="agency_id"
              value={form.agency_id}
              onChange={(e) => set("agency_id", e.target.value)}
            >
              <option value="">بدون وكالة</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="driver">المندوب / السائق</Label>
            <Select
              id="driver"
              value={form.assigned_driver_id}
              onChange={(e) => set("assigned_driver_id", e.target.value)}
            >
              <option value="">غير محدد</option>
              {drivers
                .filter((d) => d.is_active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">سعر الشحن (ج.م)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                dir="ltr"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="cod">التحصيل عند الاستلام</Label>
              <Input
                id="cod"
                type="number"
                min="0"
                dir="ltr"
                value={form.cod_amount}
                onChange={(e) => set("cod_amount", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            حفظ الشحنة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
