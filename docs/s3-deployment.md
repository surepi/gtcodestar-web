# S3 Frontend Deployment

The frontend is an Astro static site. GitHub Actions can build `frontend/dist`
and upload it to an S3-compatible bucket.

## Workflow

`.github/workflows/frontend-s3-deploy.yml` runs on:

- pushes to `main` that change `frontend/**`
- changes to the workflow file itself
- manual `workflow_dispatch`

It does not run for backend-only changes.

## Required Secrets

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
FRONTEND_S3_BUCKET=your-bucket-name
PUBLIC_API_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FALLBACK_BASE_URL=https://api.gtcodestar.com
PUBLIC_BROWSER_API_BASE_URL=https://api.gtcodestar.com
PUBLIC_API_FETCH_TIMEOUT_MS=30000
PUBLIC_DEFAULT_LANG=en
PUBLIC_FORM_CODES=1
PUBLIC_SITE_URL=https://www.gtcodestar.com
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADMH1a4-bpkND9Do
```

If using Cloudflare R2 through its S3-compatible API, also set:

```env
AWS_ENDPOINT_URL_S3=https://<account-id>.r2.cloudflarestorage.com
```

If using AWS S3 plus CloudFront, optionally set:

```env
CLOUDFRONT_DISTRIBUTION_ID=...
```

## Browser API Base

S3 does not provide the Cloudflare Pages `/backend` proxy. Set
`PUBLIC_BROWSER_API_BASE_URL` to the real API origin, otherwise the admin app and
browser-side forms will request `/backend/...` from the static bucket and fail.

Current production value:

```env
PUBLIC_BROWSER_API_BASE_URL=https://api.gtcodestar.com
```

## Cache Rules

The workflow uploads:

- `dist/_astro/*` with `Cache-Control: public,max-age=31536000,immutable`
- all other files with `Cache-Control: no-cache`

Astro asset filenames are hashed, so `_astro` can be cached for a year. HTML and
route files stay revalidatable so new deploys become visible quickly.

## Content Updates

Public product/news/page routes are statically generated at build time. Updating
content in admin still requires a frontend rebuild before static pages change.

The backend deploy hook can trigger this workflow by GitHub `workflow_dispatch`
after content/category saves.

## Admin Publish Button

The admin content screen can trigger a frontend rebuild through:

```http
POST /admin/deploy/frontend
```

Configure the backend deploy hook to call the GitHub Actions workflow dispatch
API:

```env
DEPLOY_HOOK_ENABLED=true
DEPLOY_HOOK_MODE=github_workflow_dispatch
DEPLOY_HOOK_URL=https://api.github.com/repos/surepi/gtcodestar-go/actions/workflows/frontend-s3-deploy.yml/dispatches
DEPLOY_HOOK_TOKEN=<github fine-grained token with Actions:write>
DEPLOY_HOOK_REF=main
```

The same hook is also triggered after content/category mutations, so frequent
article updates can publish automatically once these backend environment
variables are set.
