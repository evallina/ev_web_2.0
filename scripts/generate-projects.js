#!/usr/bin/env node
/**
 * generate-projects.js
 * Scans /public/images/projects/ and MERGES into /src/data/projects.json.
 * Re-run whenever new project folders or images are added:
 *   npm run generate-projects
 *   npm run generate-projects -- --dry-run
 *
 * Merge rules:
 *   - Existing project ID  → update `cards` only; all other fields are preserved.
 *   - New project ID       → full entry created with default scores/priority/presets.
 *   - Removed folder       → WARNING printed; entry kept in JSON (user must delete manually).
 *   - "Other" folder       → only `cards` updated (same merge rules, no scoring fields).
 *
 * Folder naming:  PROJECT_ID_DesignCategory_ProjectName
 * File naming:    Date_DesignCategory_ProjectID_ProjectName_Organization[_PageN].jpg
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const IMG_DIR     = path.join(ROOT, 'public', 'images', 'projects');
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'projects.json');
const IMG_EXTS    = /\.(jpg|jpeg|png|gif|webp)$/i;
const DRY_RUN     = process.argv.includes('--dry-run');

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
  const title    = parts.slice(2).join('_');
  return { id, category, title };
}

/**
 * Parse a filename (without extension).
 * Format: Date_Category_ID_ProjectName_Organization[_PageN]
 */
function parseFileName(filename) {
  const base  = filename.replace(/\.[^.]+$/, '');
  const parts = base.split('_');

  let pageNum = 1;
  if (/^Page\d+$/i.test(parts[parts.length - 1])) {
    pageNum = parseInt(parts.pop().replace(/\D/g, ''), 10);
  }

  const date         = parts[0];
  const category     = parts[1];
  const id           = parts[2];
  const organization = parts[parts.length - 1];

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

/** Deep-equal check for two arrays of strings. */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) console.log('🔍 Dry-run mode — no files will be written.\n');

  // ── Load existing JSON (if any) ────────────────────────────────────────────
  let existing = { projects: [], other: [] };
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  const existingById = Object.fromEntries(
    (existing.projects ?? []).map(p => [p.id, p])
  );
  const existingOther = (existing.other ?? [])[0] ?? null;

  // ── Scan disk ─────────────────────────────────────────────────────────────
  const folders = fs.readdirSync(IMG_DIR)
    .filter(f => !f.startsWith('.') && fs.statSync(path.join(IMG_DIR, f)).isDirectory())
    .sort();

  const diskIds   = new Set();
  const projects  = [];
  let   otherEntry = null;

  const added    = [];
  const updated  = [];
  const unchanged = [];

  for (const folder of folders) {
    const folderPath = path.join(IMG_DIR, folder);

    // ── "Other" folder ──────────────────────────────────────────────────────
    if (folder === 'Other') {
      const newCards = getSortedCards(folderPath, 'Other');
      const oldCards = existingOther?.cards ?? [];

      if (existingOther && arraysEqual(oldCards, newCards)) {
        otherEntry = existingOther;  // unchanged
      } else {
        otherEntry = { id: 'Other', cards: newCards };
        if (existingOther) {
          console.log(`  ↻ Other: cards updated (${oldCards.length} → ${newCards.length})`);
        } else {
          console.log(`  + Other: new entry (${newCards.length} cards)`);
        }
      }
      continue;
    }

    const { id, category, title } = parseFolderName(folder);
    diskIds.add(id);

    const imageFiles = fs.readdirSync(folderPath)
      .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
      .sort();

    if (imageFiles.length === 0) {
      console.warn(`  ⚠ No images in ${folder} — skipping`);
      continue;
    }

    const newCards = getSortedCards(folderPath, folder);

    if (existingById[id]) {
      // ── Existing project: only update cards ──────────────────────────────
      const prev = existingById[id];
      const cardsChanged = !arraysEqual(prev.cards ?? [], newCards);

      const merged = { ...prev, cards: newCards };
      projects.push(merged);

      if (cardsChanged) {
        updated.push(id);
        console.log(`  ↻ ${id}: cards updated (${(prev.cards ?? []).length} → ${newCards.length} images)`);
      } else {
        unchanged.push(id);
      }
    } else {
      // ── New project: full entry with defaults ─────────────────────────────
      const { date, organization } = parseFileName(imageFiles[0]);
      const entry = {
        id,
        title,
        category,
        organization,
        date,
        cards: newCards,
        categoryScores: buildCategoryScores(category),
        priority: 0,
        presets: null,
      };
      projects.push(entry);
      added.push(id);
      console.log(`  + ${id}: new entry "${title}"`);
    }
  }

  // ── Warn about projects in JSON whose folder was removed ──────────────────
  const removedIds = Object.keys(existingById).filter(id => !diskIds.has(id));
  for (const id of removedIds) {
    console.warn(`  ⚠ WARNING: ${id} exists in JSON but folder not found on disk. Keeping entry — delete manually if needed.`);
    projects.push(existingById[id]);  // preserve it
  }

  // ── Sort by numeric ID ────────────────────────────────────────────────────
  projects.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10);
    const numB = parseInt(b.id.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  const output = { projects };
  if (otherEntry) output.other = [otherEntry];

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log(`  Added:     ${added.length}     ${added.join(', ')}`);
  console.log(`  Updated:   ${updated.length}     ${updated.join(', ')}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Removed:   ${removedIds.length}     ${removedIds.join(', ')}`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 Dry-run complete — no files written.');
    return;
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`✓ Wrote ${projects.length} projects → ${OUTPUT_FILE}`);
  if (otherEntry) console.log(`✓ "Other" → ${otherEntry.cards.length} cards`);
}

main();
