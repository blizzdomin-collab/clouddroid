const fs = require('fs');
const path = require('path');
const dir = 'consulting';
const files = ['index.html','contact.html','terms.html','privacy.html','refund.html','subprocessors.html','success.html','cancel.html'];
for (const f of files) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('rel="manifest"')) {
    console.log('Skip (already has): ' + f);
    continue;
  }
  const manifestLink = '    <link rel="manifest" href="manifest.json">\n';
  if (c.includes('rel="stylesheet" href="css/styles.css"')) {
    c = c.replace(/(    <link rel="stylesheet" href="css\/styles\.css">)/, '$1\n' + manifestLink);
  } else {
    c = c.replace(/(    <\/head>)/, manifestLink + '$1');
  }
  fs.writeFileSync(p, c);
  console.log('Updated: ' + f);
}
console.log('Done');
