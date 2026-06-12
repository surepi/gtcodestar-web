import { Suspense, lazy, useEffect, useState, type ComponentType, type LazyExoticComponent } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession, type ToastNotice } from "@/admin/context/SessionContext";
import Sidebar from "@/admin/views/Sidebar";
import Topbar from "@/admin/views/Topbar";
import type { ViewName } from "@/admin/lib/types";
import { cn } from "@/lib/utils";

const views: Record<ViewName, LazyExoticComponent<ComponentType>> = {
  dashboard: lazy(() => import("@/admin/views/DashboardView")),
  messages: lazy(() => import("@/admin/views/MessagesView")),
  forms: lazy(() => import("@/admin/views/FormSubmissionsView")),
  contents: lazy(() => import("@/admin/views/ContentsView")),
  categories: lazy(() => import("@/admin/views/CategoriesView")),
  resources: lazy(() => import("@/admin/views/ResourcesView")),
  rbac: lazy(() => import("@/admin/views/RBACView")),
  media: lazy(() => import("@/admin/views/MediaView")),
  settings: lazy(() => import("@/admin/views/SettingsView")),
  logs: lazy(() => import("@/admin/views/LogsView")),
};

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

function Workspace() {
  const { view } = useSession();
  const { t } = useLocale();
  const [mountedViews, setMountedViews] = useState<ViewName[]>([view]);

  useEffect(() => {
    setMountedViews((current) => (current.includes(view) ? current : [...current, view]));
  }, [view]);

  const fallback = (
    <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed bg-card text-sm text-muted-foreground">
      {t("admin.common.loading")}
    </div>
  );

  return (
    <>
      {mountedViews.map((mountedView) => {
        const View = views[mountedView] || views.dashboard;
        const active = mountedView === view;
        return (
          <div key={mountedView} hidden={!active} aria-hidden={!active}>
            <Suspense fallback={active ? fallback : null}>
              <View />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}

function ToastItem({
  toast,
  dismissLabel,
  onDismiss,
}: {
  toast: ToastNotice;
  dismissLabel: string;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), toast.kind === "error" ? 7000 : 4200);
    return () => window.clearTimeout(timeout);
  }, [toast.id, toast.kind, onDismiss]);

  const Icon = toast.kind === "error" ? AlertTriangle : toast.kind === "info" ? Info : CheckCircle2;

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-md border bg-card p-3 text-sm shadow-lg",
        toast.kind === "error"
          ? "border-destructive/25 text-destructive"
          : toast.kind === "info"
            ? "border-primary/20 text-foreground"
            : "border-emerald-200 text-emerald-800"
      )}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words leading-5">{toast.message}</p>
      <button
        type="button"
        className="rounded-sm p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={dismissLabel}
        onClick={() => onDismiss(toast.id)}
      >
        <X aria-hidden="true" size={14} />
      </button>
    </div>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useSession();
  const { t } = useLocale();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} dismissLabel={t("admin.common.dismiss")} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

export default function Shell() {
  const { status, clearStatus } = useSession();
  const { t } = useLocale();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // localStorage unavailable
    }
  }, [sidebarCollapsed]);

  return (
    <section className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar
        className="hidden md:flex"
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("admin.common.dismiss")}
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar
            className="relative z-10 h-full w-72 shadow-xl"
            expanded
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <ToastViewport />
        {status ? (
          <div
            className={cn(
              "mx-4 mt-4 flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm shadow-sm lg:mx-6",
              status.kind === "error"
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground"
            )}
            role="status"
          >
            <span>{status.message}</span>
            <button type="button" className="text-xs underline opacity-70 hover:opacity-100" onClick={clearStatus}>
              {t("admin.common.dismiss")}
            </button>
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Workspace />
          </div>
        </main>
      </div>
    </section>
  );
}
