"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { FileSpreadsheet, UploadCloud, Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getAgencies, getDrivers, createShipmentsBulk, type ShipmentInput } from "@/lib/data/api";
import { generateWaybillNumber } from "@/lib/utils";
import type { ShipmentStatus, ShippingType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const HEADER_MAP: Record<string, keyof ShipmentInput> = {
  "رقم البوليصة": "waybill_number",
  "البوليصة": "waybill_number",
  waybill_number: "waybill_number",
  "اسم العميل": "client_name",
  "العميل": "client_name",
  client_name: "client_name",
  "رقم الهاتف": "client_phone",
  "رقم الموبايل": "client_phone",
  "الهاتف": "client_phone",
  client_phone: "client_phone",
  "عنوان التوصيل": "destination_address",
  "العنوان": "destination_address",
  destination_address: "destination_address",
  "المدينة": "destination_city",
  "مدينة الوجهة": "destination_city",
  destination_city: "destination_city",
  "نوع الشحن": "shipping_type",
  shipping_type: "shipping_type",
  "الحالة": "status",
  status: "status",
  "تاريخ التسليم المتوقع": "expected_delivery_date",
  "تاريخ التسليم": "expected_delivery_date",
  expected_delivery_date: "expected_delivery_date",
  "السعر": "price",
  price: "price",
  "التحصيل عند الاستلام": "cod_amount",
  "مبلغ التحصيل": "cod_amount",
  cod_amount: "cod_amount",
};

const SHIPPING_TYPE_VALUE: Record<string, ShippingType> = {
  سريع: "express",
  express: "express",
  عادي: "standard",
  عادية: "standard",
  standard: "standard",
};

const STATUS_VALUE: Record<string, ShipmentStatus> = {
  "في المخزن": "in_warehouse",
  "خرج للتوصيل": "out_for_delivery",
  "تم التسليم": "delivered",
  مرتجع: "returned",
  متأخرة: "delayed",
  in_warehouse: "in_warehouse",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  returned: "returned",
  delayed: "delayed",
};

function excelDateToISO(value: unknown): string {
  if (typeof value === "number") {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(value) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(value ?? "").trim();
  if (!s) return new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function BulkImportModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ShipmentInput[]>([]);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [agencyId, setAgencyId] = useState("");

  const { data: agencies = [] } = useQuery({ queryKey: ["agencies"], queryFn: getAgencies });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: getDrivers });

  const rowsWithDefaults = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        agency_id: agencyId || r.agency_id,
        waybill_number: r.waybill_number || generateWaybillNumber(),
      })),
    [rows, agencyId]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const total = rowsWithDefaults.length;
      for (let i = 0; i < total; i++) {
        await createShipmentsBulk([rowsWithDefaults[i]]);
        setProgress(Math.round(((i + 1) / total) * 100));
      }
    },
    onSuccess: () => {
      toast.success(`تم استيراد ${rowsWithDefaults.length} شحنة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setFileName("");
    setRows([]);
    setProgress(0);
    setAgencyId("");
  };

  const parseFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        if (json.length === 0) {
          toast.error("الملف فارغ أو لا يحتوي على بيانات");
          return;
        }

        const headers = Object.keys(json[0]).map((h) => h.trim());
        const mapped: ShipmentInput[] = json.map((row) => {
          const out: Partial<Record<keyof ShipmentInput, unknown>> = {};
          for (const raw of headers) {
            const field = HEADER_MAP[raw];
            if (!field) continue;
            const value = row[raw];
            if (field === "shipping_type")
              out.shipping_type = SHIPPING_TYPE_VALUE[String(value).trim()] ?? "standard";
            else if (field === "status")
              out.status = STATUS_VALUE[String(value).trim()] ?? "in_warehouse";
            else if (field === "expected_delivery_date")
              out.expected_delivery_date = excelDateToISO(value);
            else if (field === "price" || field === "cod_amount")
              out[field] = Number(value) || 0;
            else out[field] = value;
          }
          return {
            client_name: String(out.client_name ?? ""),
            client_phone: String(out.client_phone ?? ""),
            destination_address: String(out.destination_address ?? ""),
            destination_city: String(out.destination_city ?? ""),
            waybill_number: out.waybill_number
              ? String(out.waybill_number)
              : undefined,
            shipping_type: (out.shipping_type as ShippingType) ?? "standard",
            status: (out.status as ShipmentStatus) ?? "in_warehouse",
            expected_delivery_date: String(out.expected_delivery_date ?? ""),
            price: Number(out.price) || 0,
            cod_amount: Number(out.cod_amount) || 0,
          };
        });

        const valid = mapped.filter(
          (m) => m.client_name && m.client_phone && m.destination_city
        );
        if (valid.length === 0) {
          toast.error("لم يتم العثور على أعمدة صحيحة. تأكد من ترويسات الأعمدة.");
          return;
        }
        setRows(valid);
        setFileName(file.name);
        toast.success(`تم قراءة ${valid.length} صف من الملف`);
      } catch {
        toast.error("تعذّر قراءة الملف، تأكد من أنه ملف إكسيل صحيح");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        "رقم البوليصة": "SHP-123456",
        "اسم العميل": "أحمد محمد",
        "رقم الهاتف": "01234567890",
        "عنوان التوصيل": "شارع النيل - عمارة 5",
        "المدينة": "القاهرة",
        "نوع الشحن": "عادي",
        "الحالة": "في المخزن",
        "تاريخ التسليم المتوقع": "2026-01-15",
        "السعر": 100,
        "التحصيل عند الاستلام": 500,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الشحنات");
    XLSX.writeFile(wb, "shipments-template.xlsx");
  };

  return (
    <Modal open={open} onClose={onClose} title="استيراد شحنات من ملف إكسيل" className="max-w-xl">
      <div className="space-y-5">
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          <Download className="h-4 w-4" />
          تحميل قالب الإكسيل الجاهز
        </button>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) parseFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
              : "border-slate-300 hover:border-blue-400 dark:border-slate-700"
          }`}
        >
          <FileSpreadsheet className="h-12 w-12 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">
              اسحب وأفلت الملف هنا أو اضغط للاختيار
            </p>
            <p className="mt-1 text-xs text-slate-400">يدعم ملفات .xlsx و .csv</p>
          </div>
          {fileName && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
              {fileName}
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) parseFile(f);
            e.target.value = "";
          }}
        />

        {rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تعيين الوكالة للشحنات المستوردة
                </label>
                <Select value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
                  <option value="">بدون وكالة</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="pb-2 text-xs text-slate-400">
                وجدنا {rows.length} شحنة صالحة للاستيراد
              </p>
            </div>

            {mutation.isPending ? (
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>جارٍ رفع الشحنات...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={() => mutation.mutate()}
                disabled={rows.length === 0}
              >
                <UploadCloud className="h-5 w-5" />
                استيراد {rows.length} شحنة
              </Button>
            )}
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            يتم معالجة الشحنات الآن...
          </div>
        )}
      </div>
    </Modal>
  );
}
