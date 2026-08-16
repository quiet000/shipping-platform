"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePassword } from "@/lib/data/api";

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (next !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (next === current) {
      toast.error("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="تغيير كلمة المرور" className="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="pw-current">كلمة المرور الحالية</Label>
          <Input
            id="pw-current"
            dir="ltr"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <Label htmlFor="pw-next">كلمة المرور الجديدة</Label>
          <Input
            id="pw-next"
            dir="ltr"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <Label htmlFor="pw-confirm">تأكيد كلمة المرور الجديدة</Label>
          <Input
            id="pw-confirm"
            dir="ltr"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            <KeyRound className="h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        </div>
      </form>
    </Modal>
  );
}
