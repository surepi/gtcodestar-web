import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { Category } from "@/admin/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const ROOT = "0";

export type ParentOption = { code: string; label: string };

export type CategoryEditorProps = {
  mode: "create" | "edit";
  initial: Category;
  tree: Category[];
  onBack: () => void;
  onReopen: (code: string) => void;
};

type FormState = {
  code: string;
  parentCode: string;
  name: string;
  subname: string;
  modelCode: string;
  sorting: string;
  filename: string;
  outlink: string;
  listTpl: string;
  contentTpl: string;
  icon: string;
  pic: string;
  title: string;
  keywords: string;
  description: string;
  status: boolean;
};

function flattenCategories(items: Category[], depth = 0): Array<Category & { depth: number }> {
  return items.flatMap((item) => [{ ...item, depth }, ...flattenCategories(item.children || [], depth + 1)]);
}

function descendantCodes(items: Category[], code: string): Set<string> {
  const collect = (nodes: Category[]): Set<string> => {
    const codes = new Set<string>();
    nodes.forEach((node) => {
      codes.add(node.code);
      collect(node.children || []).forEach((child) => codes.add(child));
    });
    return codes;
  };
  for (const item of items) {
    if (item.code === code) return collect(item.children || []);
    const nested = descendantCodes(item.children || [], code);
    if (nested.size > 0) return nested;
  }
  return new Set();
}

function buildParentOptions(tree: Category[], excludeCode: string, rootLabel: string): ParentOption[] {
  const excluded = descendantCodes(tree, excludeCode);
  if (excludeCode) excluded.add(excludeCode);
  const options: ParentOption[] = [{ code: ROOT, label: rootLabel }];
  flattenCategories(tree).forEach((item) => {
    if (excluded.has(item.code)) return;
    const prefix = item.depth > 0 ? `${"-".repeat(item.depth)} ` : "";
    options.push({ code: item.code, label: prefix + (item.name || item.code) });
  });
  return options;
}

function toForm(category: Category): FormState {
  return {
    code: category.code || "",
    parentCode: category.parentCode || ROOT,
    name: category.name || "",
    subname: category.subname || "",
    modelCode: category.modelCode || "",
    sorting: String(category.sorting ?? 255),
    filename: category.filename || "",
    outlink: category.outlink || "",
    listTpl: category.listTpl || "",
    contentTpl: category.contentTpl || "",
    icon: category.icon || "",
    pic: category.pic || "",
    title: category.title || "",
    keywords: category.keywords || "",
    description: category.description || "",
    status: category.status === "1",
  };
}

export default function CategoryEditor({ mode, initial, tree, onBack, onReopen }: CategoryEditorProps) {
  const { client, setStatus } = useSession();
  const { contentLang, t } = useLocale();
  const { confirm } = useConfirm();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setForm(toForm(initial));
  }, [initial]);

  const parentOptions = useMemo(
    () => buildParentOptions(tree, mode === "edit" ? initial.code : "", t("admin.category.rootCategory")),
    [tree, mode, initial.code, t]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function payload() {
    const sortingValue = Number(form.sorting || initial.sorting || 255);
    const lang = initial.lang || contentLang;
    return {
      lang,
      modelCode: form.modelCode.trim(),
      parentCode: (form.parentCode || ROOT).trim(),
      code: (form.code || initial.code || "").trim(),
      name: form.name.trim(),
      subname: form.subname,
      listTpl: form.listTpl,
      contentTpl: form.contentTpl,
      status: form.status ? "1" : "0",
      outlink: form.outlink.trim(),
      icon: form.icon.trim(),
      pic: form.pic.trim(),
      title: form.title,
      keywords: form.keywords,
      description: form.description,
      filename: form.filename.trim(),
      sorting: Number.isFinite(sortingValue) && sortingValue >= 0 ? sortingValue : 255,
    };
  }

  async function save(backToList: boolean) {
    setPending(true);
    try {
      if (mode === "create") {
        const result = await client.fetch<{ code: string }>("/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload()),
        });
        setStatus(t("admin.category.created"));
        if (backToList) onBack();
        else onReopen(result.code);
      } else {
        await client.fetch<{ status: string }>(
          `/admin/categories/${encodeURIComponent(initial.code)}?lang=${initial.lang || contentLang}`,
          {
            method: "PUT",
            body: JSON.stringify(payload()),
          }
        );
        setStatus(t("admin.category.saved"));
        if (backToList) onBack();
        else onReopen(initial.code);
      }
    } catch (error) {
      setStatus(errorMessage(error, t("admin.category.failedSave")), "error");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (mode === "create") return;
    const confirmed = await confirm({
      description: t("admin.category.deleteConfirm", { code: initial.code }),
      detail: initial.name || initial.code,
    });
    if (!confirmed) return;
    setPending(true);
    try {
      await client.fetch<{ status: string }>(
        `/admin/categories/${encodeURIComponent(initial.code)}?lang=${initial.lang || contentLang}`,
        {
          method: "DELETE",
        }
      );
      setStatus(t("admin.category.deleted"));
      onBack();
    } catch (error) {
      setStatus(errorMessage(error, t("admin.category.failedDelete")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-5">
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-md border bg-card/95 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">{t("admin.nav.categories")}</p>
            <h2 className="truncate text-lg font-semibold">
              {mode === "create"
                ? t("admin.category.newCategory")
                : `#${initial.code} ${initial.name || t("admin.nav.categories")}`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft aria-hidden="true" size={16} />
              {t("admin.common.backToList")}
            </Button>
            <Button type="submit" disabled={pending}>
              <Save aria-hidden="true" size={16} />
              {pending ? t("admin.common.saving") : t("admin.common.save")}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => void save(true)}>
              {t("admin.common.saveAndBack")}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="grid gap-5">
            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.category.basicInfo")}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="grid gap-2">
                  {t("admin.category.code")}
                  <Input
                    value={form.code}
                    onChange={(event) => update("code", event.target.value)}
                    placeholder={t("admin.category.autoWhenEmpty")}
                    readOnly={mode === "edit"}
                  />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.parent")}
                  <Select value={form.parentCode || ROOT} onValueChange={(value) => update("parentCode", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.category.rootCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.name")}
                  <Input value={form.name} onChange={(event) => update("name", event.target.value)} required />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.subname")}
                  <Input value={form.subname} onChange={(event) => update("subname", event.target.value)} />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.modelCode")}
                  <Input
                    value={form.modelCode}
                    onChange={(event) => update("modelCode", event.target.value)}
                    required
                  />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.sorting")}
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.sorting}
                    onChange={(event) => update("sorting", event.target.value)}
                  />
                </Label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.category.routingTemplates")}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="grid gap-2">
                  {t("admin.category.filename")}
                  <Input value={form.filename} onChange={(event) => update("filename", event.target.value)} />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.outlink")}
                  <Input value={form.outlink} onChange={(event) => update("outlink", event.target.value)} />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.listTemplate")}
                  <Input value={form.listTpl} onChange={(event) => update("listTpl", event.target.value)} />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.contentTemplate")}
                  <Input value={form.contentTpl} onChange={(event) => update("contentTpl", event.target.value)} />
                </Label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.category.media")}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="grid gap-2">
                  {t("admin.category.icon")}
                  <Input value={form.icon} onChange={(event) => update("icon", event.target.value)} />
                </Label>
                <Label className="grid gap-2">
                  {t("admin.category.pic")}
                  <Input value={form.pic} onChange={(event) => update("pic", event.target.value)} />
                </Label>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.category.seo")}</legend>
              <Label className="grid gap-2">
                {t("admin.category.seoTitle")}
                <Input value={form.title} onChange={(event) => update("title", event.target.value)} />
              </Label>
              <Label className="grid gap-2">
                {t("admin.category.seoKeywords")}
                <Input value={form.keywords} onChange={(event) => update("keywords", event.target.value)} />
              </Label>
              <Label className="grid gap-2">
                {t("admin.category.seoDescription")}
                <Textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  rows={4}
                />
              </Label>
            </fieldset>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-24">
            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.category.publishing")}</legend>
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>{t("admin.common.enabled")}</span>
                <Switch checked={form.status} onCheckedChange={(value) => update("status", value)} />
              </label>
            </fieldset>

            {mode === "edit" ? (
              <fieldset className="grid gap-3 rounded-md border border-destructive/40 bg-card p-4">
                <legend className="px-1 text-sm font-semibold text-destructive">
                  {t("admin.category.dangerZone")}
                </legend>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => void remove()}>
                  <Trash2 aria-hidden="true" size={16} />
                  {t("admin.common.delete")}
                </Button>
              </fieldset>
            ) : null}
          </aside>
        </div>
      </form>
    </section>
  );
}
