import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { ShipmentStatus, UserRole } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS, ROLE_BADGE, ROLE_LABELS } from "@/lib/types";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <Badge className={STATUS_COLORS[status]}>
      <span className={`h-1.5 w-1.5 rounded-full ${{
        in_warehouse: "bg-amber-500",
        out_for_delivery: "bg-sky-500",
        delivered: "bg-green-500",
        returned: "bg-red-500",
        delayed: "bg-amber-500",
      }[status]}`} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={ROLE_BADGE[role]}>{ROLE_LABELS[role]}</Badge>;
}
