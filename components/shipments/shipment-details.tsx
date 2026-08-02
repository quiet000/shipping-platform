"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  CalendarClock,
  User,
  Package,
  Building2,
  X,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getShipmentLogs, getShipment, updateShipmentStatus, getDrivers } from "@/lib/data/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  STATUS_LABELS,
  SHIPPING_TYPE_LABELS,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/types";

interface Props {
  shipmentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ShipmentDetailsDrawer({ shipmentId, onClose, onChanged }: Props) {
  const [updating, setUpdating] = useState(false);

  const { data: shipment, refetch: refetchShipment } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => getShipment(shipmentId!),
    enabled: !!shipmentId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["shipment-logs", shipmentId],
    queryFn: () => getShipmentLogs(shipmentId!),
    enabled: !!shipmentId,
  });

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });

  useEffect(() => {
    setUpdating(false);
  }, [shipmentId]);

  if (!shipment) return <Drawer open={!!shipmentId} onClose={onClose} title="تفاصيل الشحنة" />;

  const changeStatus = async (status: ShipmentStatus) => {
    setUpdating(true);
    await updateShipmentStatus(shipment.id, status);
    await refetchShipment();
    onChanged();
    setUpdating(false);
  };

  return (
    <Drawer open={!!shipmentId} onClose={onClose} title={`تفاصيل الشحنة`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy-900 p-4 dark:bg-slate-800">
          <div>
            <p className="text-xs text-slate-300">رقم البوليصة</p>
            <p className="text-lg font-black tracking-widest text-white ltr">
              {shipment.waybill_number}
            </p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <div className="space-y-3">
          {[
            { icon: User, label: "العميل", value: shipment.client_name },
            { icon: Phone, label: "الهاتف", value: shipment.client_phone },
            { icon: Building2, label: "الوكالة", value: shipment.agency?.name ?? "—" },
            { icon: User, label: "المندوب", value: shipment.assigned_driver?.full_name ?? "غير محدد" },
            { icon: MapPin, label: "المدينة", value: shipment.destination_city },
            { icon: MapPin, label: "العنوان", value: shipment.destination_address },
            { icon: Package, label: "نوع الشحن", value: SHIPPING_TYPE_LABELS[shipment.shipping_type] },
            {
              icon: CalendarClock,
              label: "التسليم المتوقع",
              value: formatDate(shipment.expected_delivery_date),
            },
            {
              icon: CalendarClock,
              label: "السعر / التحصيل",
              value: `${shipment.price} ج.م / ${shipment.cod_amount} ج.م`,
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <row.icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="w-28 flex-shrink-0 text-xs font-semibold text-slate-400">{row.label}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
            تحديث الحالة
          </p>
          <Select
            value={shipment.status}
            onChange={(e) => changeStatus(e.target.value as ShipmentStatus)}
            disabled={updating}
          >
            {(Object.keys(STATUS_LABELS) as ShipmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-[11px] text-slate-400">
            تغيير الحالة يُسجَّل تلقائياً في سجل حركة الشحنة.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">سجل حركة الشحنة</p>
          <div className="space-y-4">
            {logs.length === 0 && (
              <p className="text-sm text-slate-400">لا توجد حركات مسجلة بعد</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className="relative flex gap-3 pr-4">
                <span className="absolute right-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {STATUS_LABELS[log.status]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {log.notes || log.location_description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
