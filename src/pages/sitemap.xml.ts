import {
  apiGet,
  apiGetAllContentSummaries,
  apiGetFallback,
  contentHref,
  productCategoryChildren,
  type Category,
} from "@/lib/api";
import { PREFIXED_LOCALES, apiLang } from "@/lib/i18n";
import { numberedPages, pageHref } from "@/lib/pagination";

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || "https://www.gtcodestar.com").replace(/\/$/, "");

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteURL(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function urlEntry(path: string, priority: string, changefreq = "weekly"): string {
  return `  <url>
    <loc>${xmlEscape(absoluteURL(path))}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const productPageSize = 24;
  const newsPageSize = 9;
  const [defaultCategories, defaultProducts, defaultNews] = await Promise.all([
    apiGet<Category[]>(`/api/categories/tree?lang=en`),
    apiGetAllContentSummaries(`/api/products?lang=en`),
    apiGetAllContentSummaries(`/api/news?lang=en`),
  ]);
  const entries = [
    urlEntry("/", "1.0", "daily"),
    urlEntry("/products/", "0.9", "daily"),
    ...numberedPages(defaultProducts.total, productPageSize)
      .filter((page) => page > 1)
      .map((page) => urlEntry(pageHref("/products/", page), "0.8", "daily")),
    ...productCategoryChildren(defaultCategories).map((category) =>
      urlEntry(`/products/category/${category.code}/`, "0.8")
    ),
    ...defaultProducts.items.map((item) => urlEntry(contentHref("product", item), "0.7")),
    urlEntry("/news/", "0.6", "weekly"),
    ...numberedPages(defaultNews.total, newsPageSize)
      .filter((page) => page > 1)
      .map((page) => urlEntry(pageHref("/news/", page), "0.5", "weekly")),
    ...defaultNews.items.map((item) => urlEntry(contentHref("news", item), "0.5")),
    urlEntry("/about/", "0.5", "monthly"),
    urlEntry("/contact/", "0.5", "monthly"),
  ];

  for (const locale of PREFIXED_LOCALES) {
    const lang = apiLang(locale);
    const prefix = `/${locale}`;
    const [categories, products, news] = await Promise.all([
      apiGetFallback<Category[]>(
        `/api/categories/tree?lang=${lang}`,
        `/api/categories/tree?lang=en`,
        (items) => items.length === 0
      ),
      apiGetAllContentSummaries(`/api/products?lang=${lang}`),
      apiGetAllContentSummaries(`/api/news?lang=${lang}`),
    ]);

    entries.push(
      urlEntry(`${prefix}/`, "1.0", "daily"),
      urlEntry(`${prefix}/products/`, "0.9", "daily"),
      ...numberedPages(products.total, productPageSize)
        .filter((page) => page > 1)
        .map((page) => urlEntry(pageHref(`${prefix}/products/`, page), "0.8", "daily")),
      ...productCategoryChildren(categories).map((category) =>
        urlEntry(`${prefix}/products/category/${category.code}/`, "0.8")
      ),
      ...products.items.map((item) => urlEntry(`${prefix}${contentHref("product", item)}`, "0.7")),
      urlEntry(`${prefix}/news/`, "0.6", "weekly"),
      ...numberedPages(news.total, newsPageSize)
        .filter((page) => page > 1)
        .map((page) => urlEntry(pageHref(`${prefix}/news/`, page), "0.5", "weekly")),
      ...news.items.map((item) => urlEntry(`${prefix}${contentHref("news", item)}`, "0.5")),
      urlEntry(`${prefix}/about/`, "0.5", "monthly"),
      urlEntry(`${prefix}/contact/`, "0.5", "monthly")
    );
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    }
  );
}
