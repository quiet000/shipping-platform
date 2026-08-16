"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileSpreadsheet, Search, Eye, Pencil, Trash2, AlertTriangle, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { AddShipmentModal } from "@/components/shipments/add-shipment-modal";
import { BulkImportModal } from "@/components/shipments/bulk-import-modal";
import { ShipmentDetailsDrawer } from "@/components/shipments/shipment-details";
import { EditShipmentModal } from "@/components/shipments/edit-shipment-modal";
import { getShipments, getAgencies, updateShipmentStatus, deleteShipment } from "@/lib/data/api";
import { formatDate, daysUntil, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABELS,
  SHIPPING_TYPE_LABELS,
  type ShipmentStatus,
  type Shipment,
} from "@/lib/types";

export default function ShipmentsPage() {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [agency, setAgency] = useState("");
  const [driver, setDriver] = useState("");
  const [date, setDate] = useState("");

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: () => getShipments(),
    refetchInterval: 30_000,
  });

  const { data: agencies = [] } = useQuery({ queryKey: ["agencies"], queryFn: getAgencies });

  const isDriver = user?.role === "driver";
  const isAdmin = user?.role === "admin";
  const canBulk = can("shipments.bulk");
  const editShipment = shipments.find((s) => s.id === editId) ?? null;

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      if (isDriver && s.assigned_driver_id !== user?.id) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const hay = `${s.waybill_number} ${s.client_name} ${s.client_phone} ${s.destination_city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && s.status !== status) return false;
      if (type && s.shipping_type !== type) return false;
      if (agency && s.agency_id !== agency) return false;
      if (driver && s.assigned_driver_id !== driver) return false;
      if (date && s.expected_delivery_date !== date) return false;
      return true;
    });
  }, [shipments, search, status, type, agency, driver, date, isDriver, user?.id]);

  const quickStatus = async (id: string, value: ShipmentStatus) => {
    await updateShipmentStatus(id, value, undefined, user?.id);
    queryClient.invalidateQueries({ queryKey: ["shipments"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const handleDelete = async (s: Shipment) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشحنة ${s.waybill_number}؟ سيتم حذف سجلها نهائياً.`)) return;
    try {
      await deleteShipment(s.id);
      toast.success("تم حذف الشحنة");
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["agency-stats"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">إدارة الشحنات</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} من أصل {shipments.length} شحنة
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBulk && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              استيراد من Excel
            </Button>
          )}
          {can("shipments.create") && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              إضافة شحنة
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
            <div className="relative col-span-2">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="بحث بالبوليصة أو العميل أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              {(Object.keys(STATUS_LABELS) as ShipmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">كل الأنواع</option>
              <option value="standard">عادي</option>
              <option value="express">سريع</option>
            </Select>
            {!isDriver && (
              <Select value={agency} onChange={(e) => setAgency(e.target.value)}>
                <option value="">كل الوكلاء</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
            {!isDriver && (
              <Select value={driver} onChange={(e) => setDriver(e.target.value)}>
                <option value="">كل المناديب</option>
                {[...new Map(shipments.filter((s) => s.assigned_driver).map((s) => [s.assigned_driver!.full_name, s.assigned_driver!.full_name])).values()].map(
                  (name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  )
                )}
              </Select>
            )}
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={!isDriver ? "" : "col-span-1"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">البوليصة</th>
                <th className="px-4 py-3 font-semibold">العميل</th>
                <th className="px-4 py-3 font-semibold">المدينة</th>
                <th className="px-4 py-3 font-semibold">الوكالة</th>
                <th className="px-4 py-3 font-semibold">المندوب</th>
                <th className="px-4 py-3 font-semibold">التسليم المتوقع</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const overdue = daysUntil(s.expected_delivery_date) < 0 && s.status !== "delivered";
                return (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tracking-wider text-navy-900 dark:text-white ltr">
                          {s.waybill_number}
                        </span>
                        {overdue && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {s.is_fragile && (
                          <PackageOpen className="h-4 w-4 text-amber-500" aria-label="قابلة للكسر" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{SHIPPING_TYPE_LABELS[s.shipping_type]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{s.client_name}</p>
                      <p className="text-[11px] text-slate-400 ltr">{s.client_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.destination_city}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.agency?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.assigned_driver?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-slate-600 dark:text-slate-300", overdue && "font-bold text-red-600 dark:text-red-400")}>
                        {formatDate(s.expected_delivery_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {can("shipments.update.status") ? (
                        <Select
                          value={s.status}
                          onChange={(e) => quickStatus(s.id, e.target.value as ShipmentStatus)}
                          className="w-32 py-1 text-xs"
                        >
                          {(Object.keys(STATUS_LABELS) as ShipmentStatus[]).map((st) => (
                            <option key={st} value={st}>
                              {STATUS_LABELS[st]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <StatusBadge status={s.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {can("shipments.delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(s)}
                            title="حذف الشحنة"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditId(s.id)}
                            title="تعديل بيانات الشحنة"
                          >
                            <Pencil className="h-4 w-4 text-sky-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setViewId(s.id)} title="عرض التفاصيل">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    لا توجد شحنات مطابقة لمعايير البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AddShipmentModal open={addOpen} onClose={() => setAddOpen(false)} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <EditShipmentModal shipment={editShipment} onClose={() => setEditId(null)} />
      <ShipmentDetailsDrawer
        shipmentId={viewId}
        onClose={() => setViewId(null)}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["shipments"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          queryClient.invalidateQueries({ queryKey: ["agency-stats"] });
        }}
      />
    </div>
  );
}
