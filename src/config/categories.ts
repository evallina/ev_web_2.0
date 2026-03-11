// ── Single source of truth for all category definitions ────────────────────────
//
// Order = clockwise from top-left, matching the RadarChart spoke layout.
// Pentagon pointing down: two spokes at top, one at bottom.
// 5 categories spaced at 72° intervals (360° / 5) starting from -126° (top-left).
// All other category arrays/maps in the codebase are derived from this.

export const CATEGORIES = [
  { key: 'futures',             label: 'Futures',                abbr: 'F',  angle: -126, jsonCategory: 'Futures'                },
  { key: 'artifactsInterfaces', label: 'Artifacts & Interfaces', abbr: 'AI', angle:  -54, jsonCategory: 'Artifacts & Interfaces' },
  { key: 'architecture',        label: 'Architecture',           abbr: 'A',  angle:   18, jsonCategory: 'Architecture'           },
  { key: 'publicRealm',         label: 'Public Realm',           abbr: 'PR', angle:   90, jsonCategory: 'Public Realm'           },
  { key: 'computationalDesign', label: 'Computational Design',   abbr: 'CD', angle:  162, jsonCategory: 'Computational Design'   },
] as const;

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

// Breakdown strip — same order as CATEGORIES (can be reordered if needed)
export const BREAKDOWN_CATS: { key: string; abbr: string }[] = CATEGORIES.map(c => ({
  key:  c.key,
  abbr: c.abbr,
}));
