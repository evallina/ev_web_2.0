#!/usr/bin/env node
/**
 * generate-projects.js
 * Scans /public/images/projects/ and MERGES into /src/data/projects.json.
 * Re-run whenever new project folders or images are added:
 *   npm run generate-projects
 *   npm run generate-projects -- --dry-run
 *
 * Folder naming:  PROJECT_ID_UPPERCASECATEGORY_TitleInCamelCase
 *   e.g.  EV-08_ARCHITECTURE_UniversityOfNevadaRenoJohnTullochBusinessBuilding
 *
 * File naming:    Date_Category_ID_Name_Organization[_pageN].png
 *   e.g.  2026-03_Architecture_EV-08_UniversityOfNevadaRenoJohnTullochBusinessBuilding_LMNArchitects_page1.png
 *
 * CSV enrichment (optional):
 *   If public/images/projects/portfolio_database.csv exists, the script reads
 *   subtitle, role, and location from it (matched by ProjectID column).
 *   If the CSV is absent, those fields default to "".
 *
 * Merge rules:
 *   - Existing project ID  → update `cards` only; all other fields are preserved.
 *   - New project ID       → full entry created with default scores/priority/presets.
 *   - Removed folder       → WARNING printed; entry kept in JSON (user must delete manually).
 *   - "Other" folder       → only `cards` updated (same merge rules, no scoring fields).
 *
 * Skipped folders: CategoryDividers, any folder starting with "." or not a directory.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const IMG_DIR     = path.join(ROOT, 'public', 'images', 'projects');
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'projects.json');
const CSV_FILE    = path.join(IMG_DIR, 'portfolio_database.csv');
const IMG_EXTS    = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
const DRY_RUN     = process.argv.includes('--dry-run');

// ── Category definitions (must stay in sync with src/config/categories.ts) ────
// Keys are uppercase folder segment names.
const CATEGORY_KEY = {
  ARTIFACTSANDINTERFACES: 'artifactsInterfaces',
  COMPUTATIONALDESIGN:    'computationalDesign',
  PUBLICREALM:            'publicRealm',
  ARCHITECTURE:           'architecture',
  FUTURES:                'futures',
};

const CATEGORY_DISPLAY = {
  ARTIFACTSANDINTERFACES: 'Artifacts & Interfaces',
  COMPUTATIONALDESIGN:    'Computational Design',
  PUBLICREALM:            'Public Realm',
  ARCHITECTURE:           'Architecture',
  FUTURES:                'Futures',
};

// Folders to skip during project scanning (Other is handled separately in the loop)
const SKIP_FOLDERS = new Set(['CategoryDividers']);

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a CamelCase or PascalCase string to a space-separated display string.
 * 'LMNArchitects' → 'LMN Architects'
 * 'UniversityOfNevadaReno' → 'University Of Nevada Reno'
 */
function fromCamelCase(s) {
  const result = s
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')   // 'lA' → 'l A'
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'); // 'LMNAr' → 'LMN Ar'
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/** Parse a folder name: "EV-08_ARCHITECTURE_UniversityOfNevadaReno..." */
function parseFolderName(folder) {
  const underscoreIdx = folder.indexOf('_');
  const secondIdx     = folder.indexOf('_', underscoreIdx + 1);
  const id            = folder.slice(0, underscoreIdx);
  const categoryRaw   = folder.slice(underscoreIdx + 1, secondIdx);
  const titleRaw      = folder.slice(secondIdx + 1);
  return {
    id,
    categoryRaw,           // uppercase, e.g. 'ARCHITECTURE'
    category: CATEGORY_DISPLAY[categoryRaw] ?? fromCamelCase(categoryRaw),
    title:    fromCamelCase(titleRaw),
  };
}

/**
 * Parse a filename (without extension).
 * Format: Date_Category_ID_Name_Organization[_pageN]
 */
function parseFileName(filename) {
  const base  = filename.replace(/\.[^.]+$/, '');
  const parts = base.split('_');

  let pageNum = 1;
  if (/^page\d+$/i.test(parts[parts.length - 1])) {
    pageNum = parseInt(parts[parts.length - 1].replace(/\D/g, ''), 10);
    parts.pop();
  }

  const date         = parts[0];
  const organization = fromCamelCase(parts[parts.length - 1]);

  return { date, organization, pageNum };
}

/** Build a categoryScores object with the primary category set to 80, others 0. */
function buildCategoryScores(categoryRaw) {
  const scores = {
    computationalDesign:  0,
    artifactsInterfaces:  0,
    publicRealm:          0,
    architecture:         0,
    futures:              0,
  };
  const key = CATEGORY_KEY[categoryRaw];
  if (key && key in scores) scores[key] = 80;
  return scores;
}

/** Return image files in a folder sorted by (pageNum, filename). */
function getSortedCards(folderPath, publicFolder) {
  return fs.readdirSync(folderPath)
    .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
    .map(f => ({
      filename:   f,
      publicPath: `/images/projects/${publicFolder}/${f}`,
      pageNum:    parseFileName(f).pageNum,
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

// ── CSV enrichment (optional) ──────────────────────────────────────────────────

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function readCsvEnrichment() {
  if (!fs.existsSync(CSV_FILE)) {
    console.log('  ℹ  No portfolio_database.csv found — subtitle/role/location will be empty.');
    return {};
  }

  const lines = fs.readFileSync(CSV_FILE, 'utf8').split(/\r?\n/);
  if (lines.length < 2) return {};

  const headers    = parseCsvLine(lines[0]);
  const idCol       = headers.findIndex(h => /projectid/i.test(h));
  const subtitleCol = headers.findIndex(h => /subtitle/i.test(h));
  const roleCol     = headers.findIndex(h => /\brole\b/i.test(h));
  const locationCol = headers.findIndex(h => /location/i.test(h));

  if (idCol === -1) {
    console.warn('  ⚠ CSV found but no "ProjectID" column — skipping enrichment.');
    return {};
  }

  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    const id = cells[idCol]?.trim();
    if (!id) continue;
    result[id] = {
      subtitle: subtitleCol !== -1 ? (cells[subtitleCol]?.trim() ?? '') : '',
      role:     roleCol     !== -1 ? (cells[roleCol]?.trim()     ?? '') : '',
      location: locationCol !== -1 ? (cells[locationCol]?.trim() ?? '') : '',
    };
  }
  console.log(`  ✓ CSV: enriched data for ${Object.keys(result).length} project(s).`);
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) console.log('🔍 Dry-run mode — no files will be written.\n');

  // ── Load existing JSON ─────────────────────────────────────────────────────
  let existing = { projects: [], other: [] };
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  const existingById  = Object.fromEntries((existing.projects ?? []).map(p => [p.id, p]));
  const existingOther = (existing.other ?? [])[0] ?? null;

  // ── CSV enrichment ─────────────────────────────────────────────────────────
  const csvData = readCsvEnrichment();

  // ── Scan disk ──────────────────────────────────────────────────────────────
  const folders = fs.readdirSync(IMG_DIR)
    .filter(f => {
      if (f.startsWith('.'))    return false;
      if (SKIP_FOLDERS.has(f))  return false;
      return fs.statSync(path.join(IMG_DIR, f)).isDirectory();
    })
    .sort();

  const diskIds    = new Set();
  const projects   = [];
  let   otherEntry = null;

  const added     = [];
  const updated   = [];
  const unchanged = [];

  for (const folder of folders) {
    const folderPath = path.join(IMG_DIR, folder);

    // ── "Other" folder ────────────────────────────────────────────────────────
    if (folder === 'Other') {
      const newCards = getSortedCards(folderPath, 'Other');
      const oldCards = existingOther?.cards ?? [];

      if (existingOther && arraysEqual(oldCards, newCards)) {
        otherEntry = existingOther;
      } else {
        otherEntry = { id: 'Other', cards: newCards };
        console.log(existingOther
          ? `  ↻ Other: cards updated (${oldCards.length} → ${newCards.length})`
          : `  + Other: new entry (${newCards.length} cards)`);
      }
      continue;
    }

    // ── Project folders ───────────────────────────────────────────────────────
    const { id, categoryRaw, category, title } = parseFolderName(folder);
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
      // ── Existing project: only update cards ────────────────────────────────
      const prev = existingById[id];
      const merged = { ...prev, cards: newCards };
      projects.push(merged);

      if (!arraysEqual(prev.cards ?? [], newCards)) {
        updated.push(id);
        console.log(`  ↻ ${id}: cards updated (${(prev.cards ?? []).length} → ${newCards.length} images)`);
      } else {
        unchanged.push(id);
      }
    } else {
      // ── New project: full entry with defaults ─────────────────────────────
      const { date, organization } = parseFileName(imageFiles[0]);
      const csv = csvData[id] ?? { subtitle: '', role: '', location: '' };
      const entry = {
        id,
        title,
        subtitle:     csv.subtitle,
        category,
        organization,
        role:         csv.role,
        location:     csv.location,
        date,
        cards:        newCards,
        categoryScores: buildCategoryScores(categoryRaw),
        priority:     0,
        presets:      null,
      };
      projects.push(entry);
      added.push(id);
      console.log(`  + ${id}: new entry "${title}"`);
    }
  }

  // ── Warn about projects in JSON whose folder was removed ──────────────────
  const removedIds = Object.keys(existingById).filter(id => !diskIds.has(id));
  for (const id of removedIds) {
    console.warn(`  ⚠ WARNING: ${id} exists in JSON but folder not found on disk. Keeping entry.`);
    projects.push(existingById[id]);
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
  console.log(`  Added:     ${added.length}    ${added.join(', ')}`);
  console.log(`  Updated:   ${updated.length}    ${updated.join(', ')}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Removed:   ${removedIds.length}    ${removedIds.join(', ')}`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 Dry-run complete — no files written.');
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`✓ Wrote ${projects.length} projects → ${OUTPUT_FILE}`);
  if (otherEntry) console.log(`✓ "Other" → ${otherEntry.cards.length} cards`);
}

main();
