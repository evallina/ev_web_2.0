const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────
const MAX_WIDTH_CARDS = 2400;        // px — covers 2x zoom on 1200px displays
const MAX_WIDTH_PHILOSOPHY = 2400;   // px — same for philosophy photos
const MAX_WIDTH_CATEGORIES = 1600;   // px — category images are smaller on screen

const QUALITY_CARDS = 95;            // WebP quality for cards (text must stay crisp)
const QUALITY_PHILOSOPHY = 80;       // WebP quality for photos (lossy is fine)
const QUALITY_CATEGORIES = 85;       // WebP quality for category images

const DRY_RUN = false;               // set true to preview without writing files

// ── Directories ────────────────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, '..', 'public');
const PROJECTS_DIR = path.join(PUBLIC, 'images', 'projects');
const PHILOSOPHY_DIR = path.join(PUBLIC, 'images', 'philosophy');
const CATEGORIES_DIR = path.join(PUBLIC, 'images', 'categories');

// ── Helpers ────────────────────────────────────────────────────────────────
async function optimizeImage(inputPath, maxWidth, quality) {
  const ext = path.extname(inputPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null;

  // Output path: same name but .webp extension, same directory
  const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  if (fs.existsSync(outputPath)) {
    // Skip if WebP already exists (idempotent)
    return { skipped: true, outputPath };
  }

  const inputSize = fs.statSync(inputPath).size;
  const metadata = await sharp(inputPath).metadata();

  // Only resize if wider than maxWidth
  const needsResize = metadata.width > maxWidth;

  let pipeline = sharp(inputPath);

  if (needsResize) {
    pipeline = pipeline.resize(maxWidth, null, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  pipeline = pipeline.webp({ quality, effort: 6 });  // effort 6 = good compression, reasonable speed

  if (DRY_RUN) {
    const info = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      input: inputPath,
      inputSizeKB: Math.round(inputSize / 1024),
      outputSizeKB: Math.round(info.info.size / 1024),
      reduction: Math.round((1 - info.info.size / inputSize) * 100),
      resized: needsResize,
      originalWidth: metadata.width,
      newWidth: needsResize ? maxWidth : metadata.width,
      dryRun: true,
    };
  }

  await pipeline.toFile(outputPath);
  const outputSize = fs.statSync(outputPath).size;

  return {
    input: path.relative(PUBLIC, inputPath),
    output: path.relative(PUBLIC, outputPath),
    inputSizeKB: Math.round(inputSize / 1024),
    outputSizeKB: Math.round(outputSize / 1024),
    reduction: Math.round((1 - outputSize / inputSize) * 100),
    resized: needsResize,
    originalWidth: metadata.width,
    newWidth: needsResize ? maxWidth : metadata.width,
  };
}

function collectImages(dir, extensions = ['.png', '.jpg', '.jpeg']) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN (no files written) ===' : '\n=== OPTIMIZING IMAGES ===');

  const tasks = [
    { name: 'Project Cards', dir: PROJECTS_DIR, maxWidth: MAX_WIDTH_CARDS, quality: QUALITY_CARDS },
    { name: 'Philosophy Photos', dir: PHILOSOPHY_DIR, maxWidth: MAX_WIDTH_PHILOSOPHY, quality: QUALITY_PHILOSOPHY },
    { name: 'Category Images', dir: CATEGORIES_DIR, maxWidth: MAX_WIDTH_CATEGORIES, quality: QUALITY_CATEGORIES },
  ];

  let grandInputMB = 0;
  let grandOutputMB = 0;
  let totalFiles = 0;
  let skippedFiles = 0;

  for (const task of tasks) {
    const files = collectImages(task.dir);
    console.log(`\n--- ${task.name} (${files.length} files, quality: ${task.quality}, max width: ${task.maxWidth}px) ---`);

    let taskInputKB = 0;
    let taskOutputKB = 0;

    for (const file of files) {
      const result = await optimizeImage(file, task.maxWidth, task.quality);
      if (!result) continue;

      if (result.skipped) {
        skippedFiles++;
        continue;
      }

      totalFiles++;
      taskInputKB += result.inputSizeKB;
      taskOutputKB += result.outputSizeKB;

      const resizeNote = result.resized ? ` (${result.originalWidth}→${result.newWidth}px)` : '';
      console.log(`  ${result.inputSizeKB}KB → ${result.outputSizeKB}KB (-${result.reduction}%)${resizeNote} — ${result.input || path.basename(file)}`);
    }

    grandInputMB += taskInputKB / 1024;
    grandOutputMB += taskOutputKB / 1024;

    if (taskInputKB > 0) {
      console.log(`  Subtotal: ${(taskInputKB / 1024).toFixed(1)}MB → ${(taskOutputKB / 1024).toFixed(1)}MB (-${Math.round((1 - taskOutputKB / taskInputKB) * 100)}%)`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Processed: ${totalFiles} files`);
  console.log(`  Skipped (already optimized): ${skippedFiles} files`);
  if (grandInputMB > 0) {
    console.log(`  Total: ${grandInputMB.toFixed(1)}MB → ${grandOutputMB.toFixed(1)}MB (-${Math.round((1 - grandOutputMB / grandInputMB) * 100)}%)`);
    console.log(`  Saved: ${(grandInputMB - grandOutputMB).toFixed(1)}MB`);
  }

  if (!DRY_RUN && totalFiles > 0) {
    console.log('\n  Original files are PRESERVED — WebP copies created alongside them.');
    console.log('  Next step: run the JSON update script to point references to .webp files.');
  }
}

main().catch(console.error);
