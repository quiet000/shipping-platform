"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAgencies, getDrivers, updateShipment } from "@/lib/data/api";
import { daysUntil } from "@/lib/utils";
import { SHIPPING_TYPE_LABELS, type Shipment, type ShippingType } from "@/lib/types";

interface Props {
  shipment: Shipment | null;
  onClose: () => void;
}

export function EditShipmentModal({ shipment, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    destination_address: "",
    destination_city: "",
    shipping_type: "standard" as ShippingType,
    is_fragile: false,
    agency_id: "",
    assigned_driver_id: "",
    price: 0,
    cod_amount: 0,
    expected_delivery_date: "",
  });

  const { data: agencies = [] } = useQuery({ queryKey: ["agencies"], queryFn: getAgencies });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });

  useEffect(() => {
    if (shipment) {
      setForm({
        client_name: shipment.client_name,
        client_phone: shipment.client_phone,
        destination_address: shipment.destination_address,
        destination_city: shipment.destination_city,
        shipping_type: shipment.shipping_type,
        is_fragile: shipment.is_fragile ?? false,
        agency_id: shipment.agency_id ?? "",
        assigned_driver_id: shipment.assigned_driver_id ?? "",
        price: Number(shipment.price) || 0,
        cod_amount: Number(shipment.cod_amount) || 0,
        expected_delivery_date: shipment.expected_delivery_date,
      });
    }
  }, [shipment]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shipment) return;
      await updateShipment(shipment.id, {
        client_name: form.client_name,
        client_phone: form.client_phone,
        destination_address: form.destination_address,
        destination_city: form.destination_city,
        shipping_type: form.shipping_type,
        is_fragile: form.is_fragile,
        agency_id: form.agency_id || null,
        assigned_driver_id: form.assigned_driver_id || null,
        price: Number(form.price) || 0,
        cod_amount: Number(form.cod_amount) || 0,
        expected_delivery_date: form.expected_delivery_date,
      });
    },
    onSuccess: () => {
      toast.success("تم تعديل بيانات الشحنة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", shipment?.id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={!!shipment} onClose={onClose} title="تعديل بيانات الشحنة" className="max-w-2xl">
      {shipment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between rounded-xl bg-navy-900 px-4 py-3 dark:bg-slate-800">
            <div>
              <p className="text-[10px] text-slate-300">رقم البوليصة</p>
              <p className="text-base font-black tracking-widest text-white ltr">
                {shipment.waybill_number}
              </p>
            </div>
            <p className="text-[11px] text-slate-300">
              تعديل البيانات الأساسية فقط — حالة الشحنة تُعدل من القائمة أو من تفاصيل الشحنة.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="is_fragile">هل الشحنة قابلة للكسر؟</Label>
                <Select
                  id="is_fragile"
                  value={form.is_fragile ? "yes" : "no"}
                  onChange={(e) => set("is_fragile", e.target.value === "yes")}
                >
                  <option value="no">لا — غير قابلة للكسر</option>
                  <option value="yes">نعم — قابلة للكسر</option>
                </Select>
              </div>
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
              <Save className="h-4 w-4" />
              حفظ التعديلات
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
