import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";

import Pagination from "@/admin/components/Pagination";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { usePagedList } from "@/admin/hooks/usePagedList";
import { errorMessage } from "@/admin/lib/client";
import type { AdminFormDefinition, FormSubmission, PageResult } from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 12;
const ALL_FORMS = "__all";

function dataEntries(data: Record<string, unknown>) {
  return Object.entries(data || {}).map(([key, value]) => [key, value == null ? "" : String(value)] as const);
}

function summary(
  data: Record<string, unknown>,
  formCode: string,
  labelFor: (formCode: string, fieldKey: string) => string
) {
  const entries = dataEntries(data);
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${labelFor(formCode, key)}: ${value || "-"}`)
    .join(" / ");
}

export default function FormSubmissionsView() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [forms, setForms] = useState<AdminFormDefinition[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [appliedFormCode, setAppliedFormCode] = useState("");
  const [active, setActive] = useState<FormSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formByCode = useMemo(() => new Map(forms.map((form) => [form.code, form])), [forms]);
  const fieldLabel = useCallback(
    (code: string, key: string) => {
      const field = formByCode.get(code)?.fields.find((item) => item.fieldKey === key);
      return field?.label || key;
    },
    [formByCode]
  );

  const loadForms = useCallback(async () => {
    setFormsLoading(true);
    try {
      const result = await client.fetch<AdminFormDefinition[]>("/admin/forms");
      setForms(result);
      clearStatus();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.forms.failedLoadDefinitions")), "error");
    } finally {
      setFormsLoading(false);
    }
  }, [client, clearStatus, setStatus, t]);

  const loadPage = useCallback(async (page: number, pageSize: number) => {
    const params = new URLSearchParams({ lang: contentLang, page: String(page), pageSize: String(pageSize) });
    if (appliedFormCode) params.set("formCode", appliedFormCode);
    return client.fetch<PageResult<FormSubmission>>(`/admin/forms/submissions?${params.toString()}`);
  }, [appliedFormCode, client, contentLang]);

  const getLoadError = useCallback((err: unknown) => errorMessage(err, t("admin.forms.failedLoad")), [t]);
  const handleLoadError = useCallback((message: string) => setStatus(message, "error"), [setStatus]);
  const { items, page, setPage, total, loading, error, reload, pageStart, pageEnd, prevPage, nextPage } =
    usePagedList<FormSubmission>({
      pageSize: PAGE_SIZE,
      loadPage,
      getErrorMessage: getLoadError,
      onLoadSuccess: clearStatus,
      onLoadError: handleLoadError,
    });

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  async function open(id: number) {
    try {
      const result = await client.fetch<FormSubmission>(`/admin/forms/submissions/${id}?lang=${contentLang}`);
      setActive(result);
      setDialogOpen(true);
    } catch (err) {
      setStatus(errorMessage(err, t("admin.forms.failedLoad")), "error");
    }
  }

  function applyFilter() {
    setAppliedFormCode(formCode.trim());
    setPage(1);
  }

  function clearFilter() {
    setFormCode("");
    setAppliedFormCode("");
    setPage(1);
  }

  const activeEntries = useMemo(() => {
    if (!active) return [];
    return dataEntries(active.data).map(([key, value]) => ({
      key,
      label: fieldLabel(active.formCode, key),
      value,
    }));
  }, [active, fieldLabel]);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ClipboardList aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.forms")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.forms.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <form
        className="flex flex-col gap-3 rounded-md border bg-card p-4 md:flex-row md:items-end md:justify-between"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilter();
        }}
      >
        <Label className="grid max-w-xs flex-1 gap-2">
          {t("admin.forms.formCode")}
          <Select
            value={formCode || ALL_FORMS}
            onValueChange={(value) => setFormCode(value === ALL_FORMS ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={formsLoading ? t("admin.common.loading") : t("admin.common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FORMS}>{t("admin.common.all")}</SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.code} value={form.code}>
                  {form.name || form.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="outline">
            {t("admin.common.apply")}
          </Button>
          <Button type="button" variant="ghost" onClick={clearFilter}>
            {t("admin.common.clearFilters")}
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {t("admin.common.resultRange", { start: pageStart, end: pageEnd, total })}
        </span>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-20">{t("admin.forms.id")}</TableHead>
              <TableHead>{t("admin.forms.formCode")}</TableHead>
              <TableHead>{t("admin.forms.summary")}</TableHead>
              <TableHead>{t("admin.forms.submitterIp")}</TableHead>
              <TableHead>{t("admin.forms.created")}</TableHead>
              <TableHead>{t("admin.common.actions")}</TableHead>
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
                  {t("admin.forms.noSubmissions")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{item.formCode}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xl truncate text-sm text-muted-foreground">
                    {summary(item.data, item.formCode, fieldLabel)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{item.submitterIp || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {item.createdAt || "-"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{active ? t("admin.forms.detailTitle", { id: active.id }) : t("admin.nav.forms")}</DialogTitle>
            <DialogDescription>{t("admin.forms.detailDesc")}</DialogDescription>
          </DialogHeader>
          {active ? (
            <div className="grid gap-4">
              <dl className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t("admin.forms.formCode")}</dt>
                  <dd className="font-medium">{active.formCode}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("admin.forms.submitterIp")}</dt>
                  <dd className="font-medium">{active.submitterIp || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("admin.forms.created")}</dt>
                  <dd className="font-medium">{active.createdAt || "-"}</dd>
                </div>
              </dl>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>{t("admin.forms.field")}</TableHead>
                      <TableHead>{t("admin.forms.value")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          {t("admin.forms.noData")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeEntries.map((entry) => (
                        <TableRow key={entry.key}>
                          <TableCell className="w-48 font-medium">{entry.label}</TableCell>
                          <TableCell className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                            {entry.value || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
