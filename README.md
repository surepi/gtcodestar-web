# Gtcodestar Frontend

Astro static frontend for the Gtcodestar public website.

## Local Development

```bash
npm install
npm run dev
```

Default local environment:

```env
PUBLIC_API_BASE_URL=http://localhost:8080
PUBLIC_BROWSER_API_BASE_URL=http://localhost:8080
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_DEFAULT_LANG=en
```

Browser-side forms, search, and admin requests use `PUBLIC_BROWSER_API_BASE_URL` when set. If it is not set, they fall back to the local `/backend` Pages Function proxy. This keeps build-time backend URLs such as `localhost` or `127.0.0.1` out of browser requests.

## Build

```bash
npm run build
```

The static site is generated into `dist/`.

## Cloudflare Pages

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`

Test environment:

```env
PUBLIC_API_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FALLBACK_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FETCH_TIMEOUT_MS=30000
PUBLIC_FORM_CODES=1
PUBLIC_SITE_URL=https://www.gtcodestar.com
PUBLIC_DEFAULT_LANG=en
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADMH1a4-bpkND9Do
BACKEND_API_BASE=https://api.gtcodestar.com
NODE_VERSION=22
```

Deployment details are in `docs/cloudflare-pages-deployment.md`.

## S3-compatible Deployment

GitHub Actions can build and upload `dist/` to AWS S3 or Cloudflare R2. See
`docs/s3-deployment.md`.
