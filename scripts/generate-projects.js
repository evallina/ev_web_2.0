#!/usr/bin/env node
/**
 * generate-projects.js
 * Reads portfolio_database2.csv for project metadata, scans
 * /public/images/projects/ folders, and REGENERATES /src/data/projects.json.
 *
 * Re-run whenever new project folders or images are added:
 *   npm run generate-projects
 *   npm run generate-projects -- --dry-run
 *
 * Folder naming:  PROJECT_ID_UPPERCASECATEGORY_TitleInCamelCase
 *   e.g.  EV-09_ARCHITECTURE_UniversityOfNevadaRenoJohnTullochBusinessBuilding
 *
 * File naming:    Date_Category_ID_Name_Organization[_pageN].png
 *   e.g.  2026-03_Architecture_EV-09_UniversityOfNevadaRenoJohnTullochBusinessBuilding_LMNArchitects_page1.png
 *
 * CSV source: public/images/projects/portfolio_database2.csv
 *   Columns: ProjectID, Category, Name, Subtitle, Organization, Role, Location
 *
 * Rules:
 *   - Each project entry is built fresh from the CSV + folder images.
 *   - If a folder has no CSV entry: WARNING printed, entry included with data from folder name.
 *   - If a CSV entry has no folder: WARNING printed, entry skipped.
 *   - "Others" folder → scanned and put in top-level "other" array.
 *   - Skipped folders: CategoryDividers, any file (non-directory), any name starting with ".".
 *
 * Output field: fileDate (extracted from first image filename prefix YYYY-MM).
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const IMG_DIR     = path.join(ROOT, 'public', 'images', 'projects');
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'projects.json');
const CSV_FILE    = path.join(IMG_DIR, 'portfolio_database2.csv');
const IMG_EXTS    = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
const DRY_RUN     = process.argv.includes('--dry-run');

// ── Category definitions ───────────────────────────────────────────────────────
// Keys: uppercase CSV category code OR uppercase folder segment → JSON camelCase key
const CATEGORY_KEY = {
  // CSV category codes
  'Architecture':            'architecture',
  'ComputationalDesign':     'computationalDesign',
  'PublicRealm':             'publicRealm',
  'Artifacts&Interfaces':    'artifactsInterfaces',
  'ArtifactsAndInterfaces':  'artifactsInterfaces',
  'ArtifactsInterfaces':     'artifactsInterfaces',
  'Futures':                 'futures',
  // Folder segment variants (uppercase)
  'ARCHITECTURE':            'architecture',
  'COMPUTATIONALDESIGN':     'computationalDesign',
  'PUBLICREALM':             'publicRealm',
  'ARTIFACTS&INTERFACES':    'artifactsInterfaces',
  'ARTIFACTSANDINTERFACES':  'artifactsInterfaces',
  'ARTIFACTSINTERFACES':     'artifactsInterfaces',
  'FUTURES':                 'futures',
};

const CATEGORY_DISPLAY = {
  'architecture':         'Architecture',
  'computationalDesign':  'Computational Design',
  'publicRealm':          'Public Realm',
  'artifactsInterfaces':  'Artifacts & Interfaces',
  'futures':              'Futures',
};

// Folders to skip entirely during project scanning
const SKIP_FOLDERS = new Set(['CategoryDividers']);
// The "other" folder name on disk
const OTHERS_FOLDER = 'Others';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a CamelCase or PascalCase string to a space-separated display string.
 * 'LMNArchitects' → 'LMN Architects'
 */
function fromCamelCase(s) {
  const result = s
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Parse a folder name: "EV-09_ARCHITECTURE_UniversityOfNevadaReno..."
 * Returns { id, categoryRaw, categoryKey, categoryDisplay, title }
 */
function parseFolderName(folder) {
  const firstUnderscore  = folder.indexOf('_');
  const secondUnderscore = folder.indexOf('_', firstUnderscore + 1);
  const id               = folder.slice(0, firstUnderscore);
  const categoryRaw      = folder.slice(firstUnderscore + 1, secondUnderscore);
  const titleRaw         = folder.slice(secondUnderscore + 1);
  const categoryKey      = CATEGORY_KEY[categoryRaw] ?? null;
  const categoryDisplay  = categoryKey ? (CATEGORY_DISPLAY[categoryKey] ?? fromCamelCase(categoryRaw)) : fromCamelCase(categoryRaw);
  return {
    id,
    categoryRaw,
    categoryKey,
    categoryDisplay,
    title: fromCamelCase(titleRaw),
  };
}

/**
 * Extract fileDate from a filename.
 * Filenames start with YYYY-MM_... — extract the YYYY-MM prefix.
 */
function extractFileDate(filename) {
  const match = filename.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : '0000-00';
}

/** Build a categoryScores object with the primary category key set to 80, all others 0. */
function buildCategoryScores(categoryKey) {
  const scores = {
    computationalDesign:  0,
    artifactsInterfaces:  0,
    publicRealm:          0,
    architecture:         0,
    futures:              0,
  };
  if (categoryKey && categoryKey in scores) scores[categoryKey] = 80;
  return scores;
}

/** Return image file public paths in a folder sorted alphabetically. */
function getSortedCards(folderPath, publicFolder) {
  return fs.readdirSync(folderPath)
    .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => `/images/projects/${publicFolder}/${f}`);
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

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

/**
 * Read portfolio_database2.csv.
 * Returns a Map: ProjectID → { title, subtitle, category, categoryKey, categoryDisplay, organization, role, location }
 */
function readCsv() {
  if (!fs.existsSync(CSV_FILE)) {
    console.warn(`  WARNING: CSV file not found at ${CSV_FILE}`);
    return new Map();
  }

  const lines   = fs.readFileSync(CSV_FILE, 'utf8').split(/\r?\n/);
  if (lines.length < 2) return new Map();

  const headers     = parseCsvLine(lines[0]);
  const col = name  => headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());

  const idCol       = col('ProjectID');
  const catCol      = col('Category');
  const nameCol     = col('Name');
  const subtitleCol = col('Subtitle');
  const orgCol      = col('Organization');
  const roleCol     = col('Role');
  const locationCol = col('Location');

  if (idCol === -1) {
    console.warn('  WARNING: CSV has no "ProjectID" column — aborting CSV read.');
    return new Map();
  }

  const result = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells     = parseCsvLine(line);
    const id        = cells[idCol]?.trim();
    if (!id) continue;

    const categoryRaw     = catCol      !== -1 ? (cells[catCol]?.trim()      ?? '') : '';
    const categoryKey     = CATEGORY_KEY[categoryRaw] ?? null;
    const categoryDisplay = categoryKey ? (CATEGORY_DISPLAY[categoryKey] ?? categoryRaw) : categoryRaw;

    result.set(id, {
      title:        nameCol     !== -1 ? (cells[nameCol]?.trim()     ?? '') : '',
      subtitle:     subtitleCol !== -1 ? (cells[subtitleCol]?.trim() ?? '') : '',
      category:     categoryDisplay,
      categoryKey,
      organization: orgCol      !== -1 ? (cells[orgCol]?.trim()      ?? '') : '',
      role:         roleCol     !== -1 ? (cells[roleCol]?.trim()     ?? '') : '',
      location:     locationCol !== -1 ? (cells[locationCol]?.trim() ?? '') : '',
    });
  }

  console.log(`  CSV: loaded metadata for ${result.size} project(s).`);
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) console.log('Dry-run mode — no files will be written.\n');

  // ── Read CSV ───────────────────────────────────────────────────────────────
  const csvData = readCsv();

  // ── Scan disk ──────────────────────────────────────────────────────────────
  const allEntries = fs.readdirSync(IMG_DIR).filter(f => !f.startsWith('.'));

  // Separate regular project folders from Others and files
  const projectFolders = [];
  let   othersEntry    = null;

  for (const entry of allEntries) {
    const fullPath = path.join(IMG_DIR, entry);
    if (!fs.statSync(fullPath).isDirectory()) continue;  // skip files (e.g. .csv)
    if (SKIP_FOLDERS.has(entry))              continue;
    if (entry === OTHERS_FOLDER) {
      othersEntry = entry;
      continue;
    }
    projectFolders.push(entry);
  }

  // ── Build set of folder IDs ────────────────────────────────────────────────
  const folderIdMap = new Map();   // ProjectID → folder name
  for (const folder of projectFolders) {
    const underscoreIdx = folder.indexOf('_');
    if (underscoreIdx === -1) {
      console.warn(`  WARNING: Cannot parse folder name (no underscore): ${folder}`);
      continue;
    }
    const id = folder.slice(0, underscoreIdx);
    folderIdMap.set(id, folder);
  }

  // Warn: CSV entries with no folder
  const warnings = [];
  for (const [id] of csvData) {
    if (!folderIdMap.has(id)) {
      warnings.push(`WARNING: CSV entry ${id} has no matching folder on disk — skipping.`);
      console.warn(`  WARNING: CSV entry ${id} has no matching folder on disk — skipping.`);
    }
  }

  // Warn: folders with no CSV entry
  for (const [id] of folderIdMap) {
    if (!csvData.has(id)) {
      warnings.push(`WARNING: Folder for ${id} has no matching CSV entry — including with data from folder name.`);
      console.warn(`  WARNING: Folder for ${id} has no matching CSV entry — including with data from folder name.`);
    }
  }

  // ── Build projects array ───────────────────────────────────────────────────
  const projects   = [];
  let   totalCards = 0;
  let   matched    = 0;

  for (const [id, folder] of folderIdMap) {
    const folderPath  = path.join(IMG_DIR, folder);
    const imageFiles  = fs.readdirSync(folderPath)
      .filter(f => IMG_EXTS.test(f) && !f.startsWith('.'))
      .sort();

    if (imageFiles.length === 0) {
      console.warn(`  WARNING: No images in ${folder} — skipping.`);
      warnings.push(`WARNING: No images in ${folder} — skipping.`);
      continue;
    }

    const cards    = getSortedCards(folderPath, folder);
    const fileDate = extractFileDate(imageFiles[0]);

    let title, subtitle, category, organization, role, location, categoryKey;

    if (csvData.has(id)) {
      // Use CSV metadata
      const csv  = csvData.get(id);
      title        = csv.title;
      subtitle     = csv.subtitle;
      category     = csv.category;
      categoryKey  = csv.categoryKey;
      organization = csv.organization;
      role         = csv.role;
      location     = csv.location;
      matched++;
    } else {
      // Fall back to folder name parsing
      const parsed = parseFolderName(folder);
      title        = parsed.title;
      subtitle     = '';
      category     = parsed.categoryDisplay;
      categoryKey  = parsed.categoryKey;
      organization = '';
      role         = '';
      location     = '';
    }

    projects.push({
      id,
      title,
      subtitle,
      category,
      organization,
      role,
      location,
      fileDate,
      cards,
      categoryScores: buildCategoryScores(categoryKey),
      priority:       0,
      presets:        null,
    });

    totalCards += cards.length;
  }

  // ── Sort by numeric ID (EV-03, EV-06, EV-09 ...) ──────────────────────────
  projects.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10);
    const numB = parseInt(b.id.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  // ── Others folder ──────────────────────────────────────────────────────────
  let otherSection = null;
  if (othersEntry) {
    const othersPath = path.join(IMG_DIR, OTHERS_FOLDER);
    const otherCards = getSortedCards(othersPath, OTHERS_FOLDER);
    otherSection     = [{ id: OTHERS_FOLDER, cards: otherCards }];
    totalCards      += otherCards.length;
    console.log(`  Others: ${otherCards.length} card(s).`);
  }

  // ── Build output ───────────────────────────────────────────────────────────
  const output = { projects };
  if (otherSection) output.other = otherSection;

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  console.log(`  Total projects written : ${projects.length}`);
  console.log(`  CSV-matched projects   : ${matched}`);
  console.log(`  Folder-only projects   : ${projects.length - matched}`);
  console.log(`  Total card images      : ${totalCards}`);
  if (warnings.length > 0) {
    console.log('');
    console.log(`  Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`    - ${w}`));
  }
  console.log('');

  if (DRY_RUN) {
    console.log('Dry-run complete — no files written.');
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${projects.length} projects → ${OUTPUT_FILE}`);
  if (otherSection) console.log(`"Others" → ${otherSection[0].cards.length} card(s)`);
}

main();
