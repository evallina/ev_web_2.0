#!/usr/bin/env node
/**
 * optimize-images.js
 * Reports image file sizes so you can identify candidates for external optimization.
 *
 * Usage:
 *   node scripts/optimize-images.js
 *   npm run optimize-images
 *
 * This script is READ-ONLY — it never modifies files.
 * Use ImageOptim, Squoosh, or `sharp` to do the actual compression after reviewing
 * the report.
 *
 * ── Deferred tasks (planned, not yet implemented) ────────────────────────────
 * 1D-1  Convert JPGs to WebP/AVIF for smaller transfers.
 *        Blocked on: testing WebGL morph textures, detail zoom popout, and
 *        img-protected CSS with the new format.
 * 1D-2  Migrate to Next.js <Image> component for automatic format negotiation,
 *        lazy loading, and blur placeholders.
 *        Blocked on: testing the carousel detail modal, WebGL texture loader,
 *        and pointer-events/user-select protection with next/image wrappers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const EXTS    = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
const TOP_N   = 20;

// ── Recursive file scanner ──────────────────────────────────────────────────────
function scanDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, results);
    } else if (EXTS.test(entry.name)) {
      const stat = fs.statSync(full);
      results.push({ path: full, size: stat.size });
    }
  }
  return results;
}

// ── Formatting helpers ──────────────────────────────────────────────────────────
function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024)        return (bytes / 1024).toFixed(1)          + ' KB';
  return bytes + ' B';
}

function fmtRow(rank, filePath, size) {
  const rel  = path.relative(ROOT, filePath);
  const sizeStr = fmtBytes(size).padStart(9);
  return `  ${String(rank).padStart(2)}.  ${sizeStr}   ${rel}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error(`Image directory not found: ${IMG_DIR}`);
    process.exit(1);
  }

  const files = scanDir(IMG_DIR);

  if (files.length === 0) {
    console.log('No image files found.');
    return;
  }

  // Sort largest → smallest
  files.sort((a, b) => b.size - a.size);

  const totalSize  = files.reduce((s, f) => s + f.size, 0);
  const top        = files.slice(0, TOP_N);
  const topSize    = top.reduce((s, f) => s + f.size, 0);
  const topPercent = ((topSize / totalSize) * 100).toFixed(1);

  // Extension breakdown
  const byExt = {};
  for (const f of files) {
    const ext = path.extname(f.path).toLowerCase();
    byExt[ext] = (byExt[ext] ?? 0) + f.size;
  }

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Image Weight Report');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`  Directory : ${IMG_DIR}`);
  console.log(`  Files     : ${files.length}`);
  console.log(`  Total     : ${fmtBytes(totalSize)}`);
  console.log('');
  console.log('  By extension:');
  for (const [ext, size] of Object.entries(byExt).sort((a, b) => b[1] - a[1])) {
    const count = files.filter(f => path.extname(f.path).toLowerCase() === ext).length;
    console.log(`    ${ext.padEnd(7)} ${String(count).padStart(3)} files   ${fmtBytes(size)}`);
  }
  console.log('');
  console.log(`  Top ${TOP_N} largest files (${topPercent}% of total size):`);
  console.log('');
  top.forEach((f, i) => console.log(fmtRow(i + 1, f.path, f.size)));
  console.log('');
  console.log('  Tip: run files through ImageOptim or Squoosh before');
  console.log('  moving to WebP/AVIF conversion (1D-1) or next/image (1D-2).');
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
}

main();
