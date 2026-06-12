const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || "https://api.gtcodestar.com";
const API_FALLBACK_BASE = import.meta.env.PUBLIC_API_FALLBACK_BASE_URL || "";
const API_FETCH_TIMEOUT_MS = Number(import.meta.env.PUBLIC_API_FETCH_TIMEOUT_MS || 30000);
export const DEFAULT_LANG = import.meta.env.PUBLIC_DEFAULT_LANG || "en";
const getCache = new Map<string, Promise<unknown>>();

export type Envelope<T> = {
  code: number;
  message: string;
  data?: T;
  details?: unknown;
};

export type SiteData = {
  lang: string;
  site: {
    title: string;
    subtitle: string;
    keywords: string;
    description: string;
    domain: string;
    logo: string;
  };
  company: {
    name: string;
    address: string;
    contact: string;
    mobile: string;
    phone: string;
    email: string;
  };
  config: Record<string, string>;
  labels: Record<string, string>;
};

export type Category = {
  code: string;
  parentCode: string;
  name: string;
  modelCode: string;
  modelName: string;
  filename: string;
  url?: string;
  children?: Category[];
};

export type ContentSummary = {
  id: number;
  lang: string;
  scode: string;
  title: string;
  subtitle: string;
  filename: string;
  date: string;
  icon: string;
  keywords?: string;
  description: string;
  visits: number;
  likes: number;
  ext: Record<string, string>;
};

export type ContentDetail = ContentSummary & {
  content: string;
  doc?: unknown;
  pics: string;
  picstitle: string;
  tags: string;
  enclosure: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type Slide = {
  id: number;
  lang: string;
  gid: number;
  pic: string;
  link: string;
  title: string;
  subtitle: string;
  sorting: number;
};

export type FriendLink = {
  id: number;
  lang: string;
  gid: number;
  name: string;
  link: string;
  logo: string;
  sorting: number;
};

export type MetaData = {
  title: string;
  keywords: string;
  description: string;
  url: string;
  canonical: string;
};

export type DynamicFormField = {
  name: string;
  length: number;
  required: string;
  description: string;
};

export type DynamicFormDefinition = {
  code: string;
  name: string;
  tableName: string;
  fields: DynamicFormField[];
};

export class ApiFetchError extends Error {
  status: number;
  code?: number;
  path: string;

  constructor(message: string, path: string, status: number, code?: number) {
    super(message);
    this.name = "ApiFetchError";
    this.path = path;
    this.status = status;
    this.code = code;
  }
}

async function fetchWithRetry(url: string, init?: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    } finally {
      clearTimeout(timeout);
    }
  }
  const message = lastError instanceof Error ? lastError.message : "API request failed";
  throw new Error(`API request failed after ${attempts} attempts: ${url} (${message})`);
}

async function apiFetch(path: string): Promise<Response> {
  const bases = Array.from(new Set([API_BASE, API_FALLBACK_BASE].filter(Boolean)));
  let lastError: unknown;
  for (const base of bases) {
    try {
      return await fetchWithRetry(`${base}${path}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`API request failed: ${path}`);
}

function decodeHtmlEntities(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'");
}

function cleanPayloadData<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }
  // Check if it is SiteData
  if ("site" in data && "company" in data) {
    const siteData = data as unknown as SiteData;
    return {
      ...siteData,
      site: {
        ...siteData.site,
        title: decodeHtmlEntities(siteData.site.title),
        subtitle: decodeHtmlEntities(siteData.site.subtitle),
        keywords: decodeHtmlEntities(siteData.site.keywords),
        description: decodeHtmlEntities(siteData.site.description),
      },
      company: {
        ...siteData.company,
        name: decodeHtmlEntities(siteData.company.name),
        address: decodeHtmlEntities(siteData.company.address),
        contact: decodeHtmlEntities(siteData.company.contact),
        mobile: decodeHtmlEntities(siteData.company.mobile),
        phone: decodeHtmlEntities(siteData.company.phone),
        email: decodeHtmlEntities(siteData.company.email),
      },
    } as unknown as T;
  }
  // Check if it is MetaData
  if ("title" in data && "keywords" in data && "description" in data && "canonical" in data) {
    const metaData = data as unknown as MetaData;
    return {
      ...metaData,
      title: decodeHtmlEntities(metaData.title),
      keywords: decodeHtmlEntities(metaData.keywords),
      description: decodeHtmlEntities(metaData.description),
    } as unknown as T;
  }
  return data;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    throw new ApiFetchError(`API request failed: ${response.status} ${path}`, path, response.status);
  }
  const payload = (await response.json()) as Envelope<T>;
  if (payload.code !== 0 || payload.data === undefined) {
    throw new ApiFetchError(payload.message || `API error: ${path}`, path, response.status, payload.code);
  }
  return cleanPayloadData(payload.data);
}

export function apiGetCached<T>(path: string): Promise<T> {
  const cached = getCache.get(path);
  if (cached) return cached as Promise<T>;
  const request = apiGet<T>(path).catch((error) => {
    getCache.delete(path);
    throw error;
  });
  getCache.set(path, request);
  return request;
}

export async function apiTryGet<T>(path: string): Promise<T | null> {
  try {
    return await apiGetCached<T>(path);
  } catch (error) {
    if (error instanceof ApiFetchError && (error.status === 404 || error.code === 40401)) {
      return null;
    }
    throw error;
  }
}

export async function apiGetFallback<T>(
  primaryPath: string,
  fallbackPath: string,
  isEmpty?: (value: T) => boolean
): Promise<T> {
  const primary = await apiTryGet<T>(primaryPath);
  if (primary !== null && !isEmpty?.(primary)) return primary;
  return apiGetCached<T>(fallbackPath);
}

export async function apiGetSoftFallback<T>(
  primaryPath: string,
  fallbackPath: string,
  isEmpty?: (value: T) => boolean
): Promise<T> {
  try {
    const primary = await apiGetCached<T>(primaryPath);
    if (!isEmpty?.(primary)) return primary;
  } catch {
    // Optional localized metadata should not fail static generation when the
    // canonical content exists and the fallback language can provide SEO data.
  }
  return apiGetCached<T>(fallbackPath);
}

function appendQuery(path: string, params: Record<string, string | number>): string {
  const [pathname, query = ""] = path.split("?", 2);
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `${pathname}?${encoded}` : pathname;
}

export async function apiGetAllContentSummaries(basePath: string, pageSize = 100): Promise<PageResult<ContentSummary>> {
  const firstPage = await apiGetCached<PageResult<ContentSummary>>(appendQuery(basePath, { page: 1, pageSize }));
  const effectivePageSize = firstPage.pageSize || pageSize;
  const totalPages = Math.ceil(firstPage.total / effectivePageSize);
  if (totalPages <= 1) return firstPage;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      apiGetCached<PageResult<ContentSummary>>(appendQuery(basePath, { page: index + 2, pageSize: effectivePageSize }))
    )
  );
  return {
    ...firstPage,
    items: [firstPage, ...rest].flatMap((page) => page.items),
  };
}

export async function apiGetAllContentSummariesFallback(
  primaryBasePath: string,
  fallbackBasePath: string,
  isEmpty?: (value: PageResult<ContentSummary>) => boolean,
  pageSize = 100
): Promise<PageResult<ContentSummary>> {
  const primary = await apiGetAllContentSummaries(primaryBasePath, pageSize);
  if (!isEmpty?.(primary)) return primary;
  return apiGetAllContentSummaries(fallbackBasePath, pageSize);
}

export function withLang(path: string, lang = DEFAULT_LANG): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${encodeURIComponent(lang)}`;
}

export function imageURL(value: string | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

export function contentHref(kind: "product" | "news", item: ContentSummary): string {
  const slug = item.filename || String(item.id);
  return `/${kind}/${encodeURIComponent(slug)}-${item.id}/`;
}

export function productCategoryChildren(categories: Category[]): Category[] {
  const root = categories.find((item) => item.modelCode === "3" && item.parentCode === "0");
  if (root?.children?.length) return root.children;
  return categories.filter((item) => item.modelCode === "3" && item.parentCode !== "0");
}

export function categoryHref(category: Category): string {
  return `/products/category/${encodeURIComponent(category.code)}/`;
}
