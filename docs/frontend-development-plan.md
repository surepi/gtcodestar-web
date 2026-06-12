# Frontend Development Plan

This file tracks active frontend follow-up work.

## Current Baseline

- Public frontend is implemented in `frontend/` with Astro and TypeScript.
- Public pages build from Go backend APIs and are deployed as static output for Cloudflare Pages.
- The site has entered production.
- Public routes include home, products, product categories, product detail, news, news detail, about, contact, forms, localized `/en/` and `/zh-hans/` paths, sitemap, robots and 404.
- Admin frontend is implemented under `/admin/`.
- Admin modules include auth, content, categories, uploads, messages, settings, logs and media library.
- Admin media library uses cursor pagination for R2 objects and supports detail, copy URL, single delete, batch delete and read-only orphan candidate review.

## Active Follow-Up

### Production Operations

- Keep Cloudflare Pages environment variables aligned with production:
  - `PUBLIC_API_BASE_URL`
  - `PUBLIC_BROWSER_API_BASE_URL`
  - `PUBLIC_API_FALLBACK_BASE_URL`
  - `PUBLIC_SITE_URL`
  - `PUBLIC_DEFAULT_LANG`
  - `PUBLIC_TURNSTILE_SITE_KEY`
- Keep backend CORS valid for:
  - `https://www.gtcodestar.com`
  - `https://dash.gtcodestar.com`
  - Cloudflare Pages preview domains
  - local preview origins when needed
- Monitor production deploy hooks after content and category changes.
- Rebuild and verify Cloudflare Pages output after route, SEO or data-shape changes.

### Public Site QA

- Verify generated static pages after each backend data or route change.
- Spot-check:
  - Home
  - Product list and detail
  - News list and detail
  - About and contact
  - Dynamic forms
  - `/en/` and `/zh-hans/` localized routes
  - Sitemap and robots output
  - Cloudflare Pages fallback behavior for 404

### Admin QA

- Verify login, token refresh behavior and permission-denied states against production backend.
- Verify create/edit/delete flows for content and categories after deployment hook changes.
- Verify media library behavior in both R2-enabled and local-storage-disabled states.
- Confirm destructive media actions still require confirmation and surface per-key failures.

### UX Polish

Historical visual redesign notes remain in:

- `archive/UI_UX_IMPROVEMENT_PLAN.md`

Keep UI polish separate from functional rollout plans.

## Open Decisions

- Final production route slug rules.
- Final list of statically generated product/category/news pages.
- Whether admin remains in the same Cloudflare Pages project long term or moves to a separate project.
