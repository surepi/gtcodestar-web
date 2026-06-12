import { Globe, LogOut, Menu } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import type { ViewName } from "@/admin/lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { LabelKey } from "@/lib/i18n";

const titleKeys: Record<ViewName, LabelKey> = {
  dashboard: "admin.nav.dashboard",
  messages: "admin.nav.messages",
  forms: "admin.nav.forms",
  contents: "admin.nav.contents",
  categories: "admin.nav.categories",
  resources: "admin.nav.resources",
  rbac: "admin.nav.rbac",
  media: "admin.nav.mediaLibrary",
  settings: "admin.nav.settings",
  logs: "admin.nav.operationLogs",
};

type TopbarProps = {
  onMenuClick?: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { view, user, logout } = useSession();
  const { locale, setLocale, contentLang, setContentLang, t } = useLocale();
  const name = user ? user.realName || user.username : "";

  function toggleLocale() {
    setLocale(locale === "zh-hans" ? "en" : "zh-hans");
  }

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-3 py-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label={t("admin.common.menu")}
        >
          <Menu aria-hidden="true" size={18} />
        </Button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-normal text-muted-foreground">{t("admin.nav.breadcrumb")}</p>
          <h1 className="truncate text-lg font-semibold">{t(titleKeys[view])}</h1>
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
        <Select value={contentLang} onValueChange={(value) => setContentLang(value === "cn" ? "cn" : "en")}>
          <SelectTrigger className="h-9 w-[116px] sm:w-[124px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="cn">中文内容</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="ghost" size="sm" onClick={toggleLocale}>
          <Globe aria-hidden="true" size={16} />
          {locale === "zh-hans" ? "EN" : "中文"}
        </Button>
        <span className="hidden max-w-36 truncate text-sm text-muted-foreground lg:inline">{name}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          <LogOut aria-hidden="true" size={16} />
          <span className="hidden sm:inline">{t("admin.common.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
