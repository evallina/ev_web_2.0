const fs = require('fs');
const path = require('path');

const projectsDir = path.join(__dirname, '..', 'public', 'images', 'projects');
const philosophyDir = path.join(__dirname, '..', 'public', 'images', 'philosophy');
const categoriesDir = path.join(__dirname, '..', 'public', 'images', 'categories');

function getFileSizes(dir, extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']) {
  const results = [];

  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
        const stat = fs.statSync(full);
        results.push({
          file: path.relative(path.join(__dirname, '..', 'public'), full),
          sizeKB: Math.round(stat.size / 1024),
          sizeMB: (stat.size / 1024 / 1024).toFixed(2),
          ext: path.extname(entry.name).toLowerCase(),
        });
      }
    }
  }

  walk(dir);
  return results;
}

// Audit each directory
const projectCards = getFileSizes(projectsDir);
const philosophy = getFileSizes(philosophyDir);
const categories = getFileSizes(categoriesDir);

// Summary
function summarize(name, files) {
  if (files.length === 0) return;
  const totalMB = files.reduce((s, f) => s + parseFloat(f.sizeMB), 0);
  const avgKB = Math.round(files.reduce((s, f) => s + f.sizeKB, 0) / files.length);
  const maxFile = files.reduce((a, b) => a.sizeKB > b.sizeKB ? a : b);
  const minFile = files.reduce((a, b) => a.sizeKB < b.sizeKB ? a : b);

  console.log(`\n=== ${name} ===`);
  console.log(`  Files: ${files.length}`);
  console.log(`  Total: ${totalMB.toFixed(1)} MB`);
  console.log(`  Average: ${avgKB} KB`);
  console.log(`  Largest: ${maxFile.sizeKB} KB — ${maxFile.file}`);
  console.log(`  Smallest: ${minFile.sizeKB} KB — ${minFile.file}`);

  // Size distribution
  const brackets = { '<100KB': 0, '100-500KB': 0, '500KB-1MB': 0, '1-2MB': 0, '>2MB': 0 };
  files.forEach(f => {
    if (f.sizeKB < 100) brackets['<100KB']++;
    else if (f.sizeKB < 500) brackets['100-500KB']++;
    else if (f.sizeKB < 1024) brackets['500KB-1MB']++;
    else if (f.sizeKB < 2048) brackets['1-2MB']++;
    else brackets['>2MB']++;
  });
  console.log('  Distribution:', brackets);
}

summarize('Project Cards', projectCards);
summarize('Philosophy Photos', philosophy);
summarize('Category Images', categories);

// Grand total
const all = [...projectCards, ...philosophy, ...categories];
const grandTotal = all.reduce((s, f) => s + parseFloat(f.sizeMB), 0);
console.log(`\n=== GRAND TOTAL ===`);
console.log(`  ${all.length} files, ${grandTotal.toFixed(1)} MB`);

// List the 10 largest files
console.log('\n=== TOP 10 LARGEST FILES ===');
all.sort((a, b) => b.sizeKB - a.sizeKB);
all.slice(0, 10).forEach((f, i) => {
  console.log(`  ${i + 1}. ${f.sizeKB} KB — ${f.file}`);
});
