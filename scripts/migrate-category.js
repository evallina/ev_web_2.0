#!/usr/bin/env node
/**
 * migrate-category.js
 * Rename or remove a category key across all project entries in projects.json.
 *
 * Usage:
 *   node scripts/migrate-category.js rename oldKey newKey [--dry-run]
 *   node scripts/migrate-category.js remove keyName       [--dry-run]
 *
 * Options:
 *   --dry-run   Show what would change without writing the file.
 *
 * For rename: updates the key in every project's categoryScores.
 *             Also updates the project's `category` field if it matches the
 *             old display name (via CATEGORY_DISPLAY map).
 * For remove: deletes the key from every project's categoryScores.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const DATA_FILE   = path.join(ROOT, 'src', 'data', 'projects.json');
const DRY_RUN     = process.argv.includes('--dry-run');
const ARGS        = process.argv.slice(2).filter(a => a !== '--dry-run');

// Maps categoryScores key → display name (used in p.category field)
const KEY_TO_DISPLAY = {
  interactivity: 'Interactive',
  userOriented:  'User-Oriented',
  publicRealm:   'Public Realm',
  dataDriven:    'Data-Driven',
  strategy:      'Strategy',
  places:        'Places',
};

// ── CLI parsing ────────────────────────────────────────────────────────────────

const command = ARGS[0];

if (!['rename', 'remove'].includes(command)) {
  console.error('Usage:');
  console.error('  node scripts/migrate-category.js rename <oldKey> <newKey> [--dry-run]');
  console.error('  node scripts/migrate-category.js remove <keyName>         [--dry-run]');
  process.exit(1);
}

if (command === 'rename' && ARGS.length < 3) {
  console.error('rename requires two arguments: <oldKey> <newKey>');
  process.exit(1);
}

if (command === 'remove' && ARGS.length < 2) {
  console.error('remove requires one argument: <keyName>');
  process.exit(1);
}

// ── Load data ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(DATA_FILE)) {
  console.error(`File not found: ${DATA_FILE}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const projects = data.projects ?? [];

// ── Rename ─────────────────────────────────────────────────────────────────────

function runRename(oldKey, newKey) {
  if (DRY_RUN) console.log(`🔍 Dry-run: rename "${oldKey}" → "${newKey}"\n`);
  else         console.log(`Renaming key "${oldKey}" → "${newKey}"\n`);

  let scoreChanges = 0;
  let categoryChanges = 0;
  const oldDisplay = KEY_TO_DISPLAY[oldKey];
  const newDisplay = KEY_TO_DISPLAY[newKey] ?? newKey;

  for (const p of projects) {
    const scores = p.categoryScores ?? {};

    // Rename the key in categoryScores
    if (Object.prototype.hasOwnProperty.call(scores, oldKey)) {
      const val = scores[oldKey];
      delete scores[oldKey];
      scores[newKey] = val;
      scoreChanges++;
      console.log(`  ${p.id}: categoryScores.${oldKey} (${val}) → .${newKey}`);
    }

    // Update p.category if it matches the old display name
    if (oldDisplay && p.category === oldDisplay) {
      console.log(`  ${p.id}: category "${p.category}" → "${newDisplay}"`);
      p.category = newDisplay;
      categoryChanges++;
    }
  }

  console.log('');
  console.log(`Summary:`);
  console.log(`  categoryScores key renamed in ${scoreChanges} project(s)`);
  console.log(`  category field updated in ${categoryChanges} project(s)`);

  return { scoreChanges, categoryChanges };
}

// ── Remove ─────────────────────────────────────────────────────────────────────

function runRemove(keyName) {
  if (DRY_RUN) console.log(`🔍 Dry-run: remove "${keyName}"\n`);
  else         console.log(`Removing key "${keyName}"\n`);

  let changes = 0;

  for (const p of projects) {
    const scores = p.categoryScores ?? {};
    if (Object.prototype.hasOwnProperty.call(scores, keyName)) {
      console.log(`  ${p.id}: removed categoryScores.${keyName} (was ${scores[keyName]})`);
      delete scores[keyName];
      changes++;
    }
  }

  console.log('');
  console.log(`Summary: key removed from ${changes} project(s)`);
  return { changes };
}

// ── Run ────────────────────────────────────────────────────────────────────────

let result;
if (command === 'rename') {
  result = runRename(ARGS[1], ARGS[2]);
} else {
  result = runRemove(ARGS[1]);
}

const totalChanges = Object.values(result).reduce((s, v) => s + v, 0);

if (totalChanges === 0) {
  console.log('\nNo changes needed.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n🔍 Dry-run complete — no files written.');
  process.exit(0);
}

// ── Write ──────────────────────────────────────────────────────────────────────

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`\n✓ Updated → ${DATA_FILE}`);
