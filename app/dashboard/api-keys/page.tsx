"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Key,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAgencies } from "@/lib/data/api";
import type { ApiKey } from "@/lib/types";

async function fetchKeys(token: string): Promise<(ApiKey & { agency?: { name: string } | null })[]> {
  const res = await fetch("/api/keys", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
  return res.json();
}

async function createKey(
  token: string,
  body: { name: string; agency_id: string; permissions: string[]; expires_at?: string | null }
): Promise<{ key: string; id: string; name: string; key_prefix: string }> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
  return res.json();
}

async function deleteKey(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
}

async function toggleKey(token: string, id: string, isActive: boolean): Promise<void> {
  const res = await fetch(`/api/keys/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
}

async function getSessionToken(): Promise<string | null> {
  const { createClient } = await import("@/lib/supabase/client");
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAgency, setFormAgency] = useState("");
  const [formExpiry, setFormExpiry] = useState("");

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: getAgencies,
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const token = await getSessionToken();
      if (!token) throw new Error("Not authenticated");
      return fetchKeys(token);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const token = await getSessionToken();
      if (!token) throw new Error("Not authenticated");
      return createKey(token, {
        name: formName,
        agency_id: formAgency,
        permissions: ["shipments:create", "shipments:read"],
        expires_at: formExpiry || null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setRevealedKey(data.key);
      setFormName("");
      setFormAgency("");
      setFormExpiry("");
      setCreateOpen(false);
      toast.success("تم إنشاء المفتاح — انسخه الآن!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const token = await getSessionToken();
      if (!token) throw new Error("Not authenticated");
      return deleteKey(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("تم حذف المفتاح");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const token = await getSessionToken();
      if (!token) throw new Error("Not authenticated");
      return toggleKey(token, id, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyKey = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">API & Webhooks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            إدارة مفاتيح API للربط الخارجي مع n8n أو أي نظام آخر
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          إنشاء مفتاح جديد
        </Button>
      </div>

      {/* Endpoint info + cURL examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-accent" />
            نقاط الاتصال والأكواد الجاهزة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg bg-slate-100 px-4 py-2 dark:bg-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">POST</span>
              <code className="mr-2 text-sm font-bold text-slate-800 dark:text-slate-200">/api/webhooks/shipments</code>
            </div>
            <div className="rounded-lg bg-slate-100 px-4 py-2 dark:bg-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">GET</span>
              <code className="mr-2 text-sm font-bold text-slate-800 dark:text-slate-200">/api/webhooks/shipments</code>
              <span className="mr-2 text-[10px] text-slate-400">?status=delivered&waybill_number=SHP-123&limit=50</span>
            </div>
          </div>

          {/* POST cURL */}
          <div className="rounded-lg bg-slate-900 p-4 dark:bg-black">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-green-400">POST — إضافة شحنة</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-white"
                onClick={() => {
                  const el = document.getElementById("curl-post");
                  if (el) navigator.clipboard.writeText(el.textContent ?? "");
                  setCopiedId("curl-post");
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === "curl-post" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === "curl-post" ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
            <pre
              id="curl-post"
              className="overflow-x-auto text-[11px] leading-relaxed text-green-300"
              dir="ltr"
            >
{`curl -X POST https://YOUR-DOMAIN.com/api/webhooks/shipments \\
  -H "Authorization: Bearer whk_live_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "waybill_number": "SHP-123456",
    "client_name": "أحمد محمد",
    "client_phone": "01012345678",
    "destination_address": "شارع النصر، المعادي",
    "destination_city": "القاهرة",
    "shipping_type": "standard",
    "price": 50,
    "cod_amount": 200,
    "is_fragile": false
  }'
# لو مش محتاج waybill_number امسح السطر ده — هيتولد تلقائي: SHP-XXXXXX`}</pre>
          </div>

          {/* POST cURL — bulk */}
          <div className="rounded-lg bg-slate-900 p-4 dark:bg-black">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-green-400">POST — إضافة شحنات متعددة</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-white"
                onClick={() => {
                  const el = document.getElementById("curl-bulk");
                  if (el) navigator.clipboard.writeText(el.textContent ?? "");
                  setCopiedId("curl-bulk");
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === "curl-bulk" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === "curl-bulk" ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
            <pre
              id="curl-bulk"
              className="overflow-x-auto text-[11px] leading-relaxed text-green-300"
              dir="ltr"
            >
{`curl -X POST https://YOUR-DOMAIN.com/api/webhooks/shipments \\
  -H "Authorization: Bearer whk_live_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "waybill_number": "SHP-111111",
      "client_name": "أحمد محمد",
      "client_phone": "01012345678",
      "destination_city": "القاهرة",
      "price": 50,
      "cod_amount": 200
    },
    {
      "client_name": "سارة علي",
      "client_phone": "01112345678",
      "destination_city": "الإسكندرية",
      "shipping_type": "express",
      "price": 75
    }
  ]'
# لو مش محتاج waybill_number امسح السطر ده — هيتولد تلقائي: SHP-XXXXXX`}</pre>
          </div>

          {/* GET — all shipments */}
          <div className="rounded-lg bg-slate-900 p-4 dark:bg-black">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">GET — كل شحنات الوكالة</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-white"
                onClick={() => {
                  const el = document.getElementById("curl-get-all");
                  if (el) navigator.clipboard.writeText(el.textContent ?? "");
                  setCopiedId("curl-get-all");
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === "curl-get-all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === "curl-get-all" ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
            <pre
              id="curl-get-all"
              className="overflow-x-auto text-[11px] leading-relaxed text-blue-300"
              dir="ltr"
            >
{`curl -s https://YOUR-DOMAIN.com/api/webhooks/shipments \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .`}</pre>
          </div>

          {/* GET — filter by status */}
          <div className="rounded-lg bg-slate-900 p-4 dark:bg-black">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">GET — تصفية حسب الحالة</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-white"
                onClick={() => {
                  const el = document.getElementById("curl-get-status");
                  if (el) navigator.clipboard.writeText(el.textContent ?? "");
                  setCopiedId("curl-get-status");
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === "curl-get-status" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === "curl-get-status" ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
            <pre
              id="curl-get-status"
              className="overflow-x-auto text-[11px] leading-relaxed text-blue-300"
              dir="ltr"
            >
{`# في المخزن
curl -s "https://YOUR-DOMAIN.com/api/webhooks/shipments?status=in_warehouse" \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .

# خرجت للتوصيل
curl -s "https://YOUR-DOMAIN.com/api/webhooks/shipments?status=out_for_delivery" \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .

# تم التسليم
curl -s "https://YOUR-DOMAIN.com/api/webhooks/shipments?status=delivered" \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .

# المرتجعة
curl -s "https://YOUR-DOMAIN.com/api/webhooks/shipments?status=returned" \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .`}</pre>
          </div>

          {/* GET — search by waybill */}
          <div className="rounded-lg bg-slate-900 p-4 dark:bg-black">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">GET — البحث برقم الشحنة</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-white"
                onClick={() => {
                  const el = document.getElementById("curl-get-waybill");
                  if (el) navigator.clipboard.writeText(el.textContent ?? "");
                  setCopiedId("curl-get-waybill");
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === "curl-get-waybill" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === "curl-get-waybill" ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
            <pre
              id="curl-get-waybill"
              className="overflow-x-auto text-[11px] leading-relaxed text-blue-300"
              dir="ltr"
            >
{`curl -s "https://YOUR-DOMAIN.com/api/webhooks/shipments?waybill_number=SHP-123456" \\
  -H "Authorization: Bearer whk_live_KEY_HERE" | jq .`}</pre>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            استبدل <code className="font-bold">YOUR-DOMAIN.com</code> بنطاق موقعك، و<code className="font-bold">whk_live_KEY_HERE</code> بالمفتاح اللي هتنشأه.
            لو مش محتاج تحدد رقم شحنة (<code className="font-bold">waybill_number</code>)، امسح السطر ده وهيتولد تلقائي.
            الـ agency_id تلقائي من المفتاح — لا تحتاج ترسله.
          </p>
        </CardContent>
      </Card>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-500/10">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400">
            <Key className="h-4 w-4" />
            مفتاح API الجديد — انسخه الآن ولن يظهر مرة أخرى!
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold break-all text-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {revealedKey}
            </code>
            <Button
              size="sm"
              variant={copiedId === "revealed" ? "accent" : "outline"}
              onClick={() => copyKey(revealedKey, "revealed")}
            >
              {copiedId === "revealed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            المفاتيح النشطة ({keys.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="py-8 text-center text-slate-400">جارٍ التحميل...</p>
          ) : keys.length === 0 ? (
            <p className="py-8 text-center text-slate-400">لا توجد مفاتيح بعد — أنشئ مفتاحًا جديدًا</p>
          ) : (
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="pb-3 font-semibold">الاسم</th>
                  <th className="pb-3 font-semibold">المفتاح</th>
                  <th className="pb-3 font-semibold">الوكالة</th>
                  <th className="pb-3 font-semibold">الحالة</th>
                  <th className="pb-3 font-semibold">الصلاحيات</th>
                  <th className="pb-3 font-semibold">آخر استخدام</th>
                  <th className="pb-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-100">{k.name}</td>
                    <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {k.key_prefix}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {(k as { agency?: { name: string } | null }).agency?.name ?? "—"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          k.is_active
                            ? "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
                            : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                        }`}
                      >
                        {k.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.permissions?.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                      {k.last_used_at
                        ? new Date(k.last_used_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
                        : "لم يُستخدم"}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle.mutate({ id: k.id, isActive: !k.is_active })}
                          loading={toggle.isPending}
                          title={k.is_active ? "تعطيل" : "تفعيل"}
                        >
                          {k.is_active ? (
                            <PowerOff className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Power className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذا المفتاح نهائيًا؟")) remove.mutate(k.id);
                          }}
                          loading={remove.isPending}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create key modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء مفتاح API جديد">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="key-name">اسم المفتاح</Label>
            <Input
              id="key-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="مثال: n8n Production"
              required
            />
          </div>
          <div>
            <Label htmlFor="key-agency">الوكالة المرتبطة</Label>
            <select
              id="key-agency"
              value={formAgency}
              onChange={(e) => setFormAgency(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              required
            >
              <option value="">اختر الوكالة...</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              كل الشحنات اللي هتتضاف بالمفتاح ده هتتسجل على الوكالة دي
            </p>
          </div>
          <div>
            <Label htmlFor="key-expiry">تاريخ انتهاء الصلاحية (اختياري)</Label>
            <Input
              id="key-expiry"
              type="date"
              value={formExpiry}
              onChange={(e) => setFormExpiry(e.target.value)}
            />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              الصلاحيات: <span className="font-bold">shipments:create</span> (إضافة شحنات) +{" "}
              <span className="font-bold">shipments:read</span> (قراءة الشحنات)
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={create.isPending}>
              <Key className="h-4 w-4" />
              إنشاء المفتاح
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
