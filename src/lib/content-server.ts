import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

import { sanitizeHtml } from "@/lib/content";

const tiptapExtensions = [
  StarterKit,
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

function isTipTapDoc(value: unknown): value is JSONContent {
  return Boolean(value && typeof value === "object" && (value as JSONContent).type === "doc");
}

export function contentDocHtml(doc: unknown): string {
  if (!isTipTapDoc(doc)) return "";
  try {
    const html = generateHTML(doc, tiptapExtensions);
    return sanitizeHtml(html.trim());
  } catch {
    return "";
  }
}
