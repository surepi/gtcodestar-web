import { useCallback, useEffect, useState } from "react";

import type { PageResult } from "@/admin/lib/types";

type UsePagedListOptions<T> = {
  pageSize: number;
  loadPage: (page: number, pageSize: number) => Promise<PageResult<T>>;
  getErrorMessage: (error: unknown) => string;
  onLoadSuccess?: () => void;
  onLoadError?: (message: string) => void;
};

export function usePagedList<T>({
  pageSize,
  loadPage,
  getErrorMessage,
  onLoadSuccess,
  onLoadError,
}: UsePagedListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loadPage(page, pageSize);
      setItems(result.items);
      setTotal(result.total);
      onLoadSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setItems([]);
      setError(message);
      onLoadError?.(message);
    } finally {
      setLoading(false);
    }
  }, [getErrorMessage, loadPage, onLoadError, onLoadSuccess, page, pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);

  return {
    items,
    setItems,
    page,
    setPage,
    total,
    loading,
    error,
    reload,
    pageStart,
    pageEnd,
    prevPage: () => setPage((value) => Math.max(1, value - 1)),
    nextPage: () => setPage((value) => value + 1),
  };
}
