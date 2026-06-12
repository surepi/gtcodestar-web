/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_API_FETCH_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type TurnstileWidgetId = string;

interface Window {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }
    ) => TurnstileWidgetId;
    reset: (widgetId?: TurnstileWidgetId) => void;
    remove: (widgetId: TurnstileWidgetId) => void;
  };
  onTurnstileLoad?: () => void;
}
