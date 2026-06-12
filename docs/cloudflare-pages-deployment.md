# Cloudflare Pages Deployment

Target test domain: `gtcodestar-go.pages.dev`.

Final public domain: `www.gtcodestar.com`.

## Project Settings

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `frontend`
- Node version: `22`

If Cloudflare does not read `.node-version`, set this environment variable in Pages:

```env
NODE_VERSION=22
```

## Environment Variables

Test site on `gtcodestar-go.pages.dev`:

```env
PUBLIC_API_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FALLBACK_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FETCH_TIMEOUT_MS=30000
PUBLIC_FORM_CODES=1
PUBLIC_SITE_URL=https://gtcodestar-go.pages.dev
PUBLIC_DEFAULT_LANG=en
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADMH1a4-bpkND9Do
BACKEND_API_BASE=https://api.gtcodestar.com
```

Final site on `www.gtcodestar.com`:

```env
PUBLIC_API_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FALLBACK_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FETCH_TIMEOUT_MS=30000
PUBLIC_FORM_CODES=1
PUBLIC_SITE_URL=https://www.gtcodestar.com
PUBLIC_DEFAULT_LANG=en
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADMH1a4-bpkND9Do
BACKEND_API_BASE=https://api.gtcodestar.com
```

Browser-side admin, search, and form submissions use `PUBLIC_BROWSER_API_BASE_URL` when set; otherwise they use the local `/backend` Pages Function proxy. On Cloudflare Pages, keep `PUBLIC_BROWSER_API_BASE_URL` unset and set `BACKEND_API_BASE` to the Go API origin.

When the backend domain changes, update both `PUBLIC_API_BASE_URL` and `BACKEND_API_BASE` in Cloudflare Pages. `PUBLIC_API_BASE_URL` is used during the static build, while `BACKEND_API_BASE` is used by the `/backend` Pages Function after deploy.

Cloudflare Turnstile site keys are domain-bound. If the admin domain changes, add the new frontend hostname to the Turnstile widget in Cloudflare or create a new widget, then set `PUBLIC_TURNSTILE_SITE_KEY` in Cloudflare Pages and redeploy. The Go backend still needs the matching `TURNSTILE_SECRET_KEY`.

Current local Docker preview:

```env
PUBLIC_API_BASE_URL=http://localhost:8080
PUBLIC_API_FETCH_TIMEOUT_MS=30000
PUBLIC_BROWSER_API_BASE_URL=http://localhost:8080
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_DEFAULT_LANG=en
PUBLIC_TURNSTILE_SITE_KEY=...
```

## Backend CORS

The backend must allow browser requests from:

- `https://dash.gtcodestar.com`
- `https://www.gtcodestar.com`
- `https://*.pages.dev`

Current backend defaults already include these origins.

## Generated Static Files

Cloudflare Pages uses these files from `frontend/public/`:

- `_headers`: security headers and cache headers
- `_redirects`: legacy Chinese path redirects to `/zh-hans/`

Astro copies them to `dist/` during build.

## Pre-deploy Checks

Run locally before pushing:

```bash
PUBLIC_API_BASE_URL=http://127.0.0.1:8080 PUBLIC_SITE_URL=http://107.173.199.140:4321 npm run build
```

For the test domain build:

```bash
PUBLIC_API_BASE_URL=https://api.gtcodestar.com PUBLIC_SITE_URL=https://gtcodestar-go.pages.dev npm run build
```

Check after deploy:

- `https://gtcodestar-go.pages.dev/`
- `https://gtcodestar-go.pages.dev/admin/`
- `https://gtcodestar-go.pages.dev/products/`
- `https://gtcodestar-go.pages.dev/product/GT-M93-109/`
- `https://gtcodestar-go.pages.dev/zh-hans/`
- `https://gtcodestar-go.pages.dev/contact/`
- `https://gtcodestar-go.pages.dev/sitemap.xml`
- Contact form submit
- Product search
- News search
- Admin login and message list

## Domain Switch

After `dash.gtcodestar.com` is accepted:

1. Change `PUBLIC_SITE_URL` to `https://www.gtcodestar.com`.
2. Add `www.gtcodestar.com` as the production custom domain in Cloudflare Pages.
3. Add the active frontend/admin hostname to the Turnstile widget's Hostname Management list. Use bare hostnames such as `www.gtcodestar.com` or `dash.gtcodestar.com`, without `https://` or a path.
4. Rebuild and redeploy.
5. Verify `sitemap.xml`, canonical links and hreflang links use `www.gtcodestar.com`.
