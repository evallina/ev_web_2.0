// ── Shared TypeScript types ────────────────────────────────────────────────────

export interface DebugMeta {
  dominantCategoryKeys: string[];   // radar keys ≥ DOMINANCE_THRESHOLD
  singleDominantKey:    string | null;
  presetBoostedIds:     string[];
  domBonusMap:          Record<string, number>;
  dominanceThreshold:   number;
}

export interface CategoryDef {
  key:          string;  // camelCase key used in categoryScores + radarValues
  label:        string;  // human-readable label for debug displays
  displayLabel: string;  // label shown on the radar chart spokes
  abbr:         string;  // short abbreviation for breakdown strip
  angle:        number;  // SVG angle (degrees) for radar spoke position
  jsonCategory: string;  // value of p.category in projects.json
}

export type RadarValues = Record<string, number>;
