#!/usr/bin/env node
/**
 * generate-philosophy.js
 * Scans /public/images/philosophy/ and writes /src/data/philosophyImages.json.
 * Re-run whenever images are added or removed:
 *   npm run generate-philosophy
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const IMG_DIR     = path.join(ROOT, 'public', 'images', 'philosophy');
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'philosophyImages.json');
const IMG_EXTS    = /\.(jpg|jpeg|png|gif|webp)$/i;

function main() {
  const files = fs.readdirSync(IMG_DIR)
    .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => `/images/philosophy/${f}`);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(files, null, 2) + '\n');

  console.log(`✓ Generated ${files.length} philosophy images → ${OUTPUT_FILE}`);
}

main();
