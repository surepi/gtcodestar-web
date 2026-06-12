import { LocaleProvider, useLocale } from "@/admin/context/LocaleContext";
import { ConfirmProvider } from "@/admin/context/ConfirmContext";
import { SessionProvider, useSession } from "@/admin/context/SessionContext";
import LoginView from "@/admin/views/LoginView";
import Shell from "@/admin/views/Shell";

function Gate() {
  const { ready, authed } = useSession();
  const { t } = useLocale();
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="rounded-md border border-dashed bg-card px-6 py-4 text-sm text-muted-foreground">
          {t("admin.common.loading")}
        </div>
      </div>
    );
  }
  return authed ? <Shell /> : <LoginView />;
}

function AdminInner({ apiBase }: { apiBase: string }) {
  const { t } = useLocale();
  // Widen the key type so SessionProvider can accept the function.
  const tx = (key: string, vars?: Record<string, string | number>) => t(key as Parameters<typeof t>[0], vars);
  return (
    <SessionProvider apiBase={apiBase} t={tx}>
      <ConfirmProvider>
        <div className="admin-app min-h-screen bg-background text-foreground">
          <Gate />
        </div>
      </ConfirmProvider>
    </SessionProvider>
  );
}

export default function AdminApp({ apiBase }: { apiBase: string }) {
  return (
    <LocaleProvider>
      <AdminInner apiBase={apiBase} />
    </LocaleProvider>
  );
}
