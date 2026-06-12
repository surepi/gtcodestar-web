import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { Button } from "@/components/ui/button";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({ page, pageSize, total, onPrev, onNext }: PaginationProps) {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;
  return (
    <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
      <span>{t("admin.common.pageNofM", { page, total: totalPages })}</span>
      <Button type="button" variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
        <ChevronLeft aria-hidden="true" size={16} />
        {t("admin.common.prev")}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
        {t("admin.common.next")}
        <ChevronRight aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}
