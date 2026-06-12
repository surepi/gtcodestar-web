export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function numberedPages(total: number, pageSize: number): number[] {
  return Array.from({ length: pageCount(total, pageSize) }, (_, index) => index + 1);
}

export function pageHref(basePath: string, page: number): string {
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return page <= 1 ? base : `${base}page/${page}/`;
}
