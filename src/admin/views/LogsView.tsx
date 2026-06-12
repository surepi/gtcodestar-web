import { useCallback, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";

import Pagination from "@/admin/components/Pagination";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { usePagedList } from "@/admin/hooks/usePagedList";
import { errorMessage } from "@/admin/lib/client";
import type { LogEntry, PageResult } from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 12;
const ALL_LEVELS = "all";

function levelVariant(level: string): "destructive" | "muted" | "secondary" {
  if (level === "error") return "destructive";
  if (level === "warn") return "secondary";
  return "muted";
}

function clientInfo(parts: Array<string>) {
  return parts.filter(Boolean).join(" / ") || "-";
}

export default function LogsView() {
  const { client, setStatus, clearStatus } = useSession();
  const { t } = useLocale();
  const [level, setLevel] = useState(ALL_LEVELS);
  const [user, setUser] = useState("");
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState({ level: ALL_LEVELS, user: "", keyword: "" });

  const loadPage = useCallback(async (page: number, pageSize: number) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (applied.level && applied.level !== ALL_LEVELS) params.set("level", applied.level);
    if (applied.user) params.set("user", applied.user);
    if (applied.keyword) params.set("keyword", applied.keyword);
    return client.fetch<PageResult<LogEntry>>(`/admin/logs?${params.toString()}`);
  }, [applied, client]);

  const getLoadError = useCallback((err: unknown) => errorMessage(err, t("admin.logs.failedLoad")), [t]);
  const handleLoadError = useCallback((message: string) => setStatus(message, "error"), [setStatus]);
  const { items, page, setPage, total, loading, error, reload, pageStart, pageEnd, prevPage, nextPage } =
    usePagedList<LogEntry>({
      pageSize: PAGE_SIZE,
      loadPage,
      getErrorMessage: getLoadError,
      onLoadSuccess: clearStatus,
      onLoadError: handleLoadError,
    });

  function applyFilters() {
    setApplied({ level, user: user.trim(), keyword: keyword.trim() });
    setPage(1);
  }

  function clearFilters() {
    setLevel(ALL_LEVELS);
    setUser("");
    setKeyword("");
    setApplied({ level: ALL_LEVELS, user: "", keyword: "" });
    setPage(1);
  }

  const levels = [
    { value: ALL_LEVELS, label: t("admin.common.allLevels") },
    { value: "info", label: t("admin.logs.info") },
    { value: "warn", label: t("admin.logs.warn") },
    { value: "error", label: t("admin.logs.error") },
  ];
  const activeFilterCount = [applied.level !== ALL_LEVELS ? applied.level : "", applied.user, applied.keyword].filter(
    Boolean
  ).length;

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ScrollText aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.operationLogs")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.logs.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t("admin.common.allLevels")} />
            </SelectTrigger>
            <SelectContent>
              {levels.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-full sm:w-44"
            placeholder={t("admin.logs.user")}
            value={user}
            onChange={(event) => setUser(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
          />
          <Input
            className="min-w-64 flex-1"
            placeholder={t("admin.logs.keyword")}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
          />
          <Button type="button" variant="outline" size="sm" onClick={applyFilters} disabled={loading}>
            {t("admin.common.apply")}
          </Button>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              {t("admin.common.clearFilters")}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t("admin.common.resultRange", { start: pageStart, end: pageEnd, total })}</span>
          {activeFilterCount > 0 ? (
            <Badge variant="secondary">{t("admin.common.activeFilters", { n: activeFilterCount })}</Badge>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-20">{t("admin.logs.id")}</TableHead>
              <TableHead>{t("admin.logs.level")}</TableHead>
              <TableHead>{t("admin.logs.event")}</TableHead>
              <TableHead>{t("admin.logs.user")}</TableHead>
              <TableHead>{t("admin.logs.client")}</TableHead>
              <TableHead>{t("admin.logs.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {t("admin.logs.noLogs")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell>
                    <Badge variant={levelVariant(item.level)}>{item.level || "-"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate font-medium">{item.event || "-"}</TableCell>
                  <TableCell className="text-sm">{item.createUser || "-"}</TableCell>
                  <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                    {clientInfo([item.userIp, item.userOs, item.userBrowser])}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {item.createTime || "-"}
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
    </section>
  );
}
