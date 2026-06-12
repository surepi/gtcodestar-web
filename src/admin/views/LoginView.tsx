import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginView() {
  const { login, status } = useSession();
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (!siteKey || !widgetRef.current || typeof window === "undefined") return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !widgetRef.current || widgetIdRef.current || !window.turnstile) return;
      try {
        setTurnstileError("");
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setTurnstileToken(token);
            setTurnstileError("");
          },
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => {
            setTurnstileToken("");
            setTurnstileError(t("admin.login.challengeLoadFailed"));
          },
        });
      } catch {
        setTurnstileToken("");
        setTurnstileError(t("admin.login.challengeLoadFailed"));
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      if (!document.querySelector('script[data-turnstile="true"]')) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "true";
        script.onerror = () => {
          if (!cancelled) setTurnstileError(t("admin.login.challengeLoadFailed"));
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, t]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");
    if (!username || !password) {
      setLocalError(t("admin.login.credentialsRequired"));
      return;
    }
    if (siteKey && !turnstileToken) {
      setLocalError(t("admin.login.challengeRequired"));
      return;
    }
    setLocalError("");
    setPending(true);
    try {
      await login(username, password, turnstileToken);
    } catch (error) {
      setLocalError(errorMessage(error, t("admin.login.failed")));
      resetTurnstile();
    } finally {
      setPending(false);
    }
  }

  const notice = localError || status?.message || "";

  return (
    <section className="grid min-h-screen place-items-center p-6">
      <Card className="w-[min(420px,100%)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          <CardHeader>
            <CardDescription>{t("admin.login.title")}</CardDescription>
            <CardTitle>{t("admin.login.signIn")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Label className="grid gap-2">
              {t("admin.login.username")}
              <Input name="username" autoComplete="username" required />
            </Label>
            <Label className="grid gap-2">
              {t("admin.login.password")}
              <Input name="password" type="password" autoComplete="current-password" required />
            </Label>
            {siteKey ? (
              <div className="grid gap-2">
                <div ref={widgetRef} className="min-h-[65px]" />
                {turnstileError ? <p className="text-sm text-destructive">{turnstileError}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-destructive">{t("admin.login.challengeNotConfigured")}</p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? t("admin.login.signingIn") : t("admin.login.signIn")}
            </Button>
            <p className="min-h-5 text-sm text-destructive" role="status">
              {notice}
            </p>
          </CardContent>
        </form>
      </Card>
    </section>
  );
}
