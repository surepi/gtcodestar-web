import DOMPurify from "isomorphic-dompurify";
import type { UponSanitizeAttributeHookEvent } from "dompurify";
import { generateHTML, type JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

const tiptapExtensions = [
  StarterKit,
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

let sanitizeHooksInstalled = false;

function allowedStyle(value: string): string {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [property, ...rawValueParts] = part.split(":");
      const propertyName = property?.trim().toLowerCase();
      const propertyValue = rawValueParts.join(":").trim().toLowerCase();
      if (propertyName !== "text-align") return "";
      if (!/^(left|right|center|justify|start|end)$/.test(propertyValue)) return "";
      return `text-align: ${propertyValue}`;
    })
    .filter(Boolean)
    .join("; ");
}

function installSanitizeHooks() {
  if (sanitizeHooksInstalled) return;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data: UponSanitizeAttributeHookEvent) => {
    if (data.attrName !== "style") return;
    const next = allowedStyle(data.attrValue);
    if (!next) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = next;
  });
  sanitizeHooksInstalled = true;
}

export function decodeHtml(value: string | undefined): string {
  if (!value) return "";
  let decoded = value;
  for (let index = 0; index < 3; index += 1) {
    const next = decoded
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
      .replace(/&amp;/gi, "&");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function cleanText(value: string | undefined): string {
  return decodeHtml(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[●*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanAltText(value: string | undefined): string {
  return cleanText(value)
    .replace(/\b(images?|photos?|pictures?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// sanitizeHtml strips dangerous markup (scripts, event handlers, javascript:
// URLs, etc.) from CMS-authored rich text before it is injected via set:html /
// dangerouslySetInnerHTML. CMS content is operator-supplied but still untrusted
// (stored-XSS surface), so every HTML sink must pass through here.
export function sanitizeHtml(value: string | undefined): string {
  if (!value) return "";
  installSanitizeHooks();
  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "style"],
  });
}

export function contentHtml(value: string | undefined): string {
  return sanitizeHtml(decodeHtml(value).trim());
}

function isTipTapDoc(value: unknown): value is JSONContent {
  return Boolean(value && typeof value === "object" && (value as JSONContent).type === "doc");
}

export function contentDocHtml(doc: unknown): string {
  if (isTipTapDoc(doc)) {
    try {
      const html = generateHTML(doc, tiptapExtensions);
      return sanitizeHtml(html.trim());
    } catch {
      return "";
    }
  }
  return "";
}

export function excerpt(value: string, max = 140): string {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

export function cleanSummary(value: string | undefined, max = 180): string {
  return excerpt(cleanText(value), max);
}

function usableSummaryText(value: string): boolean {
  return value.length >= 6 && !/^\d+$/.test(value);
}

export function cleanPreferredSummary(values: Array<string | undefined>, max = 180): string {
  for (const value of values) {
    const text = cleanText(value);
    if (usableSummaryText(text)) {
      return excerpt(text, max);
    }
  }
  return "";
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDate(value: string): string {
  if (!value) return "";
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(parsed);
}
