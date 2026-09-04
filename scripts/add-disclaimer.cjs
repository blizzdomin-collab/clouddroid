const fs = require('fs');
const path = require('path');
const dir = 'consulting';
const files = ['about.html','cancel.html','contact.html','faq.html','index.html','privacy.html','refund.html','subprocessors.html','success.html','terms.html','404.html','500.html'];
for (const f of files) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('disclaimer.js')) {
    console.log('Skip (already has): ' + f);
    continue;
  }
  // Insert before </body> so the script can inject the banner on DOMContentLoaded
  c = c.replace(/(    <\/body>)/, '    <script src="js/disclaimer.js"></script>\n$1');
  fs.writeFileSync(p, c);
  console.log('Updated: ' + f);
}
console.log('Done');
