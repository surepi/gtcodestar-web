import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmOptions = {
  title?: string;
  description: string;
  detail?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (confirmed: boolean) => void;
};

type ConfirmState = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmState | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestID = useRef(0);

  const close = useCallback(
    (confirmed: boolean) => {
      setRequest((current) => {
        if (!current) return null;
        current.resolve(confirmed);
        return null;
      });
    },
    []
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    requestID.current += 1;
    return new Promise<boolean>((resolve) => {
      setRequest((current) => {
        current?.resolve(false);
        return { ...options, id: requestID.current, resolve };
      });
    });
  }, []);

  const value = useMemo<ConfirmState>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog open={request !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2 text-destructive">
              <AlertTriangle aria-hidden="true" size={18} />
              <DialogTitle>{request?.title || t("admin.confirm.deleteTitle")}</DialogTitle>
            </div>
            <DialogDescription>{request?.description}</DialogDescription>
          </DialogHeader>
          {request?.detail ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
              {request.detail}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {request?.cancelLabel || t("admin.common.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => close(true)}>
              {request?.confirmLabel || t("admin.common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmState {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
