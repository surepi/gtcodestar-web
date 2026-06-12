import { ClipboardList, FileText, FolderTree, Image, MessageSquare, ScrollText, Settings } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import type { ViewName } from "@/admin/lib/types";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardView() {
  const { user, setView } = useSession();
  const { t } = useLocale();
  const name = user ? user.realName || user.username : "-";
  const roles = user?.roles?.map((role) => role.name || role.code).join(", ") || "-";
  const cards = [
    { label: t("admin.dashboard.account"), value: name },
    { label: t("admin.dashboard.roles"), value: roles },
    { label: t("admin.dashboard.api"), value: t("admin.dashboard.connected") },
  ];
  const quickActions: Array<{ view: ViewName; label: string; description: string; icon: typeof FileText }> = [
    {
      view: "contents",
      label: t("admin.nav.contents"),
      description: t("admin.dashboard.contentsDesc"),
      icon: FileText,
    },
    {
      view: "categories",
      label: t("admin.nav.categories"),
      description: t("admin.dashboard.categoriesDesc"),
      icon: FolderTree,
    },
    {
      view: "resources",
      label: t("admin.nav.resources"),
      description: t("admin.dashboard.resourcesDesc"),
      icon: Image,
    },
    { view: "media", label: t("admin.nav.mediaLibrary"), description: t("admin.dashboard.mediaDesc"), icon: Image },
    {
      view: "messages",
      label: t("admin.nav.messages"),
      description: t("admin.dashboard.messagesDesc"),
      icon: MessageSquare,
    },
    {
      view: "forms",
      label: t("admin.nav.forms"),
      description: t("admin.dashboard.formsDesc"),
      icon: ClipboardList,
    },
    {
      view: "settings",
      label: t("admin.nav.settings"),
      description: t("admin.dashboard.settingsDesc"),
      icon: Settings,
    },
    { view: "logs", label: t("admin.nav.operationLogs"), description: t("admin.dashboard.logsDesc"), icon: ScrollText },
  ];

  return (
    <section className="grid gap-5">
      <div className="rounded-md border bg-card p-5">
        <p className="text-xs uppercase tracking-normal text-muted-foreground">{t("admin.nav.breadcrumb")}</p>
        <h2 className="mt-1 text-lg font-semibold">{t("admin.dashboard.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("admin.dashboard.desc")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="grid gap-1 p-5">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <strong className="truncate text-lg font-semibold">{card.value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.view}
              type="button"
              className="group grid gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => setView(action.view)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" size={20} />
                </div>
                <span className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  {t("admin.common.open")}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{action.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
