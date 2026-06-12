import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Save, Trash2, Upload } from "lucide-react";

import RichEditor from "@/admin/components/RichEditor";
import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { ContentDetail, CreateResponse, UploadResult } from "@/admin/lib/types";
import { contentDocHtml } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type CategoryOption = { code: string; label: string; modelCode?: string };

export type ContentEditorProps = {
  mode: "create" | "edit";
  initial: ContentDetail;
  categories: CategoryOption[];
  onBack: () => void;
  onReopen: (id: number) => void;
};

type FormState = {
  title: string;
  scode: string;
  date: string;
  filename: string;
  icon: string;
  description: string;
  content: string;
  doc?: object;
  status: boolean;
  isTop: boolean;
  isRecommend: boolean;
  isHeadline: boolean;
};

function toForm(content: ContentDetail, categories: CategoryOption[]): FormState {
  return {
    title: content.title || "",
    scode: content.scode || categories[0]?.code || "",
    date: content.date || "",
    filename: content.filename || "",
    icon: content.icon || "",
    description: content.description || "",
    content: content.content || "",
    status: content.status === "1",
    isTop: content.isTop === "1",
    isRecommend: content.isRecommend === "1",
    isHeadline: content.isHeadline === "1",
    doc: content.doc,
  };
}

const flag = (value: boolean) => (value ? "1" : "0");

export default function ContentEditor({ mode, initial, categories, onBack, onReopen }: ContentEditorProps) {
  const { client, setStatus } = useSession();
  const { contentLang, t } = useLocale();
  const { confirm } = useConfirm();
  const initialForm = useMemo(() => toForm(initial, categories), [initial, categories]);
  const [form, setForm] = useState<FormState>(() => initialForm);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handleAdminNavigation = (event: Event) => {
      if (!window.confirm(t("admin.content.unsavedConfirm"))) event.preventDefault();
    };
    window.addEventListener("admin:before-navigation", handleAdminNavigation);
    return () => window.removeEventListener("admin:before-navigation", handleAdminNavigation);
  }, [dirty, t]);

  function confirmDiscard() {
    return !dirty || window.confirm(t("admin.content.unsavedConfirm"));
  }

  function backToList() {
    if (confirmDiscard()) onBack();
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function payload() {
    const scode = form.scode || initial.scode || "";
    return {
      lang: initial.lang || contentLang,
      scode,
      subscode: initial.subscode || scode,
      title: form.title.trim(),
      titleColor: initial.titleColor || "#333333",
      subtitle: initial.subtitle || "",
      filename: form.filename.trim(),
      author: initial.author || "admin",
      source: initial.source || "本站",
      outlink: initial.outlink || "",
      date: form.date || initial.date || "",
      icon: form.icon.trim(),
      pics: initial.pics || "",
      picsTitle: initial.picsTitle || "",
      content: form.content.trim(),
      tags: initial.tags || "",
      enclosure: initial.enclosure || "",
      keywords: initial.keywords || "",
      description: form.description,
      sorting: initial.sorting ?? 255,
      status: flag(form.status),
      isTop: flag(form.isTop),
      isRecommend: flag(form.isRecommend),
      isHeadline: flag(form.isHeadline),
      doc: form.doc || initial.doc || { type: "doc", content: [] },
    };
  }

  async function save(backToList: boolean) {
    setPending(true);
    try {
      if (mode === "create") {
        const result = await client.fetch<CreateResponse>("/admin/contents", {
          method: "POST",
          body: JSON.stringify(payload()),
        });
        setStatus(t("admin.content.created"));
        if (backToList) onBack();
        else onReopen(result.id);
      } else {
        await client.fetch<{ status: string }>(`/admin/contents/${initial.id}?lang=${initial.lang || contentLang}`, {
          method: "PUT",
          body: JSON.stringify(payload()),
        });
        setStatus(t("admin.content.saved"));
        if (backToList) onBack();
        else onReopen(initial.id);
      }
    } catch (error) {
      setStatus(errorMessage(error, t("admin.content.failedSave")), "error");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (mode === "create") return;
    const confirmed = await confirm({
      description: t("admin.content.deleteConfirm", { id: initial.id }),
      detail: initial.title || `#${initial.id}`,
    });
    if (!confirmed) return;
    setPending(true);
    try {
      await client.fetch<{ status: string }>(`/admin/contents/${initial.id}?lang=${initial.lang || contentLang}`, {
        method: "DELETE",
      });
      setStatus(t("admin.content.deleted"));
      onBack();
    } catch (error) {
      setStatus(errorMessage(error, t("admin.content.failedDelete")), "error");
    } finally {
      setPending(false);
    }
  }

  async function uploadIcon(file: File) {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await client.fetch<UploadResult>("/admin/upload/image", { method: "POST", body: data });
      update("icon", result.url);
      setStatus(t("admin.content.imageUploaded"));
    } catch (error) {
      setStatus(errorMessage(error, t("admin.content.failedUpload")), "error");
    } finally {
      setUploading(false);
    }
  }

  const previewBody = contentDocHtml(form.doc);

  return (
    <section className="grid gap-5">
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">{t("admin.nav.contents")}</p>
            <h2 className="truncate text-lg font-semibold">
              {mode === "create"
                ? t("admin.content.newContent")
                : `#${initial.id} ${initial.title || t("admin.nav.contents")}`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={backToList}>
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="grid gap-5">
            {mode === "edit" && previewBody ? (
              <div className="grid gap-4 rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">{t("admin.content.bodyPreview")}</span>
                    <strong className="text-sm font-medium">{initial.title || `#${initial.id}`}</strong>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setPreviewOpen((open) => !open)}>
                    <Eye aria-hidden="true" size={16} />
                    {previewOpen ? t("admin.content.hidePreview") : t("admin.content.showPreview")}
                  </Button>
                </div>
                {previewOpen ? (
                  <div
                    className="tiptap-content max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                ) : null}
              </div>
            ) : null}

            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.content.basicInfo")}</legend>
              <Label className="grid gap-2">
                {t("admin.content.title")}
                <Input value={form.title} onChange={(event) => update("title", event.target.value)} required />
              </Label>
              <Label className="grid gap-2">
                {t("admin.content.description")}
                <Textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  rows={4}
                />
              </Label>
            </fieldset>

            <fieldset className="grid gap-2 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.content.bodyContent")}</legend>
              <RichEditor
                doc={form.doc}
                onChange={(html, doc) => {
                  update("content", html);
                  if (doc !== undefined) update("doc", doc || undefined);
                }}
              />
            </fieldset>
          </div>

          <aside className="grid gap-5 lg:sticky lg:top-24">
            <fieldset className="grid gap-4 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.content.publishing")}</legend>
              <Label className="grid gap-2">
                {t("admin.content.category")}
                <Select value={form.scode} onValueChange={(value) => update("scode", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.common.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.code} value={category.code}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
              <Label className="grid gap-2">
                {t("admin.content.date")}
                <Input
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                  placeholder={t("admin.content.datePlaceholder")}
                />
              </Label>
              <Label className="grid gap-2">
                {t("admin.content.filename")}
                <Input value={form.filename} onChange={(event) => update("filename", event.target.value)} />
              </Label>
              <div className="grid gap-3 border-t pt-4">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{t("admin.common.published")}</span>
                  <Switch checked={form.status} onCheckedChange={(value) => update("status", value)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{t("admin.content.top")}</span>
                  <Switch checked={form.isTop} onCheckedChange={(value) => update("isTop", value)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{t("admin.content.recommend")}</span>
                  <Switch checked={form.isRecommend} onCheckedChange={(value) => update("isRecommend", value)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{t("admin.content.headline")}</span>
                  <Switch checked={form.isHeadline} onCheckedChange={(value) => update("isHeadline", value)} />
                </label>
              </div>
            </fieldset>

            <fieldset className="grid gap-3 rounded-md border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">{t("admin.content.coverImage")}</legend>
              <Label className="grid gap-2">
                {t("admin.content.iconUrl")}
                <Input value={form.icon} onChange={(event) => update("icon", event.target.value)} />
              </Label>
              <input
                id="content-icon-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadIcon(file);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("content-icon-file")?.click()}
              >
                <Upload aria-hidden="true" size={16} />
                {uploading ? t("admin.common.uploading") : t("admin.common.upload")}
              </Button>
            </fieldset>

            {mode === "edit" ? (
              <fieldset className="grid gap-3 rounded-md border border-destructive/40 bg-card p-4">
                <legend className="px-1 text-sm font-semibold text-destructive">{t("admin.content.dangerZone")}</legend>
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
