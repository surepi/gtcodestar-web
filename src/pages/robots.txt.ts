const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || "https://www.gtcodestar.com").replace(/\/$/, "");

export function GET() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
