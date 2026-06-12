import {
  BarChart3,
  ClipboardList,
  FileText,
  FolderTree,
  Image,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import type { ViewName } from "@/admin/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const views: Array<{ view: ViewName; icon: typeof BarChart3 }> = [
  { view: "dashboard", icon: BarChart3 },
  { view: "messages", icon: MessageSquare },
  { view: "forms", icon: ClipboardList },
  { view: "contents", icon: FileText },
  { view: "categories", icon: FolderTree },
  { view: "resources", icon: Image },
  { view: "media", icon: Image },
  { view: "rbac", icon: ShieldCheck },
  { view: "settings", icon: Settings },
  { view: "logs", icon: ScrollText },
];

type SidebarProps = {
  className?: string;
  expanded?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
};

export default function Sidebar({
  className,
  expanded = false,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const { view, setView } = useSession();
  const { t } = useLocale();
  const showLabels = expanded || !collapsed;
  return (
    <aside
      className={cn(
        "flex w-16 shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:w-64",
        collapsed && "md:w-16",
        className
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b px-4",
          showLabels ? "justify-start" : "justify-center px-2"
        )}
      >
        {showLabels ? (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              GT
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold">{t("admin.nav.branding")}</strong>
              <span className="block truncate text-xs text-muted-foreground">{t("admin.nav.subtitle")}</span>
            </div>
          </>
        ) : null}
        {onToggleCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("hidden h-9 w-9 shrink-0 md:inline-flex", showLabels && "ml-auto")}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t("admin.nav.expandSidebar") : t("admin.nav.collapseSidebar")}
            title={collapsed ? t("admin.nav.expandSidebar") : t("admin.nav.collapseSidebar")}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" size={17} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={17} />
            )}
          </Button>
        ) : null}
      </div>
      <nav className="grid gap-1 p-3" aria-label={t("admin.nav.breadcrumb")}>
        {views.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <Button
              key={item.view}
              type="button"
              variant="ghost"
              className={cn(
                "h-10 justify-center rounded-md px-3 text-sm",
                showLabels && "md:justify-start",
                active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onClick={() => {
                setView(item.view);
                onNavigate?.();
              }}
              title={t(`admin.nav.${item.view}`)}
            >
              <Icon aria-hidden="true" size={16} />
              <span className={cn(showLabels ? "inline" : "hidden")}>{t(`admin.nav.${item.view}`)}</span>
            </Button>
          );
        })}
      </nav>
      <div className={cn("mt-auto border-t px-4 py-3 text-xs text-muted-foreground", showLabels ? "block" : "hidden")}>
        {t("admin.nav.breadcrumb")}
      </div>
    </aside>
  );
}
