# UI And Frontend Layout Development Plan

Status: active

The public site is already in production. This plan covers the next UI and page
layout pass for the public frontend, with a smaller follow-up track for admin UI
consistency. The goal is to improve visual quality without changing backend API
contracts or production routing.

## Design Direction

- Premium industrial technology site: clean, precise, product-led.
- Visual reference: Apple/DJI-style restraint, but adapted for barcode scanner
  and hardware product browsing.
- Product imagery should carry the layout. Avoid decorative gradients, abstract
  SVG hero art, and marketing-only sections that do not help product evaluation.
- Keep pages fast, SEO-friendly, and mostly static. Use client JavaScript only
  where the existing interaction needs it.

## Scope

### In Scope

- Public global layout, navigation and footer.
- Public homepage layout.
- Product listing and product cards.
- Product detail layout and media gallery presentation.
- News listing and news detail layout.
- About, contact and dynamic form pages.
- Shared spacing, typography, section and card rules.
- Mobile and tablet layout polish.
- Production visual QA across core routes.

### Out Of Scope

- Backend API changes.
- Route changes, unless separately approved.
- Admin feature redesign.
- New image transformation pipeline.
- Full brand identity redesign.

## Phase 1: Layout Foundation

Primary files:

- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`
- `src/components/ProductCard.astro`
- `src/components/NewsCard.astro`
- `src/components/Pagination.astro`

Tasks:

- Consolidate design tokens for public pages:
  - background colors
  - text colors
  - accent color
  - spacing scale
  - section widths
  - card radius and shadows
  - focus states
- Keep Tailwind/shadcn admin variables in `src/styles/global.css` compatible
  with admin components.
- Move repeated public layout primitives into predictable global classes:
  - `.page-shell`
  - `.section`
  - `.section-band`
  - `.container`
  - `.grid`
  - `.button`
  - `.card`
- Refine header:
  - sticky translucent background
  - clearer active/hover states
  - mobile navigation spacing and touch targets
  - stable logo sizing
- Refine footer:
  - denser company/contact information
  - product/category links
  - better mobile stacking

Acceptance:

- Header, footer and global spacing look consistent across home, products, news,
  about and contact.
- No text overlaps on 375px, 768px, 1440px and wide desktop widths.
- Admin pages still load with existing shadcn/Tailwind styles.

## Phase 2: Homepage

Primary files:

- `src/pages/index.astro`
- `src/pages/[lang]/index.astro`
- `src/components/ProductCard.astro`
- `src/components/NewsCard.astro`

Tasks:

- Rework the hero as a product-led first viewport:
  - brand/product category visible immediately
  - concise headline and supporting copy
  - primary product imagery from real backend/R2 image data when available
  - clear product and contact actions
- Add a stronger product category/product highlight section.
- Improve company section so it supports trust, manufacturing capability and
  contact intent without becoming a marketing landing page.
- Improve news preview density and visual hierarchy.
- Keep localized homepage variants visually aligned.

Acceptance:

- The first viewport makes the business category obvious.
- Product imagery appears above the fold when backend data provides usable
  images.
- Homepage still builds statically from existing APIs.

## Phase 3: Product Browsing

Primary files:

- `src/pages/products/index.astro`
- `src/pages/product/[slug].astro`
- localized product routes under `src/pages/[lang]/`
- `src/components/ProductCard.astro`
- `src/components/SearchPanel.astro`
- `src/components/Pagination.astro`

Tasks:

- Redesign product cards:
  - stable image area
  - product title and short summary
  - compact spec highlights from `ext` fields when useful
  - clear hover/focus state
- Improve product list layout:
  - category/filter area
  - search panel density
  - pagination placement
  - empty/error states
- Improve product detail:
  - large product media area
  - gallery thumbnails if available
  - key specs and quote CTA near the top
  - readable rich text content area
  - related products section

Acceptance:

- Product list is scannable and stable with mixed image sizes.
- Product detail supports product evaluation without scrolling through dense
  legacy HTML first.
- Existing product URLs and SEO metadata remain unchanged.

## Phase 4: News And Content Pages

Primary files:

- `src/pages/news/index.astro`
- `src/pages/news/[slug].astro`
- `src/pages/about.astro`
- `src/pages/[lang]/about.astro`
- `src/components/NewsCard.astro`

Tasks:

- Refine news cards for readable dates, titles and excerpts.
- Improve news detail typography:
  - title block
  - date/meta line
  - rich text content width
  - image handling inside legacy HTML
- Improve about page layout using existing company/site data.
- Keep content pages visually quieter than product pages.

Acceptance:

- News and about pages are readable on mobile and desktop.
- Legacy rich text does not overflow its container.

## Phase 5: Contact And Forms

Primary files:

- `src/pages/contact.astro`
- `src/pages/[lang]/contact.astro`
- `src/pages/forms/[fcode].astro`
- `src/components/ContactForm.astro`
- `src/components/DynamicForm.astro`

Tasks:

- Rework contact page into a practical inquiry workflow:
  - contact form
  - company contact details
  - product quote context when `?product=` exists
  - clear success/error states
- Polish form controls:
  - consistent labels
  - focus states
  - validation messages
  - disabled/submitting state
- Keep honeypot and anti-double-submit behavior intact.

Acceptance:

- Contact and dynamic forms remain functional.
- Form text and buttons do not overflow on mobile.
- Backend validation errors remain visible and understandable.

## Phase 6: Responsive And Accessibility QA

Routes to verify:

- `/`
- `/products/`
- `/product/{slug-or-id}/`
- `/news/`
- `/news/{slug-or-id}/`
- `/about/`
- `/contact/`
- `/forms/{fcode}/`
- `/en/`
- `/zh-hans/`

Viewports:

- 375px mobile
- 768px tablet
- 1440px desktop
- wide desktop

Checks:

- No overlapping text or controls.
- Header and mobile navigation remain usable.
- Product images stay framed and non-distorted.
- Buttons and links have visible focus states.
- Page content remains readable with long English and Chinese strings.
- Build output remains static and SEO metadata still renders.

Acceptance:

- `npm run build` succeeds.
- Production-like preview has no obvious layout regressions on core routes.

## Phase 7: Admin UI Consistency

Primary files:

- `src/admin/views/Shell.tsx`
- `src/admin/views/Sidebar.tsx`
- `src/admin/views/Topbar.tsx`
- shared `src/components/ui/*`

Tasks:

- Keep admin as a dense operational tool, not a marketing UI.
- Align color, focus and spacing tokens enough that admin does not feel detached
  from the public site.
- Do not redesign admin workflows during the public UI pass.

Acceptance:

- Admin remains usable for repeated content operations.
- Existing admin views do not regress visually or functionally.

## Implementation Order

1. Foundation: global tokens, header, footer, shared components.
2. Homepage: first viewport and public section rhythm.
3. Product browsing: list cards, detail layout and quote CTA.
4. News/about: content readability and card polish.
5. Contact/forms: inquiry flow and form states.
6. Responsive QA and build verification.
7. Admin consistency pass.

## Notes

- Prefer existing Astro components and current API helpers.
- Keep edits scoped to public layout/UI unless a shared component requires
  careful adjustment.
- Avoid introducing heavy client-side dependencies for static pages.
- Preserve production URLs and existing localized route behavior.
