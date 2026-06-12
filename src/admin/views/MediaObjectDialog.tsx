import { useEffect, useState } from "react";

import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import { copyTextToClipboard } from "@/admin/lib/clipboard";
import type { MediaObject } from "@/admin/lib/types";
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

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

export type MediaObjectDialogProps = {
  object: MediaObject | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (key: string) => void;
  allowDelete?: boolean;
};

export default function MediaObjectDialog({
  object,
  open,
  onClose,
  onDeleted,
  allowDelete = true,
}: MediaObjectDialogProps) {
  const { client, setStatus } = useSession();
  const { t } = useLocale();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<MediaObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !object) {
      setDetail(null);
      return;
    }
    setDetail(object);
    let cancelled = false;
    setLoading(true);
    client
      .fetch<MediaObject>(`/admin/media/object?key=${encodeURIComponent(object.key)}`)
      .then((info) => {
        if (!cancelled) setDetail(info);
      })
      .catch((error) => {
        if (!cancelled) setStatus(errorMessage(error, t("admin.media.failedLoadMeta")), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, object, client, setStatus, t]);

  if (!object) return null;
  const current = detail ?? object;

  async function copyUrl() {
    try {
      await copyTextToClipboard(current.url);
      setStatus(t("admin.media.copied"));
    } catch {
      setStatus(t("admin.media.failedCopy"), "error");
    }
  }

  async function remove() {
    const confirmed = await confirm({
      description: t("admin.media.deleteConfirm", { key: current.key }),
      detail: current.key,
    });
    if (!confirmed) return;
    setPending(true);
    try {
      await client.fetch<{ key: string; status: string }>(
        `/admin/media/object?key=${encodeURIComponent(current.key)}`,
        {
          method: "DELETE",
        }
      );
      setStatus(t("admin.media.deleted"));
      onDeleted(current.key);
      onClose();
    } catch (error) {
      setStatus(errorMessage(error, t("admin.media.failedDelete")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">{current.name}</DialogTitle>
          <DialogDescription>{t("admin.media.metadataTitle")}</DialogDescription>
        </DialogHeader>

        {current.isImage ? (
          <div className="flex justify-center rounded-md border bg-muted/30 p-2">
            <img
              src={current.url}
              alt={current.name}
              width={512}
              height={256}
              className="max-h-64 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t("admin.media.key")}</dt>
          <dd className="break-all">{current.key}</dd>
          <dt className="text-muted-foreground">{t("admin.media.type")}</dt>
          <dd>
            {current.contentType || "-"}{" "}
            {current.isImage ? <Badge variant="muted">{t("admin.media.image")}</Badge> : null}
          </dd>
          <dt className="text-muted-foreground">{t("admin.media.size")}</dt>
          <dd>{formatSize(current.size)}</dd>
          <dt className="text-muted-foreground">{t("admin.media.modified")}</dt>
          <dd>{current.lastModified || "-"}</dd>
          {current.etag ? (
            <>
              <dt className="text-muted-foreground">{t("admin.media.etag")}</dt>
              <dd className="break-all">{current.etag}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t("admin.media.url")}</dt>
          <dd className="break-all">
            <a href={current.url} target="_blank" rel="noreferrer" className="underline">
              {current.url}
            </a>
          </dd>
        </dl>
        {loading ? <p className="text-xs text-muted-foreground">{t("admin.common.loading")}</p> : null}

        <DialogFooter>
          {allowDelete ? (
            <Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending}>
              {pending ? t("admin.common.deleting") : t("admin.common.delete")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void copyUrl()}>
            {t("admin.common.copyUrl")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
