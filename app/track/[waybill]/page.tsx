"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  MapPin,
  PackageSearch,
  Zap,
  Truck as TruckIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { StatusStepper } from "@/components/tracking/status-stepper";
import { trackShipment } from "@/lib/data/api";
import { formatDate, daysUntil } from "@/lib/utils";
import {
  SHIPPING_TYPE_LABELS,
  type Shipment,
  type ShipmentLog,
} from "@/lib/types";

export default function TrackPage() {
  const params = useParams<{ waybill: string }>();
  const waybill = decodeURIComponent(params.waybill);

  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [logs, setLogs] = useState<ShipmentLog[]>([]);

  useEffect(() => {
    setLoading(true);
    trackShipment(waybill)
      .then((res) => {
        if (res) {
          setShipment(res.shipment);
          setLogs(res.logs);
        } else {
          setShipment(null);
        }
      })
      .finally(() => setLoading(false));
  }, [waybill]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 dark:bg-blue-600">
              <TruckIcon className="h-5 w-5 text-accent" />
            </div>
            <span className="font-black text-navy-900 dark:text-white">شحن إكسبريس</span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <ArrowRight className="h-4 w-4 rotate-180" />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            نتيجة تتبع الشحنة
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            رقم البوليصة:
            <span className="font-black tracking-wider text-blue-600 dark:text-blue-400 ltr">
              {waybill}
            </span>
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : !shipment ? (
          <Card className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <PackageSearch className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">لم يتم العثور على الشحنة</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              تأكد من رقم البوليصة وحاول مرة أخرى.
            </p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="outline">محاولة تتبع شحنة أخرى</Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card className="mb-6 overflow-hidden">
              <div className="bg-navy-900 p-5 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-300">رقم البوليصة</p>
                    <p className="text-xl font-black tracking-widest text-white ltr">
                      {shipment.waybill_number}
                    </p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-slate-400">مدينة الوجهة</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {shipment.destination_city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-slate-400">نوع الشحن</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {SHIPPING_TYPE_LABELS[shipment.shipping_type]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-slate-400">التسليم المتوقع</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formatDate(shipment.expected_delivery_date)}
                      {daysUntil(shipment.expected_delivery_date) >= 0 && (
                        <span className="mr-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          (بعد {daysUntil(shipment.expected_delivery_date)} يوم)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="mb-6 text-lg font-black text-slate-800 dark:text-white">
                مراحل المعالجة
              </h2>
              <StatusStepper shipment={shipment} logs={logs} />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
