import { useCallback, useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";

import Pagination from "@/admin/components/Pagination";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { usePagedList } from "@/admin/hooks/usePagedList";
import { errorMessage } from "@/admin/lib/client";
import type { Message, PageResult } from "@/admin/lib/types";
import MessageDialog from "@/admin/views/MessageDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export default function MessagesView() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [statusFilter, setStatusFilter] = useState("");
  const [active, setActive] = useState<Message | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadPage = useCallback(async (page: number, pageSize: number) => {
    const params = new URLSearchParams({ lang: contentLang, page: String(page), pageSize: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    return client.fetch<PageResult<Message>>(`/admin/messages?${params.toString()}`);
  }, [client, contentLang, statusFilter]);

  const getLoadError = useCallback((err: unknown) => errorMessage(err, t("admin.message.failedLoad")), [t]);
  const handleLoadError = useCallback((message: string) => setStatus(message, "error"), [setStatus]);
  const { items, page, setPage, total, loading, error, reload, pageStart, pageEnd, prevPage, nextPage } =
    usePagedList<Message>({
      pageSize: PAGE_SIZE,
      loadPage,
      getErrorMessage: getLoadError,
      onLoadSuccess: clearStatus,
      onLoadError: handleLoadError,
    });

  async function open(id: number) {
    try {
      const message = await client.fetch<Message>(`/admin/messages/${id}?lang=${contentLang}`);
      setActive(message);
      setDialogOpen(true);
    } catch (err) {
      setStatus(errorMessage(err, t("admin.message.failedLoad")), "error");
    }
  }

  function changeFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const filters: Array<{ value: string; label: string }> = [
    { value: "", label: t("admin.message.all") },
    { value: "0", label: t("admin.message.unread") },
    { value: "1", label: t("admin.message.read") },
  ];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Inbox aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.messages")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.message.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 rounded-md border bg-card p-4">
        <div className="inline-flex rounded-md border p-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={cn(
                "rounded px-3 py-1 text-sm transition-colors",
                statusFilter === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => changeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("admin.common.resultRange", { start: pageStart, end: pageEnd, total })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-20">{t("admin.message.id")}</TableHead>
              <TableHead>{t("admin.message.contact")}</TableHead>
              <TableHead>{t("admin.message.phone")}</TableHead>
              <TableHead>{t("admin.message.message")}</TableHead>
              <TableHead>{t("admin.common.status")}</TableHead>
              <TableHead>{t("admin.message.created")}</TableHead>
              <TableHead>{t("admin.common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {t("admin.message.noMessages")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.contacts || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{item.mobile || "-"}</TableCell>
                  <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                    {item.content || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "1" ? "success" : "muted"}>
                      {item.status === "1" ? t("admin.message.read") : t("admin.message.unread")}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {item.createTime || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => void open(item.id)}>
                      {t("admin.common.open")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border bg-card px-4 py-3">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPrev={prevPage}
          onNext={nextPage}
        />
      </div>

      <MessageDialog
        message={active}
        lang={contentLang}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onChanged={() => void reload()}
      />
    </section>
  );
}
