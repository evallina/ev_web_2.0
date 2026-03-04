#!/usr/bin/env node
/**
 * generate-projects.js
 * Scans /public/images/projects/ and writes /src/data/projects.json.
 * Re-run whenever new project folders are added:
 *   npm run generate-projects
 *
 * Folder naming:  PROJECT_ID_DesignCategory_ProjectName
 * File naming:    Date_DesignCategory_ProjectID_ProjectName_Organization[_PageN].jpg
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const IMG_DIR      = path.join(ROOT, 'public', 'images', 'projects');
const OUTPUT_FILE  = path.join(ROOT, 'src', 'data', 'projects.json');
const IMG_EXTS     = /\.(jpg|jpeg|png|gif|webp)$/i;

// Maps folder/file category strings → categoryScores keys
const CATEGORY_KEY = {
  'Interactive':   'interactivity',
  'User-Oriented': 'userOriented',
  'Public Realm':  'publicRealm',
  'Data-Driven':   'dataDriven',
  'Strategy':      'strategy',
  'Places':        'places',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a folder name: "EV-07_User-Oriented_My Project Title" */
function parseFolderName(folder) {
  const parts = folder.split('_');
  const id       = parts[0];
  const category = parts[1];
  const title    = parts.slice(2).join('_'); // safe if title contains underscores
  return { id, category, title };
}

/**
 * Parse a filename (without extension).
 * Format: Date_Category_ID_ProjectName_Organization[_PageN]
 * Returns { date, category, id, organization, pageNum }
 */
function parseFileName(filename) {
  const base  = filename.replace(/\.[^.]+$/, '');
  const parts = base.split('_');

  // Pop page number if present (e.g. "Page1", "Page2")
  let pageNum = 1;
  if (/^Page\d+$/i.test(parts[parts.length - 1])) {
    pageNum = parseInt(parts.pop().replace(/\D/g, ''), 10);
  }

  // Layout: [date, category, id, ...nameParts, organization]
  const date         = parts[0];
  const category     = parts[1];
  const id           = parts[2];
  const organization = parts[parts.length - 1];   // last remaining segment

  return { date, category, id, organization, pageNum };
}

/** Build a zeroed categoryScores object, setting primaryCategory to 80. */
function buildCategoryScores(primaryCategory) {
  const scores = {
    interactivity: 0,
    publicRealm:   0,
    userOriented:  0,
    dataDriven:    0,
    strategy:      0,
    places:        0,
  };
  const key = CATEGORY_KEY[primaryCategory];
  if (key) scores[key] = 80;
  return scores;
}

/** Return image files in a folder sorted by (pageNum, filename). */
function getSortedCards(folderPath, publicFolder) {
  return fs.readdirSync(folderPath)
    .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
    .map(f => ({
      filename: f,
      publicPath: `/images/projects/${publicFolder}/${f}`,
      pageNum: parseFileName(f).pageNum,
    }))
    .sort((a, b) =>
      a.pageNum !== b.pageNum
        ? a.pageNum - b.pageNum
        : a.filename.localeCompare(b.filename)
    )
    .map(c => c.publicPath);
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const folders = fs.readdirSync(IMG_DIR)
    .filter(f => {
      if (f.startsWith('.')) return false;
      return fs.statSync(path.join(IMG_DIR, f)).isDirectory();
    })
    .sort();

  const projects = [];
  let otherEntry = null;

  for (const folder of folders) {
    const folderPath = path.join(IMG_DIR, folder);

    // ── "Other" folder handled separately ──
    if (folder === 'Other') {
      const cards = getSortedCards(folderPath, 'Other');
      otherEntry = { id: 'Other', cards };
      continue;
    }

    const { id, category, title } = parseFolderName(folder);

    // Find image files; use alphabetically-first for metadata
    const imageFiles = fs.readdirSync(folderPath)
      .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
      .sort();

    if (imageFiles.length === 0) {
      console.warn(`  ⚠ No images found in ${folder} — skipping`);
      continue;
    }

    const { date, organization } = parseFileName(imageFiles[0]);
    const cards = getSortedCards(folderPath, folder);

    projects.push({
      id,
      title,
      category,
      organization,
      date,
      cards,
      categoryScores: buildCategoryScores(category),
      priority: 0,
    });
  }

  // Sort by numeric ID (EV-01, EV-02, …)
  projects.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10);
    const numB = parseInt(b.id.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  const output = { projects };
  if (otherEntry) output.other = [otherEntry];

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  console.log(`✓ Generated ${projects.length} projects → ${OUTPUT_FILE}`);
  if (otherEntry) {
    console.log(`✓ "Other" entry → ${otherEntry.cards.length} cards`);
  }
}

main();
