import { useCallback, useEffect, useState } from "react";
import { Image, Link as LinkIcon, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { FriendLink, MediaListResult, MediaObject, Slide } from "@/admin/lib/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MEDIA_PAGE_SIZE = 50;

type SlideDraft = {
  gid: number;
  pic: string;
  link: string;
  title: string;
  subtitle: string;
  sorting: number;
};

type LinkDraft = {
  gid: number;
  name: string;
  link: string;
  logo: string;
  sorting: number;
};

type MediaTarget = "slide" | "link";

type DeleteTarget = {
  kind: "slide" | "link";
  id: number;
  label: string;
};

function emptySlide(): SlideDraft {
  return { gid: 0, pic: "", link: "", title: "", subtitle: "", sorting: 10 };
}

function emptyLink(): LinkDraft {
  return { gid: 0, name: "", link: "", logo: "", sorting: 10 };
}

function slideDraft(item: Slide): SlideDraft {
  return {
    gid: item.gid,
    pic: item.pic,
    link: item.link,
    title: item.title,
    subtitle: item.subtitle,
    sorting: item.sorting,
  };
}

function linkDraft(item: FriendLink): LinkDraft {
  return { gid: item.gid, name: item.name, link: item.link, logo: item.logo, sorting: item.sorting };
}

function resourceLabel(value: string) {
  return value.trim() || "-";
}

function ImagePreview({ src, alt, emptyLabel }: { src: string; alt: string; emptyLabel: string }) {
  if (!src.trim()) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-md border border-dashed bg-muted/20 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <img
        src={src}
        alt={alt}
        width={640}
        height={360}
        className="aspect-[16/9] w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export default function ResourcesView() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [slide, setSlide] = useState<SlideDraft>(() => emptySlide());
  const [friendLink, setFriendLink] = useState<LinkDraft>(() => emptyLink());
  const [editingSlideID, setEditingSlideID] = useState(0);
  const [editingLinkID, setEditingLinkID] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaObject[]>([]);
  const [mediaCursor, setMediaCursor] = useState("");
  const [mediaHasMore, setMediaHasMore] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [slideItems, linkItems] = await Promise.all([
        client.fetch<Slide[]>(`/admin/assets/slides?lang=${contentLang}`),
        client.fetch<FriendLink[]>(`/admin/assets/links?lang=${contentLang}`),
      ]);
      setSlides(slideItems);
      setLinks(linkItems);
      clearStatus();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.resources.failedLoad")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, contentLang, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMedia = useCallback(
    async (reset: boolean) => {
      setMediaLoading(true);
      setMediaError("");
      const params = new URLSearchParams({ type: "image", pageSize: String(MEDIA_PAGE_SIZE) });
      if (!reset && mediaCursor) params.set("cursor", mediaCursor);
      try {
        const result = await client.fetch<MediaListResult>(`/admin/media?${params.toString()}`);
        setMediaItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        setMediaCursor(result.nextCursor ?? "");
        setMediaHasMore(result.hasMore);
        clearStatus();
      } catch (err) {
        setMediaError(errorMessage(err, t("admin.media.failedLoad")));
      } finally {
        setMediaLoading(false);
      }
    },
    [client, mediaCursor, clearStatus, t]
  );

  useEffect(() => {
    if (mediaTarget) void loadMedia(true);
  }, [mediaTarget, loadMedia]);

  function newSlide() {
    setEditingSlideID(0);
    setSlide(emptySlide());
  }

  function editSlide(item: Slide) {
    setEditingSlideID(item.id);
    setSlide(slideDraft(item));
  }

  function newLink() {
    setEditingLinkID(0);
    setFriendLink(emptyLink());
  }

  function editLink(item: FriendLink) {
    setEditingLinkID(item.id);
    setFriendLink(linkDraft(item));
  }

  async function saveSlide() {
    setSaving(true);
    try {
      const payload = { lang: contentLang, ...slide, gid: Number(slide.gid) || 0, sorting: Number(slide.sorting) || 0 };
      if (editingSlideID) {
        await client.fetch<{ status: string }>(`/admin/assets/slides/${editingSlideID}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const result = await client.fetch<{ id: number }>("/admin/assets/slides", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEditingSlideID(result.id);
      }
      setStatus(t("admin.resources.saved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.resources.failedSave")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveLink() {
    setSaving(true);
    try {
      const payload = {
        lang: contentLang,
        ...friendLink,
        gid: Number(friendLink.gid) || 0,
        sorting: Number(friendLink.sorting) || 0,
      };
      if (editingLinkID) {
        await client.fetch<{ status: string }>(`/admin/assets/links/${editingLinkID}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const result = await client.fetch<{ id: number }>("/admin/assets/links", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEditingLinkID(result.id);
      }
      setStatus(t("admin.resources.saved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.resources.failedSave")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlide() {
    if (!editingSlideID) return;
    setSaving(true);
    try {
      await client.fetch<{ status: string }>(`/admin/assets/slides/${editingSlideID}?lang=${contentLang}`, {
        method: "DELETE",
      });
      setStatus(t("admin.resources.deleted"));
      newSlide();
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.resources.failedDelete")), "error");
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  async function deleteLink() {
    if (!editingLinkID) return;
    setSaving(true);
    try {
      await client.fetch<{ status: string }>(`/admin/assets/links/${editingLinkID}?lang=${contentLang}`, {
        method: "DELETE",
      });
      setStatus(t("admin.resources.deleted"));
      newLink();
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.resources.failedDelete")), "error");
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  function chooseMedia(item: MediaObject) {
    if (mediaTarget === "slide") {
      setSlide((prev) => ({ ...prev, pic: item.url }));
    } else if (mediaTarget === "link") {
      setFriendLink((prev) => ({ ...prev, logo: item.url }));
    }
    setMediaTarget(null);
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Image aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.resources")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.resources.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <Tabs defaultValue="slides" className="grid gap-5">
        <TabsList className="w-fit">
          <TabsTrigger value="slides">{t("admin.resources.slides")}</TabsTrigger>
          <TabsTrigger value="links">{t("admin.resources.links")}</TabsTrigger>
        </TabsList>

        <TabsContent value="slides" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>{t("admin.resources.title")}</TableHead>
                  <TableHead>{t("admin.resources.group")}</TableHead>
                  <TableHead>{t("admin.resources.sorting")}</TableHead>
                  <TableHead>{t("admin.common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.common.loading")}
                    </TableCell>
                  </TableRow>
                ) : slides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.resources.noSlides")}
                    </TableCell>
                  </TableRow>
                ) : (
                  slides.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-12 w-20 shrink-0 overflow-hidden rounded border bg-muted/30">
                            {item.pic ? (
                              <img
                                src={item.pic}
                                alt={item.title || item.pic}
                                width={160}
                                height={96}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.title || item.pic || "-"}</p>
                            <p className="truncate text-xs text-muted-foreground">{resourceLabel(item.link)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{item.gid}</Badge>
                      </TableCell>
                      <TableCell>{item.sorting}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => editSlide(item)}>
                          {t("admin.common.open")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <form
            className="grid gap-4 rounded-md border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSlide();
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <h3 className="text-sm font-semibold">
                {editingSlideID ? t("admin.resources.editSlide") : t("admin.resources.newSlide")}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={newSlide}>
                <Plus aria-hidden="true" size={16} />
                {t("admin.common.newItem")}
              </Button>
            </div>
            <Label className="grid gap-2">
              {t("admin.resources.title")}
              <Input
                value={slide.title}
                onChange={(event) => setSlide((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </Label>
            <Label className="grid gap-2">
              {t("admin.resources.subtitle")}
              <Input
                value={slide.subtitle}
                onChange={(event) => setSlide((prev) => ({ ...prev, subtitle: event.target.value }))}
              />
            </Label>
            <ImagePreview
              src={slide.pic}
              alt={slide.title || t("admin.resources.imagePreview")}
              emptyLabel={t("admin.resources.noImage")}
            />
            <Label className="grid gap-2">
              {t("admin.resources.imageUrl")}
              <div className="flex gap-2">
                <Input
                  value={slide.pic}
                  onChange={(event) => setSlide((prev) => ({ ...prev, pic: event.target.value }))}
                />
                <Button type="button" variant="outline" onClick={() => setMediaTarget("slide")}>
                  {t("admin.resources.chooseMedia")}
                </Button>
              </div>
            </Label>
            <Label className="grid gap-2">
              {t("admin.resources.linkUrl")}
              <Input
                value={slide.link}
                onChange={(event) => setSlide((prev) => ({ ...prev, link: event.target.value }))}
              />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2">
                {t("admin.resources.group")}
                <Input
                  type="number"
                  min={0}
                  value={slide.gid}
                  onChange={(event) => setSlide((prev) => ({ ...prev, gid: Number(event.target.value) }))}
                />
              </Label>
              <Label className="grid gap-2">
                {t("admin.resources.sorting")}
                <Input
                  type="number"
                  min={0}
                  value={slide.sorting}
                  onChange={(event) => setSlide((prev) => ({ ...prev, sorting: Number(event.target.value) }))}
                />
              </Label>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              {editingSlideID ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => setDeleteTarget({ kind: "slide", id: editingSlideID, label: slide.title })}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  {t("admin.common.delete")}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving}>
                <Save aria-hidden="true" size={16} />
                {saving ? t("admin.common.saving") : t("admin.common.save")}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="links" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>{t("admin.resources.name")}</TableHead>
                  <TableHead>{t("admin.resources.group")}</TableHead>
                  <TableHead>{t("admin.resources.sorting")}</TableHead>
                  <TableHead>{t("admin.common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.common.loading")}
                    </TableCell>
                  </TableRow>
                ) : links.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.resources.noLinks")}
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted/30">
                            {item.logo ? (
                              <img
                                src={item.logo}
                                alt={item.name || item.logo}
                                width={160}
                                height={96}
                                className="h-full w-full object-contain p-1"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <LinkIcon aria-hidden="true" size={18} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name || item.link || "-"}</p>
                            <p className="truncate text-xs text-muted-foreground">{resourceLabel(item.link)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{item.gid}</Badge>
                      </TableCell>
                      <TableCell>{item.sorting}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => editLink(item)}>
                          {t("admin.common.open")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <form
            className="grid gap-4 rounded-md border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveLink();
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <LinkIcon aria-hidden="true" size={16} />
                {editingLinkID ? t("admin.resources.editLink") : t("admin.resources.newLink")}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={newLink}>
                <Plus aria-hidden="true" size={16} />
                {t("admin.common.newItem")}
              </Button>
            </div>
            <Label className="grid gap-2">
              {t("admin.resources.name")}
              <Input
                value={friendLink.name}
                onChange={(event) => setFriendLink((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </Label>
            <Label className="grid gap-2">
              {t("admin.resources.linkUrl")}
              <Input
                value={friendLink.link}
                onChange={(event) => setFriendLink((prev) => ({ ...prev, link: event.target.value }))}
              />
            </Label>
            <ImagePreview
              src={friendLink.logo}
              alt={friendLink.name || t("admin.resources.logoPreview")}
              emptyLabel={t("admin.resources.noLogo")}
            />
            <Label className="grid gap-2">
              {t("admin.resources.logoUrl")}
              <div className="flex gap-2">
                <Input
                  value={friendLink.logo}
                  onChange={(event) => setFriendLink((prev) => ({ ...prev, logo: event.target.value }))}
                />
                <Button type="button" variant="outline" onClick={() => setMediaTarget("link")}>
                  {t("admin.resources.chooseMedia")}
                </Button>
              </div>
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2">
                {t("admin.resources.group")}
                <Input
                  type="number"
                  min={0}
                  value={friendLink.gid}
                  onChange={(event) => setFriendLink((prev) => ({ ...prev, gid: Number(event.target.value) }))}
                />
              </Label>
              <Label className="grid gap-2">
                {t("admin.resources.sorting")}
                <Input
                  type="number"
                  min={0}
                  value={friendLink.sorting}
                  onChange={(event) => setFriendLink((prev) => ({ ...prev, sorting: Number(event.target.value) }))}
                />
              </Label>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              {editingLinkID ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => setDeleteTarget({ kind: "link", id: editingLinkID, label: friendLink.name })}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  {t("admin.common.delete")}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving}>
                <Save aria-hidden="true" size={16} />
                {saving ? t("admin.common.saving") : t("admin.common.save")}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      <Dialog open={mediaTarget !== null} onOpenChange={(open) => !open && setMediaTarget(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("admin.resources.mediaPickerTitle")}</DialogTitle>
            <DialogDescription>{t("admin.resources.mediaPickerDesc")}</DialogDescription>
          </DialogHeader>
          {mediaError ? <p className="text-sm text-destructive">{mediaError}</p> : null}
          {mediaItems.length === 0 && !mediaLoading ? (
            <div className="rounded-md border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              {t("admin.resources.noMediaImages")}
            </div>
          ) : (
            <ul className="grid max-h-[520px] grid-cols-2 gap-3 overflow-auto sm:grid-cols-3 lg:grid-cols-5">
              {mediaItems.map((item) => (
                <li key={item.key} className="overflow-hidden rounded-md border bg-card">
                  <button type="button" className="block w-full" onClick={() => chooseMedia(item)} title={item.key}>
                    <img
                      src={item.url}
                      alt={item.name}
                      width={240}
                      height={180}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="block truncate px-2 py-2 text-left text-xs">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            {mediaLoading ? (
              <span className="mr-auto text-sm text-muted-foreground">{t("admin.common.loading")}</span>
            ) : null}
            {mediaHasMore && !mediaLoading ? (
              <Button type="button" variant="outline" onClick={() => void loadMedia(false)}>
                {t("admin.common.loadMore")}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setMediaTarget(null)}>
              {t("admin.common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.resources.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.kind === "slide"
                ? t("admin.resources.deleteSlideConfirm", { id: deleteTarget.id })
                : t("admin.resources.deleteLinkConfirm", { id: deleteTarget?.id ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget?.label ? <p className="truncate text-sm font-medium">{deleteTarget.label}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void (deleteTarget?.kind === "slide" ? deleteSlide() : deleteLink())}
            >
              <Trash2 aria-hidden="true" size={16} />
              {saving ? t("admin.common.deleting") : t("admin.common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
