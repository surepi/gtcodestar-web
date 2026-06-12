import {
  apiGet,
  apiGetFallback,
  type Category,
  type ContentSummary,
  type MetaData,
  type PageResult,
  type SiteData,
} from "@/lib/api";

export type HomePageData = {
  siteData: SiteData;
  categories: Category[];
  products: PageResult<ContentSummary>;
  news: PageResult<ContentSummary>;
  meta: MetaData;
};

export async function loadHomePageData(backendLang: string): Promise<HomePageData> {
  const [siteData, categories, products, news, meta] = await Promise.all([
    apiGetFallback<SiteData>(`/api/site?lang=${backendLang}`, "/api/site?lang=en"),
    apiGetFallback<Category[]>(
      `/api/categories/tree?lang=${backendLang}`,
      "/api/categories/tree?lang=en",
      (items) => items.length === 0
    ),
    apiGet<PageResult<ContentSummary>>(`/api/products?lang=${backendLang}&page=1&pageSize=6`),
    apiGet<PageResult<ContentSummary>>(`/api/news?lang=${backendLang}&page=1&pageSize=3`),
    apiGetFallback<MetaData>(`/api/seo/site?lang=${backendLang}`, "/api/seo/site?lang=en"),
  ]);
  return {
    siteData,
    categories,
    products,
    news,
    meta,
  };
}
