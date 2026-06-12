import { useCallback, useEffect, useState } from "react";
import { FileText, Image as ImageIcon, RefreshCw, Trash2 } from "lucide-react";

import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { ApiError, errorMessage } from "@/admin/lib/client";
import { copyTextToClipboard } from "@/admin/lib/clipboard";
import type { BatchDeleteResult, MediaListResult, MediaObject } from "@/admin/lib/types";
import MediaObjectDialog from "@/admin/views/MediaObjectDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MANAGEMENT_UNSUPPORTED_CODE = 50101;
const PAGE_SIZE = 50;
type MediaMode = "library" | "orphans";

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function isUnsupported(error: unknown): boolean {
  return error instanceof ApiError && error.code === MANAGEMENT_UNSUPPORTED_CODE;
}

export default function MediaView() {
  const { client, setStatus, clearStatus } = useSession();
  const { t } = useLocale();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<MediaObject[]>([]);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [mode, setMode] = useState<MediaMode>("library");
  const [type, setType] = useState<"all" | "image">("all");
  const [prefix, setPrefix] = useState("");
  const [prefixInput, setPrefixInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<MediaObject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadPage = useCallback(
    async ({ reset, nextCursor = "" }: { reset: boolean; nextCursor?: string }) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ type, pageSize: String(PAGE_SIZE) });
      if (prefix) params.set("prefix", prefix);
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const endpoint = mode === "orphans" ? "/admin/media/orphans" : "/admin/media";
      try {
        const result = await client.fetch<MediaListResult>(`${endpoint}?${params.toString()}`);
        setUnsupported(false);
        setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        setCursor(result.nextCursor ?? "");
        setHasMore(result.hasMore);
        clearStatus();
      } catch (err) {
        if (isUnsupported(err)) {
          setUnsupported(true);
          setItems([]);
          setHasMore(false);
          clearStatus();
          return;
        }
        if (reset) setItems([]);
        setError(errorMessage(err, t("admin.media.failedLoad")));
        setStatus(errorMessage(err, t("admin.media.failedLoad")), "error");
      } finally {
        setLoading(false);
      }
    },
    [client, type, prefix, clearStatus, mode, setStatus, t]
  );

  const reload = useCallback(() => loadPage({ reset: true }), [loadPage]);
  const loadMore = useCallback(() => loadPage({ reset: false, nextCursor: cursor }), [cursor, loadPage]);

  useEffect(() => {
    setSelected(new Set());
    void reload();
  }, [reload]);

  function applyPrefix() {
    setPrefix(prefixInput.trim());
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openObject(object: MediaObject) {
    setActive(object);
    setDialogOpen(true);
  }

  async function copyUrl(url: string) {
    try {
      await copyTextToClipboard(url);
      setStatus(t("admin.media.copied"));
    } catch {
      setStatus(t("admin.media.failedCopy"), "error");
    }
  }

  async function removeOne(key: string) {
    if (mode === "orphans") return;
    const confirmed = await confirm({
      description: t("admin.media.deleteConfirm", { key }),
      detail: key,
    });
    if (!confirmed) return;
    try {
      await client.fetch<{ key: string; status: string }>(`/admin/media/object?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((item) => item.key !== key));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setStatus(t("admin.media.deleted"));
    } catch (err) {
      setStatus(errorMessage(err, t("admin.media.failedDelete")), "error");
    }
  }

  async function removeSelected() {
    if (mode === "orphans") return;
    const keys = Array.from(selected);
    if (keys.length === 0) return;
    const confirmed = await confirm({
      description: t("admin.media.batchDeleteConfirm", { n: keys.length }),
    });
    if (!confirmed) return;
    try {
      const result = await client.fetch<BatchDeleteResult>("/admin/media/delete-batch", {
        method: "POST",
        body: JSON.stringify({ keys }),
      });
      const deleted = new Set(result.deleted);
      setItems((prev) => prev.filter((item) => !deleted.has(item.key)));
      setSelected(new Set());
      if (result.errors.length > 0) {
        const first = result.errors[0];
        setStatus(
          t("admin.media.batchDeleted", {
            deleted: result.deleted.length,
            failed: result.errors.length,
            detail: `${first.key}: ${first.message}`,
          }),
          "error"
        );
      } else {
        setStatus(t("admin.media.batchDeleted", { deleted: result.deleted.length, failed: 0, detail: "" }));
      }
    } catch (err) {
      setStatus(errorMessage(err, t("admin.media.failedBatchDelete")), "error");
    }
  }

  function onObjectDeleted(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  if (unsupported) {
    return (
      <section className="grid gap-5">
        <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ImageIcon aria-hidden="true" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{t("admin.nav.mediaLibrary")}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.media.workspaceDesc")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <ImageIcon aria-hidden="true" size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">{t("admin.media.unavailable")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.media.unavailableDesc")}</p>
        </div>
      </section>
    );
  }

  const typeFilters: Array<{ value: "all" | "image"; label: string }> = [
    { value: "all", label: t("admin.common.all") },
    { value: "image", label: t("admin.media.images") },
  ];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ImageIcon aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.mediaLibrary")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.media.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={mode} onValueChange={(value) => setMode(value as MediaMode)}>
            <TabsList>
              <TabsTrigger value="library">{t("admin.media.library")}</TabsTrigger>
              <TabsTrigger value="orphans">{t("admin.media.orphans")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="inline-flex rounded-md border p-1">
            {typeFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={cn(
                  "rounded px-3 py-1 text-sm transition-colors",
                  type === filter.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setType(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={prefixInput}
            onChange={(event) => setPrefixInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyPrefix()}
            placeholder={t("admin.media.filterPrefix")}
            className="h-9 min-w-64 flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={applyPrefix}>
            {t("admin.common.apply")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t(mode === "orphans" ? "admin.media.orphans" : "admin.media.library")}</span>
          <span>
            {items.length} {t("admin.nav.media")}
          </span>
        </div>
      </div>

      {mode === "orphans" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("admin.media.orphanNotice")}
        </div>
      ) : null}

      {mode === "library" && selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-sm">
          <span>{t("admin.media.selected", { n: selected.size })}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t("admin.media.clear")}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void removeSelected()}>
              <Trash2 aria-hidden="true" size={16} />
              {t("admin.media.deleteSelected")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {items.length === 0 && !loading ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          {mode === "orphans" ? t("admin.media.noOrphans") : t("admin.media.noObjects")}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
          {items.map((item) => {
            const checked = selected.has(item.key);
            return (
              <li
                key={item.key}
                className={cn(
                  "group relative overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/40",
                  checked && "ring-2 ring-primary"
                )}
              >
                {mode === "library" ? (
                  <div className="absolute left-2 top-2 z-10">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSelect(item.key)}
                      aria-label={t("admin.common.open") + " " + item.name}
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => openObject(item)}
                  className="flex aspect-square w-full items-center justify-center bg-muted/30"
                  title={item.key}
                >
                  {item.isImage ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      width={320}
                      height={320}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <FileText aria-hidden="true" size={32} className="text-muted-foreground" />
                  )}
                </button>
                <div className="grid gap-1.5 p-2.5">
                  <span className="truncate text-xs font-medium" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatSize(item.size)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 px-2 text-xs"
                      onClick={() => void copyUrl(item.url)}
                    >
                      {t("admin.common.copyUrl")}
                    </Button>
                    {mode === "library" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive"
                        onClick={() => void removeOne(item.key)}
                        aria-label={t("admin.common.delete") + " " + item.name}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-center gap-3 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
        {loading ? <span>{t("admin.common.loading")}</span> : null}
        {hasMore && !loading ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void loadMore()}>
            {t("admin.common.loadMore")}
          </Button>
        ) : null}
        {!hasMore && items.length > 0 ? <span>{t("admin.common.endOfList")}</span> : null}
      </div>

      <MediaObjectDialog
        object={active}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDeleted={onObjectDeleted}
        allowDelete={mode === "library"}
      />
    </section>
  );
}
