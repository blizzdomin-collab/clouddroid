// FCA / regulatory disclosure banner — appears on every consulting page.
// Single source of truth: edit this file to change the disclaimer copy site-wide.

(function () {
  if (document.getElementById('cd-fca-banner')) return;
  if (localStorage.getItem('cdFcaDismissed') === '1') return;

  var css = 'background:#fff7ed;border-bottom:1px solid #fed7aa;color:#7c2d12;font-size:13px;line-height:1.5;';
  var html =
    '<div id="cd-fca-banner" role="region" aria-label="Regulatory disclosure" style="' + css + '">' +
      '<div style="max-width:1280px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;">' +
        '<strong style="font-weight:600;flex-shrink:0;">Regulatory disclosure:</strong>' +
        '<span style="flex:1;min-width:0;">PRIME CONSULTING GROUP LTD is a UK private limited company providing <strong>FinOps and IT cost optimisation consulting</strong>. We are <strong>not authorised or regulated by the Financial Conduct Authority (FCA)</strong>, the Prudential Regulation Authority (PRA), or any other UK or EU financial regulator. We do <strong>not</strong> provide investment advice, portfolio management, capital allocation, insurance, mortgage, credit, or any other regulated financial service. The content of this website and any deliverables provided under our consulting packages are <strong>for informational and advisory purposes only</strong> and do <strong>not constitute financial advice</strong>. Clients should seek independent regulated advice before making any financial decision based on our work.</span>' +
        '<button id="cd-fca-dismiss" type="button" aria-label="Dismiss regulatory disclosure" style="flex-shrink:0;background:transparent;border:1px solid #7c2d12;color:#7c2d12;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Dismiss</button>' +
      '</div>' +
    '</div>';

  // Insert at top of body
  var wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.insertBefore(wrapper.firstChild, document.body.firstChild);

  document.getElementById('cd-fca-dismiss').addEventListener('click', function () {
    localStorage.setItem('cdFcaDismissed', '1');
    var el = document.getElementById('cd-fca-banner');
    if (el) el.remove();
  });
})();
