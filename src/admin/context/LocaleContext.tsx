import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocale, t as translate, type LabelKey, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "admin-locale";
const CONTENT_LANG_STORAGE_KEY = "admin-content-lang";

export type AdminContentLang = "en" | "zh-hans";

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored ?? undefined)) return stored as Locale;
  } catch {
    // localStorage unavailable
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "";
    if (nav.toLowerCase().startsWith("zh")) return "zh-hans";
  }
  return "en";
}

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  contentLang: AdminContentLang;
  setContentLang: (lang: AdminContentLang) => void;
  t: (key: LabelKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  const [contentLang, setContentLangState] = useState<AdminContentLang>(() => {
    try {
      const stored = localStorage.getItem(CONTENT_LANG_STORAGE_KEY);
      if (stored === "en" || stored === "zh-hans") return stored;
    } catch {
      // localStorage unavailable
    }
    return "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage unavailable
    }
  }, [locale]);

  useEffect(() => {
    try {
      localStorage.setItem(CONTENT_LANG_STORAGE_KEY, contentLang);
    } catch {
      // localStorage unavailable
    }
  }, [contentLang]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const setContentLang = useCallback((next: AdminContentLang) => {
    if (next === contentLang) return;
    const event = new CustomEvent("admin:before-navigation", { cancelable: true, detail: { contentLang: next } });
    if (!window.dispatchEvent(event)) return;
    setContentLangState(next);
  }, [contentLang]);

  const boundT = useCallback(
    (key: LabelKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<LocaleState>(
    () => ({ locale, setLocale, contentLang, setContentLang, t: boundT }),
    [locale, setLocale, contentLang, setContentLang, boundT]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
