// API client + token management, ported from the legacy index.astro apiFetch.
// The admin JWT now lives in an HttpOnly cookie set by the backend, so the
// browser never holds it (no localStorage token — that was the stored-XSS
// exfil path). All requests send credentials so the cookie rides along; auth
// state is derived purely from /admin/auth/me succeeding.

import type { Envelope } from "@/admin/lib/types";

// Non-sensitive cached profile (display name/roles) for instant first paint.
// The cookie — not this — is what authorizes requests.
export const USER_KEY = "gtcodestar.admin.user";

export function clearSession(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export class UnauthorizedError extends Error {}

// Carries the backend envelope code so callers can branch on specific codes
// (e.g. 50101 "object management unsupported") without matching message text.
export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export type AdminClient = {
  fetch: <T>(path: string, init?: RequestInit) => Promise<T>;
};

/**
 * Build an API client bound to a base URL. `onUnauthorized` fires once per 401
 * (or envelope code 40101) after the session is cleared, so the caller can
 * route back to the login view.
 */
export function createClient(apiBase: string, onUnauthorized: () => void): AdminClient {
  async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    // credentials:"include" sends the HttpOnly auth cookie (same-origin via the
    // /backend proxy, or cross-origin in split dev). No Authorization header —
    // the browser no longer holds the token.
    const response = await fetch(`${apiBase}${path}`, { ...init, headers, credentials: "include" });
    const text = await response.text();
    let payload: Envelope<T>;
    try {
      payload = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(`Request failed: ${response.status} ${text.slice(0, 120) || response.statusText}`);
    }
    if (response.status === 401 || payload.code === 40101) {
      clearSession();
      onUnauthorized();
      throw new UnauthorizedError(payload.message || "Unauthorized");
    }
    if (!response.ok || payload.code !== 0 || payload.data === undefined) {
      throw new ApiError(payload.message || "Request failed", payload.code);
    }
    return payload.data;
  }

  return { fetch: apiFetch };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
