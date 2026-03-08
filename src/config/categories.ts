// ── Single source of truth for all category definitions ────────────────────────
//
// Order = clockwise from top, matching the RadarChart spoke layout.
// All other category arrays/maps in the codebase are derived from this.

import type { CategoryDef } from '@/src/types';

export const CATEGORIES: readonly CategoryDef[] = [
  { key: 'places',        label: 'Places',        displayLabel: 'Places',        abbr: 'Pl',  angle: -90,  jsonCategory: 'Places'        },
  { key: 'strategy',      label: 'Strategy',      displayLabel: 'Strategy',      abbr: 'Str', angle: -30,  jsonCategory: 'Strategy'      },
  { key: 'publicRealm',   label: 'Public Realm',  displayLabel: 'Public Realm',  abbr: 'PR',  angle:  30,  jsonCategory: 'Public Realm'  },
  { key: 'dataDriven',    label: 'Data-Driven',   displayLabel: 'Data-Driven',   abbr: 'DD',  angle:  90,  jsonCategory: 'Data-Driven'   },
  { key: 'interactivity', label: 'Interactivity', displayLabel: 'Interactivity', abbr: 'Int', angle: 150,  jsonCategory: 'Interactive'   },
  { key: 'userOriented',  label: 'User-Oriented', displayLabel: 'User Oriented', abbr: 'UO',  angle: 210,  jsonCategory: 'User-Oriented' },
];

// Ordered list of keys (same order as CATEGORIES) — used by RadarChart to build radarValues
export const CAT_KEYS: string[] = CATEGORIES.map(c => c.key);

// p.category (projects.json) → categoryScores key — used in selectProjects
export const CAT_LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.jsonCategory, c.key])
);

// key → { label, abbr } — used by ProjectCards debug display
export const CAT_META: Record<string, { label: string; abbr: string }> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, { label: c.label, abbr: c.abbr }])
);

// Breakdown strip order (different from radar spoke order)
const BREAKDOWN_KEY_ORDER = ['places', 'userOriented', 'publicRealm', 'dataDriven', 'strategy', 'interactivity'];
export const BREAKDOWN_CATS: { key: string; abbr: string }[] = BREAKDOWN_KEY_ORDER.map(k => ({
  key:  k,
  abbr: CAT_META[k].abbr,
}));
