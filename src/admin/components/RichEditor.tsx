import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  FileCode2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table as TableIcon,
  Trash2,
  Undo2,
  Unlink,
} from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { MediaListResult, MediaObject } from "@/admin/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type RichEditorProps = {
  doc?: object;
  onChange: (html: string, doc?: object | null) => void;
};

type ToolButtonProps = {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function isTipTapDoc(value: unknown): value is JSONContent {
  return Boolean(value && typeof value === "object" && (value as JSONContent).type === "doc");
}

const emptyDoc: JSONContent = { type: "doc", content: [] };

function editorContent(doc: object | undefined) {
  return isTipTapDoc(doc) ? doc : emptyDoc;
}

function ToolbarButton({ label, children, active = false, disabled = false, onClick }: ToolButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-8 min-w-8 px-2"
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
}

function BlockTypeSelect({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  const value = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("blockquote")
        ? "blockquote"
        : "paragraph";

  function setBlock(next: string) {
    const chain = editor.chain().focus();
    if (next === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (next === "h3") chain.toggleHeading({ level: 3 }).run();
    else if (next === "blockquote") chain.toggleBlockquote().run();
    else chain.setParagraph().run();
  }

  return (
    <Select value={value} onValueChange={setBlock} disabled={disabled}>
      <SelectTrigger className="h-8 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="paragraph">{t("admin.editor.paragraph")}</SelectItem>
        <SelectItem value="h2">{t("admin.editor.h2")}</SelectItem>
        <SelectItem value="h3">{t("admin.editor.h3")}</SelectItem>
        <SelectItem value="blockquote">{t("admin.editor.blockquote")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function MarkButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  const tools: Array<ToolButtonProps> = [
    {
      label: t("admin.editor.bold"),
      active: editor.isActive("bold"),
      disabled,
      onClick: () => editor.chain().focus().toggleBold().run(),
      children: <Bold aria-hidden="true" size={15} />,
    },
    {
      label: t("admin.editor.italic"),
      active: editor.isActive("italic"),
      disabled,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      children: <Italic aria-hidden="true" size={15} />,
    },
    {
      label: t("admin.editor.inlineCode"),
      active: editor.isActive("code"),
      disabled,
      onClick: () => editor.chain().focus().toggleCode().run(),
      children: <Code2 aria-hidden="true" size={15} />,
    },
  ];

  return (
    <>
      {tools.map((tool) => (
        <ToolbarButton key={tool.label} {...tool} />
      ))}
    </>
  );
}

function ListButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  return (
    <>
      <ToolbarButton
        label={t("admin.editor.list")}
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List aria-hidden="true" size={15} />
      </ToolbarButton>
      <ToolbarButton
        label={t("admin.editor.orderedList")}
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered aria-hidden="true" size={15} />
      </ToolbarButton>
    </>
  );
}

function AlignButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  const tools: Array<ToolButtonProps & { value: "left" | "center" | "right" | "justify" }> = [
    {
      value: "left",
      label: t("admin.editor.alignLeft"),
      active: editor.isActive({ textAlign: "left" }),
      disabled,
      onClick: () => editor.chain().focus().setTextAlign("left").run(),
      children: <AlignLeft aria-hidden="true" size={15} />,
    },
    {
      value: "center",
      label: t("admin.editor.alignCenter"),
      active: editor.isActive({ textAlign: "center" }),
      disabled,
      onClick: () => editor.chain().focus().setTextAlign("center").run(),
      children: <AlignCenter aria-hidden="true" size={15} />,
    },
    {
      value: "right",
      label: t("admin.editor.alignRight"),
      active: editor.isActive({ textAlign: "right" }),
      disabled,
      onClick: () => editor.chain().focus().setTextAlign("right").run(),
      children: <AlignRight aria-hidden="true" size={15} />,
    },
    {
      value: "justify",
      label: t("admin.editor.alignJustify"),
      active: editor.isActive({ textAlign: "justify" }),
      disabled,
      onClick: () => editor.chain().focus().setTextAlign("justify").run(),
      children: <AlignJustify aria-hidden="true" size={15} />,
    },
  ];

  return (
    <>
      {tools.map((tool) => (
        <ToolbarButton key={tool.value} {...tool} />
      ))}
    </>
  );
}

function LinkDialog({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function openDialog() {
    const current = editor.getAttributes("link").href || "";
    setUrl(current);
    setOpen(true);
  }

  function applyLink() {
    const next = url.trim();
    if (!next) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
    setOpen(false);
  }

  return (
    <>
      <ToolbarButton
        label={t("admin.editor.link")}
        active={editor.isActive("link")}
        disabled={disabled}
        onClick={openDialog}
      >
        <LinkIcon aria-hidden="true" size={15} />
      </ToolbarButton>
      <ToolbarButton
        label={t("admin.editor.unlink")}
        disabled={disabled || !editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink aria-hidden="true" size={15} />
      </ToolbarButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.editor.link")}</DialogTitle>
            <DialogDescription>{t("admin.editor.linkDesc")}</DialogDescription>
          </DialogHeader>
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyLink();
            }}
            placeholder="https://"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("admin.common.cancel")}
            </Button>
            <Button type="button" onClick={applyLink}>
              {t("admin.common.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImageDialog({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { client, setStatus } = useSession();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<MediaObject[]>([]);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadImages = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      const params = new URLSearchParams({ type: "image", pageSize: "24" });
      if (!reset && cursor) params.set("cursor", cursor);
      try {
        const result = await client.fetch<MediaListResult>(`/admin/media?${params.toString()}`);
        setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        setCursor(result.nextCursor ?? "");
        setHasMore(result.hasMore);
      } catch (error) {
        setStatus(errorMessage(error, t("admin.media.failedLoad")), "error");
      } finally {
        setLoading(false);
      }
    },
    [client, cursor, setStatus, t]
  );

  function openDialog() {
    setOpen(true);
    setUrl("");
    if (items.length === 0) void loadImages(true);
  }

  function insertImage(src: string) {
    const next = src.trim();
    if (!next) return;
    editor.chain().focus().setImage({ src: next }).run();
    setOpen(false);
  }

  return (
    <>
      <ToolbarButton label={t("admin.editor.image")} disabled={disabled} onClick={openDialog}>
        <ImageIcon aria-hidden="true" size={15} />
      </ToolbarButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("admin.editor.image")}</DialogTitle>
            <DialogDescription>{t("admin.editor.imageDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("admin.editor.imageUrl")}
            />
            <Button type="button" onClick={() => insertImage(url)} disabled={!url.trim()}>
              {t("admin.editor.insertImage")}
            </Button>
          </div>

          <div className="grid max-h-[48vh] grid-cols-2 gap-3 overflow-auto rounded-md border bg-muted/20 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="group grid overflow-hidden rounded-md border bg-card text-left transition-colors hover:border-primary"
                onClick={() => insertImage(item.url)}
                title={item.key}
              >
                <span className="flex aspect-square items-center justify-center bg-muted/30">
                  <img
                    src={item.url}
                    alt={item.name}
                    width={220}
                    height={220}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="truncate px-2 py-1.5 text-xs font-medium">{item.name}</span>
              </button>
            ))}
            {items.length === 0 && !loading ? (
              <div className="col-span-full rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                {t("admin.media.noObjects")}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            {loading ? (
              <span className="self-center text-sm text-muted-foreground">{t("admin.common.loading")}</span>
            ) : null}
            {hasMore && !loading ? (
              <Button type="button" variant="outline" onClick={() => void loadImages(false)}>
                {t("admin.common.loadMore")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TableButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  const inTable = editor.isActive("table");
  const tools: Array<ToolButtonProps> = [
    {
      label: t("admin.editor.insertTable"),
      disabled,
      onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      children: <TableIcon aria-hidden="true" size={15} />,
    },
    {
      label: t("admin.editor.addRow"),
      disabled: disabled || !inTable,
      onClick: () => editor.chain().focus().addRowAfter().run(),
      children: <span className="text-xs font-semibold">+R</span>,
    },
    {
      label: t("admin.editor.deleteRow"),
      disabled: disabled || !inTable,
      onClick: () => editor.chain().focus().deleteRow().run(),
      children: <span className="text-xs font-semibold">-R</span>,
    },
    {
      label: t("admin.editor.addColumn"),
      disabled: disabled || !inTable,
      onClick: () => editor.chain().focus().addColumnAfter().run(),
      children: <span className="text-xs font-semibold">+C</span>,
    },
    {
      label: t("admin.editor.deleteColumn"),
      disabled: disabled || !inTable,
      onClick: () => editor.chain().focus().deleteColumn().run(),
      children: <span className="text-xs font-semibold">-C</span>,
    },
    {
      label: t("admin.editor.deleteTable"),
      disabled: disabled || !inTable,
      onClick: () => editor.chain().focus().deleteTable().run(),
      children: <Trash2 aria-hidden="true" size={15} />,
    },
  ];

  return (
    <>
      {tools.map((tool) => (
        <ToolbarButton key={tool.label} active={inTable && tool.label !== t("admin.editor.insertTable")} {...tool} />
      ))}
    </>
  );
}

function HistoryButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { t } = useLocale();
  return (
    <>
      <ToolbarButton
        label={t("admin.editor.undo")}
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 aria-hidden="true" size={15} />
      </ToolbarButton>
      <ToolbarButton
        label={t("admin.editor.redo")}
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 aria-hidden="true" size={15} />
      </ToolbarButton>
    </>
  );
}

export default function RichEditor({ doc, onChange }: RichEditorProps) {
  const { t } = useLocale();
  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState("");
  const skipNextSync = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: editorContent(doc),
    editorProps: { attributes: { class: "tiptap-surface" } },
    onUpdate: ({ editor: instance }) => {
      skipNextSync.current = true;
      onChange(instance.getHTML().trim(), instance.getJSON());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const nextContent = editorContent(doc);
    if (JSON.stringify(nextContent) !== JSON.stringify(editor.getJSON())) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [editor, doc]);

  const cancelSource = useCallback(() => {
    if (!editor) return;
    setSource(editor.getHTML().trim());
    setSourceMode(false);
  }, [editor]);

  const applySource = useCallback(() => {
    if (!editor) return;
    const html = source || "";
    editor.commands.setContent(html, { emitUpdate: false });
    onChange(html.trim(), editor.getJSON());
    setSourceMode(false);
  }, [editor, source, onChange]);

  const toggleSource = useCallback(() => {
    if (!editor) return;
    if (sourceMode) {
      cancelSource();
      return;
    }
    setSource(editor.getHTML().trim());
    setSourceMode(true);
  }, [cancelSource, editor, sourceMode]);

  function onSourceChange(html: string) {
    setSource(html);
  }

  if (!editor) return null;

  return (
    <div className="rounded-md border">
      <div
        className="flex flex-wrap items-center gap-1 border-b p-2"
        role="toolbar"
        aria-label={t("admin.editor.contentEditor")}
      >
        <BlockTypeSelect editor={editor} disabled={sourceMode} />
        <ToolbarDivider />
        <MarkButtons editor={editor} disabled={sourceMode} />
        <ToolbarDivider />
        <ListButtons editor={editor} disabled={sourceMode} />
        <AlignButtons editor={editor} disabled={sourceMode} />
        <ToolbarButton
          label={t("admin.editor.blockquote")}
          active={editor.isActive("blockquote")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote aria-hidden="true" size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("admin.editor.horizontalRule")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus aria-hidden="true" size={15} />
        </ToolbarButton>
        <ToolbarDivider />
        <LinkDialog editor={editor} disabled={sourceMode} />
        <ImageDialog editor={editor} disabled={sourceMode} />
        <ToolbarDivider />
        <TableButtons editor={editor} disabled={sourceMode} />
        <ToolbarDivider />
        <HistoryButtons editor={editor} disabled={sourceMode} />
        <ToolbarButton
          label={t("admin.editor.clear")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser aria-hidden="true" size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("admin.editor.html")} active={sourceMode} onClick={toggleSource}>
          <FileCode2 aria-hidden="true" size={15} />
        </ToolbarButton>
      </div>

      {sourceMode ? (
        <div>
          <Textarea
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            rows={12}
            className="rounded-none border-0 font-mono text-xs focus-visible:ring-0"
          />
          <div className="flex justify-end gap-2 border-t bg-muted/30 p-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelSource}>
              {t("admin.common.cancel")}
            </Button>
            <Button type="button" size="sm" onClick={applySource}>
              {t("admin.common.apply")}
            </Button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} className={cn("tiptap-content px-3 py-2")} />
      )}
    </div>
  );
}
