import { useEffect, useState } from "react";

import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { Message } from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type MessageDialogProps = {
  message: Message | null;
  lang: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export default function MessageDialog({ message, lang, open, onClose, onChanged }: MessageDialogProps) {
  const { client, setStatus } = useSession();
  const { t } = useLocale();
  const { confirm } = useConfirm();
  const [reply, setReply] = useState("");
  const [read, setRead] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (message) {
      setReply(message.reply || "");
      setRead(message.status === "1");
    }
  }, [message]);

  if (!message) return null;

  const clientInfo = [message.userOs, message.userBs].filter(Boolean).join(" / ") || "-";

  async function save() {
    if (!message) return;
    setPending(true);
    try {
      await client.fetch<{ status: string }>(`/admin/messages/${message.id}?lang=${lang}`, {
        method: "PUT",
        body: JSON.stringify({ reply, status: read ? "1" : "0" }),
      });
      setStatus(t("admin.message.saved"));
      onChanged();
      onClose();
    } catch (error) {
      setStatus(errorMessage(error, t("admin.message.failedSave")), "error");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!message) return;
    const confirmed = await confirm({
      description: t("admin.message.deleteConfirm", { id: message.id }),
      detail: message.contacts || message.mobile || `#${message.id}`,
    });
    if (!confirmed) return;
    setPending(true);
    try {
      await client.fetch<{ status: string }>(`/admin/messages/${message.id}?lang=${lang}`, { method: "DELETE" });
      setStatus(t("admin.message.deleted"));
      onChanged();
      onClose();
    } catch (error) {
      setStatus(errorMessage(error, t("admin.message.failedDelete")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.message.msgTitle", { id: message.id })}</DialogTitle>
          <DialogDescription>{t("admin.message.msgDesc")}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t("admin.message.contact")}</dt>
          <dd>{message.contacts || "-"}</dd>
          <dt className="text-muted-foreground">{t("admin.message.phone")}</dt>
          <dd>{message.mobile || "-"}</dd>
          <dt className="text-muted-foreground">{t("admin.common.status")}</dt>
          <dd>
            <Badge variant={message.status === "1" ? "success" : "muted"}>
              {message.status === "1" ? t("admin.message.read") : t("admin.message.unread")}
            </Badge>
          </dd>
          <dt className="text-muted-foreground">{t("admin.message.client")}</dt>
          <dd>{clientInfo}</dd>
          <dt className="text-muted-foreground">{t("admin.message.message")}</dt>
          <dd className="whitespace-pre-wrap">{message.content || "-"}</dd>
        </dl>

        <Label className="grid gap-2">
          {t("admin.message.reply")}
          <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} />
        </Label>

        <label className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
          <span>{t("admin.message.markAsRead")}</span>
          <Switch checked={read} onCheckedChange={setRead} />
        </label>

        <DialogFooter>
          <Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending}>
            {t("admin.common.delete")}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
