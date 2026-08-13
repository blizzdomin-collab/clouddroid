import type { APIRoute } from 'astro';

const SITE_URL = 'https://clouddroid.eu';

const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'weekly', priority: 0.8 },
  { url: '/security', changefreq: 'weekly', priority: 0.8 },
  { url: '/sla', changefreq: 'monthly', priority: 0.7 },
  { url: '/dpa', changefreq: 'monthly', priority: 0.7 },
  { url: '/pricing', changefreq: 'weekly', priority: 0.9 },
  { url: '/api-docs', changefreq: 'weekly', priority: 0.8 },
  { url: '/legal/terms', changefreq: 'monthly', priority: 0.5 },
  { url: '/legal/privacy', changefreq: 'monthly', priority: 0.5 },
  { url: '/legal/aup', changefreq: 'monthly', priority: 0.5 },
  { url: '/legal/refund', changefreq: 'monthly', priority: 0.5 },
];

export const GET: APIRoute = async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
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
