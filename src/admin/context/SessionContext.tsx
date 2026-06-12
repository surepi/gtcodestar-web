import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createClient, clearSession, USER_KEY, type AdminClient } from "@/admin/lib/client";
import type { LoginData, User, ViewName } from "@/admin/lib/types";

export type StatusKind = "success" | "info" | "error";

export type StatusNotice = {
  message: string;
  kind: StatusKind;
} | null;

export type ToastNotice = {
  id: number;
  message: string;
  kind: StatusKind;
};

type SessionState = {
  ready: boolean;
  authed: boolean;
  user: User | null;
  view: ViewName;
  status: StatusNotice;
  toasts: ToastNotice[];
  client: AdminClient;
  setView: (view: ViewName) => void;
  setStatus: (message: string, kind?: StatusKind) => void;
  clearStatus: () => void;
  dismissToast: (id: number) => void;
  login: (username: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({
  apiBase,
  t: tx,
  children,
}: {
  apiBase: string;
  t?: (key: string, vars?: Record<string, string | number>) => string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewName>("dashboard");
  const [status, setStatusState] = useState<StatusNotice>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const toastID = useRef(0);

  // Stable ref so the client's onUnauthorized callback never goes stale.
  const handleUnauthorized = useRef(() => {});

  const client = useMemo(() => createClient(apiBase, () => handleUnauthorized.current()), [apiBase]);

  const requestViewChange = useCallback((next: ViewName) => {
    const event = new CustomEvent("admin:before-navigation", { cancelable: true, detail: { view: next } });
    if (!window.dispatchEvent(event)) return;
    setView(next);
  }, []);

  const setStatus = useCallback((message: string, kind: StatusKind = "success") => {
    if (!message) return;
    toastID.current += 1;
    setToasts((current) => [...current, { id: toastID.current, message, kind }].slice(-4));
  }, []);

  const clearStatus = useCallback(() => setStatusState(null), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const persistUser = useCallback((value: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(value));
    setUser(value);
  }, []);

  handleUnauthorized.current = () => {
    setAuthed(false);
    setUser(null);
    setView("dashboard");
    setStatusState({ message: tx?.("admin.login.sessionExpired") || "Session expired. Please sign in again.", kind: "error" });
  };

  const login = useCallback(
    async (username: string, password: string, turnstileToken = "") => {
      // The backend sets the HttpOnly auth cookie on this response; we only
      // keep the non-sensitive user profile for display.
      const result = await client.fetch<LoginData>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      persistUser(result.user);
      setAuthed(true);
      setView("dashboard");
      clearStatus();
    },
    [client, persistUser, clearStatus]
  );

  const logout = useCallback(async () => {
    try {
      // Server clears the cookie and revokes the token version.
      await client.fetch<{ status: string }>("/admin/auth/logout", { method: "POST" });
    } catch {
      // Local logout still clears cached state even if the server rejects it.
    }
    clearSession();
    setAuthed(false);
    setUser(null);
    setView("dashboard");
    clearStatus();
  }, [client, clearStatus]);

  // Bootstrap: the cookie (if any) is HttpOnly and invisible to JS, so always
  // ask the server. A 401 simply means "not signed in".
  useEffect(() => {
    let cancelled = false;
    client
      .fetch<User>("/admin/auth/me")
      .then((me) => {
        if (cancelled) return;
        persistUser(me);
        setAuthed(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthed(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client, persistUser]);

  // t is intentionally omitted from deps — it's stable from LocaleContext.
  const value = useMemo<SessionState>(
    () => ({
      ready,
      authed,
      user,
      view,
      status,
      toasts,
      client,
      setView: requestViewChange,
      setStatus,
      clearStatus,
      dismissToast,
      login,
      logout,
    }),
    [ready, authed, user, view, status, toasts, client, requestViewChange, setStatus, clearStatus, dismissToast, login, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
