import { useCallback, useEffect, useState } from "react";
import { FolderTree, Plus, RefreshCw } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { Category } from "@/admin/lib/types";
import CategoryEditor from "@/admin/views/CategoryEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FlatCategory = Category & { depth: number };

function flattenCategories(items: Category[], depth = 0): FlatCategory[] {
  return items.flatMap((item) => [{ ...item, depth }, ...flattenCategories(item.children || [], depth + 1)]);
}

function draftCategory(lang: string): Category {
  return {
    lang,
    parentCode: "0",
    code: "",
    name: "",
    subname: "",
    modelCode: "3",
    listTpl: "",
    contentTpl: "",
    status: "1",
    outlink: "",
    icon: "",
    pic: "",
    title: "",
    keywords: "",
    description: "",
    filename: "",
    sorting: 255,
  };
}

type EditorState = { mode: "create" | "edit"; category: Category } | null;

export default function CategoriesView() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Category[]>(`/admin/categories/tree?lang=${contentLang}`);
      setTree(result);
      clearStatus();
    } catch (err) {
      setTree([]);
      setError(errorMessage(err, t("admin.category.failedLoad")));
      setStatus(errorMessage(err, t("admin.category.failedLoad")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, contentLang, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditor(null);
  }, [contentLang]);

  async function openCategory(code: string) {
    try {
      const [category, freshTree] = await Promise.all([
        client.fetch<Category>(`/admin/categories/${encodeURIComponent(code)}?lang=${contentLang}`),
        client.fetch<Category[]>(`/admin/categories/tree?lang=${contentLang}`),
      ]);
      setTree(freshTree);
      setEditor({ mode: "edit", category });
    } catch (err) {
      setStatus(errorMessage(err, t("admin.category.failedOpen")), "error");
    }
  }

  function openNew() {
    setEditor({ mode: "create", category: draftCategory(contentLang) });
  }

  function backToList() {
    setEditor(null);
    void load();
  }

  if (editor) {
    return (
      <CategoryEditor
        mode={editor.mode}
        initial={editor.category}
        tree={tree}
        onBack={backToList}
        onReopen={(code) => void openCategory(code)}
      />
    );
  }

  const rows = flattenCategories(tree);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FolderTree aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.categories")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.category.workspaceDesc")}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" onClick={openNew}>
            <Plus aria-hidden="true" size={16} />
            {t("admin.category.newCategory")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden="true" size={16} />
            {t("admin.common.refresh")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-4 text-sm text-muted-foreground">
        <span>{t("admin.category.totalCategories", { total: rows.length })}</span>
        <span>{t("admin.category.rootCount", { total: tree.length })}</span>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-28">{t("admin.category.code")}</TableHead>
              <TableHead>{t("admin.category.name")}</TableHead>
              <TableHead>{t("admin.category.model")}</TableHead>
              <TableHead>{t("admin.common.status")}</TableHead>
              <TableHead>{t("admin.category.sorting")}</TableHead>
              <TableHead>{t("admin.category.filename")}</TableHead>
              <TableHead className="text-right">{t("admin.common.actions")}</TableHead>
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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.code} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="block max-w-md truncate text-left font-medium hover:underline"
                      style={{ paddingLeft: `${item.depth * 18}px` }}
                      onClick={() => void openCategory(item.code)}
                      title={item.name || "-"}
                    >
                      {item.depth > 0 ? "└ " : ""}
                      {item.name || "-"}
                    </button>
                    {item.description ? (
                      <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{item.model?.name || item.modelCode || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "1" ? "success" : "muted"}>
                      {item.status === "1" ? t("admin.common.enabled") : t("admin.common.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.sorting ?? 255}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                    {item.filename || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => void openCategory(item.code)}>
                      {t("admin.common.open")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
