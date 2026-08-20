import type { APIRoute } from 'astro';

const SITE_URL = 'https://clouddroid.eu';

const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0, lastmod: '2026-08-21' },
  { url: '/about', changefreq: 'weekly', priority: 0.8, lastmod: '2026-08-21' },
  { url: '/security', changefreq: 'weekly', priority: 0.8, lastmod: '2026-08-21' },
  { url: '/security-disclosure', changefreq: 'monthly', priority: 0.6, lastmod: '2026-08-21' },
  { url: '/sla', changefreq: 'monthly', priority: 0.7, lastmod: '2026-08-21' },
  { url: '/dpa', changefreq: 'monthly', priority: 0.7, lastmod: '2026-08-21' },
  { url: '/status', changefreq: 'weekly', priority: 0.7, lastmod: '2026-08-21' },
  { url: '/business', changefreq: 'monthly', priority: 0.7, lastmod: '2026-08-21' },
  { url: '/pricing', changefreq: 'weekly', priority: 0.9, lastmod: '2026-08-21' },
  { url: '/faq', changefreq: 'weekly', priority: 0.7, lastmod: '2026-08-21' },
  { url: '/api-docs', changefreq: 'weekly', priority: 0.8, lastmod: '2026-08-21' },
  { url: '/legal/terms', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
  { url: '/legal/privacy', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
  { url: '/legal/aup', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
  { url: '/legal/refund', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
  { url: '/legal/subprocessors', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
  { url: '/legal/aml', changefreq: 'monthly', priority: 0.5, lastmod: '2026-08-21' },
];

export const GET: APIRoute = async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
