import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, RefreshCw, Rocket, Search, Trash2, X } from "lucide-react";

import ContentEditor, { type CategoryOption } from "@/admin/views/ContentEditor";
import Pagination from "@/admin/components/Pagination";
import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { usePagedList } from "@/admin/hooks/usePagedList";
import { errorMessage } from "@/admin/lib/client";
import type { Category, ContentDetail, ContentItem, PageResult } from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 12;
const ALL = "all";
const CONTENT_TYPES = ["1", "2", "3"] as const;

type ContentTypeCode = (typeof CONTENT_TYPES)[number];

function flattenCategoryOptions(items: Category[], depth = 0): CategoryOption[] {
  return items.flatMap((item) => {
    const prefix = depth > 0 ? `${"-".repeat(depth)} ` : "";
    return [
      { code: item.code, label: prefix + item.name, modelCode: item.modelCode },
      ...flattenCategoryOptions(item.children || [], depth + 1),
    ];
  });
}

function contentTypeLabel(code: string, t: ReturnType<typeof useLocale>["t"]): string {
  if (code === "1") return t("admin.content.type.1");
  if (code === "2") return t("admin.content.type.2");
  if (code === "3") return t("admin.content.type.3");
  return "";
}

function draftContent(scode: string, lang: string): ContentDetail {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return {
    id: 0,
    lang,
    scode,
    subscode: scode,
    category: { code: "", name: "-", modelCode: "", modelName: "" },
    title: "",
    subtitle: "",
    filename: "",
    date,
    description: "",
    status: "1",
    isTop: "0",
    isRecommend: "0",
    isHeadline: "0",
    sorting: 255,
    visits: 0,
    likes: 0,
    titleColor: "#333333",
    author: "admin",
    source: "本站",
    outlink: "",
    icon: "",
    pics: "",
    picsTitle: "",
    content: "",
    tags: "",
    enclosure: "",
    keywords: "",
  };
}

type EditorState = { mode: "create" | "edit"; content: ContentDetail } | null;

export default function ContentsView() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const { confirm } = useConfirm();
  const [mcode, setMcode] = useState<ContentTypeCode | "">("");
  const [scode, setScode] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [statusUpdatingID, setStatusUpdatingID] = useState<number | null>(null);
  const [deletingID, setDeletingID] = useState<number | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<EditorState>(null);

  const loadCategories = useCallback(async () => {
    try {
      const tree = await client.fetch<Category[]>(`/admin/categories/tree?lang=${contentLang}`);
      setCategories(flattenCategoryOptions(tree));
    } catch {
      // Non-fatal
    }
  }, [client, contentLang]);

  const loadPage = useCallback(async (page: number, pageSize: number) => {
    const params = new URLSearchParams({ lang: contentLang, page: String(page), pageSize: String(pageSize) });
    if (mcode) params.set("mcode", mcode);
    if (scode) params.set("scode", scode);
    if (statusFilter) params.set("status", statusFilter);
    if (keyword) params.set("q", keyword);
    return client.fetch<PageResult<ContentItem>>(`/admin/contents?${params.toString()}`);
  }, [client, contentLang, keyword, mcode, scode, statusFilter]);

  const getLoadError = useCallback((err: unknown) => errorMessage(err, t("admin.content.failedLoad")), [t]);
  const handleLoadSuccess = useCallback(() => {
    setSelected(new Set());
    clearStatus();
  }, [clearStatus]);
  const handleLoadError = useCallback((message: string) => setStatus(message, "error"), [setStatus]);
  const { items, setItems, page, setPage, total, loading, error, reload, pageStart, pageEnd, prevPage, nextPage } =
    usePagedList<ContentItem>({
      pageSize: PAGE_SIZE,
      loadPage,
      getErrorMessage: getLoadError,
      onLoadSuccess: handleLoadSuccess,
      onLoadError: handleLoadError,
    });

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setEditor(null);
    setMcode("");
    setScode("");
    setStatusFilter("");
    setSearch("");
    setKeyword("");
    setSelected(new Set());
    setPage(1);
  }, [contentLang, setPage]);

  async function openContent(id: number) {
    try {
      const content = await client.fetch<ContentDetail>(`/admin/contents/${id}?lang=${contentLang}`);
      setEditor({ mode: "edit", content });
    } catch (err) {
      setStatus(errorMessage(err, t("admin.content.failedLoad")), "error");
    }
  }

  function openNew() {
    setEditor({
      mode: "create",
      content: draftContent(scode || filteredCategories[0]?.code || categories[0]?.code || "", contentLang),
    });
  }

  function backToList() {
    setEditor(null);
    void reload();
  }

  function applySearch() {
    setKeyword(search.trim());
    setPage(1);
  }

  function clearFilters() {
    setMcode("");
    setScode("");
    setStatusFilter("");
    setSearch("");
    setKeyword("");
    setSelected(new Set());
    setPage(1);
  }

  async function publishFrontend() {
    setPublishing(true);
    try {
      await client.fetch<{ status: string }>("/admin/deploy/frontend", { method: "POST" });
      setStatus(t("admin.content.publishQueued"));
    } catch (err) {
      setStatus(errorMessage(err, t("admin.content.failedPublish")), "error");
    } finally {
      setPublishing(false);
    }
  }

  async function updateContentStatus(item: ContentItem, checked: boolean) {
    const nextStatus = checked ? "1" : "0";
    const previousStatus = item.status;
    setStatusUpdatingID(item.id);
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: nextStatus } : entry)));
    try {
      await client.fetch<{ status: string }>(`/admin/contents/${item.id}/status?lang=${item.lang || contentLang}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatus(t("admin.content.statusUpdated"));
    } catch (err) {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: previousStatus } : entry))
      );
      setStatus(errorMessage(err, t("admin.content.failedStatus")), "error");
    } finally {
      setStatusUpdatingID(null);
    }
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllSelected(checked: boolean) {
    setSelected(() => (checked ? new Set(items.map((item) => item.id)) : new Set()));
  }

  async function deleteContent(item: ContentItem) {
    const confirmed = await confirm({
      description: t("admin.content.deleteConfirm", { id: item.id }),
      detail: item.title || `#${item.id}`,
    });
    if (!confirmed) return;
    setDeletingID(item.id);
    try {
      await client.fetch<{ status: string }>(`/admin/contents/${item.id}?lang=${item.lang || contentLang}`, {
        method: "DELETE",
      });
      setSelected((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      await reload();
      setStatus(t("admin.content.deleted"));
    } catch (err) {
      setStatus(errorMessage(err, t("admin.content.failedDelete")), "error");
    } finally {
      setDeletingID(null);
    }
  }

  async function deleteSelected() {
    const selectedItems = items.filter((item) => selected.has(item.id));
    if (selectedItems.length === 0) return;
    const confirmed = await confirm({
      description: t("admin.content.batchDeleteConfirm", { n: selectedItems.length }),
    });
    if (!confirmed) return;
    setBatchDeleting(true);
    const deleted: number[] = [];
    const errors: Array<{ item: ContentItem; message: string }> = [];
    for (const item of selectedItems) {
      try {
        await client.fetch<{ status: string }>(`/admin/contents/${item.id}?lang=${item.lang || contentLang}`, {
          method: "DELETE",
        });
        deleted.push(item.id);
      } catch (err) {
        errors.push({ item, message: errorMessage(err, t("admin.content.failedDelete")) });
      }
    }
    setSelected(new Set());
    await reload();
    setBatchDeleting(false);
    if (errors.length > 0) {
      const first = errors[0];
      setStatus(
        t("admin.content.batchDeleted", {
          deleted: deleted.length,
          failed: errors.length,
          detail: `#${first.item.id}: ${first.message}`,
        }),
        "error"
      );
      return;
    }
    setStatus(t("admin.content.batchDeleted", { deleted: deleted.length, failed: 0, detail: "" }));
  }

  const filteredCategories = mcode ? categories.filter((category) => category.modelCode === mcode) : categories;
  const activeFilterCount = [mcode, scode, statusFilter, keyword].filter(Boolean).length;
  const selectedCount = selected.size;
  const allVisibleSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const someVisibleSelected = items.some((item) => selected.has(item.id));

  if (editor) {
    return (
      <ContentEditor
        mode={editor.mode}
        initial={editor.content}
        categories={categories}
        onBack={backToList}
        onReopen={(id) => void openContent(id)}
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.contents")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.content.workspaceDesc")}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void publishFrontend()} disabled={publishing}>
            <Rocket aria-hidden="true" size={16} />
            {publishing ? t("admin.content.publishingSite") : t("admin.content.publishSite")}
          </Button>
          <Button type="button" onClick={openNew}>
            <Plus aria-hidden="true" size={16} />
            {t("admin.content.newContent")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
            <RefreshCw aria-hidden="true" size={16} />
            {t("admin.common.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("admin.content.type")}</span>
            <div className="flex flex-wrap items-center gap-2" aria-label={t("admin.content.typeFilter")}>
              <Button
                type="button"
                variant={mcode === "" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setMcode("");
                  setScode("");
                  setPage(1);
                }}
              >
                {t("admin.content.allTypes")}
              </Button>
              {CONTENT_TYPES.map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant={mcode === code ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMcode(code);
                    setScode("");
                    setPage(1);
                  }}
                >
                  {t(`admin.content.type.${code}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid w-full gap-1.5 sm:w-56">
            <span className="text-xs font-medium text-muted-foreground">{t("admin.content.category")}</span>
            <Select
              value={scode || ALL}
              onValueChange={(value) => {
                setScode(value === ALL ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("admin.common.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin.common.allCategories")}</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.code} value={category.code}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select
            value={statusFilter || ALL}
            onValueChange={(value) => {
              setStatusFilter(value === ALL ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t("admin.common.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("admin.common.allStatuses")}</SelectItem>
              <SelectItem value="1">{t("admin.common.published")}</SelectItem>
              <SelectItem value="0">{t("admin.common.hidden")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex min-w-64 flex-1 items-center gap-2">
            <Input
              className="min-w-0"
              placeholder={t("admin.common.searchTitle")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                applySearch();
              }}
            />
            <Button type="button" variant="outline" onClick={applySearch}>
              <Search aria-hidden="true" size={16} />
              {t("admin.common.search")}
            </Button>
          </div>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X aria-hidden="true" size={16} />
              {t("admin.common.clearFilters")}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t("admin.common.resultRange", { start: pageStart, end: pageEnd, total })}</span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void deleteSelected()}
                disabled={batchDeleting}
              >
                <Trash2 aria-hidden="true" size={14} />
                {batchDeleting ? t("admin.common.deleting") : t("admin.content.deleteSelected", { n: selectedCount })}
              </Button>
            ) : null}
            {activeFilterCount > 0 ? (
              <Badge variant="secondary">{t("admin.common.activeFilters", { n: activeFilterCount })}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-12">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                  aria-label={t("admin.content.selectAllVisible")}
                  disabled={items.length === 0 || loading}
                  onCheckedChange={(checked) => toggleAllSelected(checked === true)}
                />
              </TableHead>
              <TableHead className="w-20">{t("admin.content.id")}</TableHead>
              <TableHead>{t("admin.content.type")}</TableHead>
              <TableHead>{t("admin.content.title")}</TableHead>
              <TableHead>{t("admin.content.category")}</TableHead>
              <TableHead>{t("admin.common.status")}</TableHead>
              <TableHead>{t("admin.content.flags")}</TableHead>
              <TableHead>{t("admin.content.date")}</TableHead>
              <TableHead>{t("admin.common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const flags = [];
                if (item.isTop === "1") flags.push(t("admin.content.top"));
                if (item.isRecommend === "1") flags.push(t("admin.content.recommend"));
                if (item.isHeadline === "1") flags.push(t("admin.content.headline"));
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.id)}
                        aria-label={t("admin.content.selectRow", { id: item.id })}
                        onCheckedChange={(checked) => toggleSelected(item.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {contentTypeLabel(item.category?.modelCode || "", t) || item.category?.modelName || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="block max-w-md truncate text-left font-medium hover:underline"
                        onClick={() => void openContent(item.id)}
                        title={item.title || "-"}
                      >
                        {item.title || "-"}
                      </button>
                      {item.description ? (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{item.category?.name || item.scode || "-"}</TableCell>
                    <TableCell>
                      <div className="flex min-w-32 items-center gap-2">
                        <Switch
                          checked={item.status === "1"}
                          disabled={statusUpdatingID === item.id}
                          aria-label={t("admin.content.toggleStatusFor", { title: item.title || item.id })}
                          onCheckedChange={(checked) => void updateContentStatus(item, checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.status === "1" ? t("admin.common.published") : t("admin.common.hidden")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {flags.length > 0 ? flags.join(", ") : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {item.date || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void openContent(item.id)}>
                          {t("admin.common.open")}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteContent(item)}
                          disabled={deletingID === item.id}
                        >
                          <Trash2 aria-hidden="true" size={14} />
                          {deletingID === item.id ? t("admin.common.deleting") : t("admin.common.delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
