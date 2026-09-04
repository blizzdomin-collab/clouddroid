// Clouddroid FinOps Consulting - Cache busting
//
// Reads <meta name="build-id" content="..."> and appends ?v=<build-id>
// to local asset URLs (CSS/JS) so browsers never serve stale content
// after a deploy. Loaded as the first <script> on every page.

(function () {
  var meta = document.querySelector('meta[name="build-id"]');
  if (!meta) return;
  var v = meta.getAttribute('content');
  if (!v) return;

  function withVersion(url) {
    // Skip external URLs and data URIs
    if (!url || /^([a-z]+:|\/\/|data:)/i.test(url)) return url;
    // Skip if already versioned
    if (/[?&]v=/.test(url)) return url;
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    return url + sep + 'v=' + v;
  }

  function rewriteAll() {
    // Stylesheet links
    var links = document.querySelectorAll('link[rel="stylesheet"][href]');
    for (var i = 0; i < links.length; i++) {
      links[i].href = withVersion(links[i].getAttribute('href'));
    }
    // Local script tags (skip those with src=http... or inline JSON-LD)
    var scripts = document.querySelectorAll('script[src]');
    for (var j = 0; j < scripts.length; j++) {
      var s = scripts[j].getAttribute('src');
      if (s && !/^https?:|^data:/i.test(s)) {
        scripts[j].src = withVersion(s);
      }
    }
  }

  // Run now + after DOM ready (covers anything inserted later)
  rewriteAll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewriteAll);
  }
})();
