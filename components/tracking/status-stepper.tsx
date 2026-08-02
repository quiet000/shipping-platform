"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Shipment, type ShipmentLog, type ShipmentStatus } from "@/lib/types";
import { CheckCircle2, Warehouse, Truck, PackageCheck, RotateCcw, AlertTriangle } from "lucide-react";

const steps: Array<"in_warehouse" | "out_for_delivery" | "delivered"> = [
  "in_warehouse",
  "out_for_delivery",
  "delivered",
];

const icons = {
  in_warehouse: Warehouse,
  out_for_delivery: Truck,
  delivered: PackageCheck,
};

export function StatusStepper({ shipment, logs }: { shipment: Shipment; logs: ShipmentLog[] }) {
  const status = shipment.status;

  if (status === "returned") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/40">
        <RotateCcw className="h-10 w-10 text-red-500" />
        <p className="font-bold text-red-700 dark:text-red-300">تم إرجاع الشحنة</p>
        <p className="text-sm text-red-600 dark:text-red-400">
          تعذّر تسليم هذه الشحنة وتم إرجاعها إلى المخزن.
        </p>
      </div>
    );
  }

  if (status === "delayed") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-6 text-center dark:border-orange-800 dark:bg-orange-950/40">
        <AlertTriangle className="h-10 w-10 text-orange-500" />
        <p className="font-bold text-orange-700 dark:text-orange-300">الشحنة متأخرة</p>
        <p className="text-sm text-orange-600 dark:text-orange-400">
          يوجد تأخير في تسليم هذه الشحنة ونعمل على حلّه بأسرع وقت.
        </p>
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-5 right-5 left-5 h-0.5 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-0.5 bg-blue-600 transition-all duration-700 dark:bg-blue-500"
            style={{
              width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : "0%",
              marginRight: "auto",
            }}
          />
        </div>
        {steps.map((step, i) => {
          const Icon = icons[step];
          const done = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition",
                  done
                    ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                    : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800",
                  isCurrent && "ring-4 ring-blue-500/20"
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold sm:text-sm",
                  done ? "text-blue-700 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div className="mt-8 space-y-0">
          {logs.map((log, idx) => (
            <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
              {idx < logs.length - 1 && (
                <span className="absolute top-6 right-[7px] h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
              )}
              <span
                className={cn(
                  "relative mt-1.5 h-4 w-4 flex-shrink-0 rounded-full border-4",
                  idx === 0
                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                )}
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {STATUS_LABELS[log.status]}
                  </p>
                  <span className="text-xs text-slate-400">
                    {new Intl.DateTimeFormat("ar-EG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(log.created_at))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {log.notes || log.location_description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
