// ── Project selection algorithm ────────────────────────────────────────────────
//
// Pure function — no React state, no side effects.
// Called by page.tsx handleRadarPlay; state updates and navigation happen there.

import { CAT_LABEL_TO_KEY } from '@/src/config/categories';
import type { DebugMeta } from '@/src/types';

type AnyProject = {
  id:             string;
  category:       string;
  priority?:      number;
  presets?:       (string | string[])[] | null;
  categoryScores: Record<string, number>;
};

interface SelectConfig {
  matchThreshold?:      number;
  maxProjects?:         number;
  dominanceThreshold?:  number;
  dominanceMultiplier?: number;
}

export interface SelectResult {
  ids:      string[];
  scores:   Record<string, number>;
  debugMeta: DebugMeta;
  /** Internal scored rows — exposed so callers can console.table them. */
  _scoredRows: { id: string; rawScore: number; priorityBonus: number; domBonus: number; finalScore: number; primaryKey: string }[];
}

export function selectProjects(
  radarValues: Record<string, number>,
  projects:    AnyProject[],
  presetName:  string | null = null,
  config:      SelectConfig  = {},
): SelectResult {
  const MATCH_THRESHOLD      = config.matchThreshold      ?? 20;
  const DOMINANCE_THRESHOLD  = config.dominanceThreshold  ?? 80;
  const DOMINANCE_MULTIPLIER = config.dominanceMultiplier ?? 2;
  const MAX_PROJECTS         = config.maxProjects         ?? 15;

  // 1. Detect dominant categories
  const dominantKeys = Object.entries(radarValues)
    .filter(([, v]) => v >= DOMINANCE_THRESHOLD)
    .map(([k]) => k);

  const maxedKeys    = Object.entries(radarValues).filter(([, v]) => v >= 100).map(([k]) => k);
  const allOthersLow = Object.entries(radarValues)
    .filter(([k]) => !maxedKeys.includes(k))
    .every(([, v]) => v < 30);
  const singleDominantKey = (maxedKeys.length === 1 && allOthersLow) ? maxedKeys[0] : null;

  // 2. Detect preset-boosted projects
  const presetBoostedIds: string[] = presetName
    ? projects
        .filter(p => {
          const presets = p.presets ?? [];
          return presets.some(item =>
            typeof item === 'string'
              ? item.toUpperCase() === presetName.toUpperCase()
              : Array.isArray(item) && item.some(s => s.toUpperCase() === presetName.toUpperCase())
          );
        })
        .map(p => p.id)
    : [];

  // 3. Compute scores
  const domBonusMap: Record<string, number> = {};
  const scoredRows = projects.map(p => {
    const raw = Object.entries(p.categoryScores)
      .reduce((sum, [key, val]) => sum + (radarValues[key] ?? 0) * val / 100, 0);
    const priority   = p.priority ?? 0;
    const primaryKey = CAT_LABEL_TO_KEY[p.category] ?? '';
    const domBonus   = (primaryKey && dominantKeys.includes(primaryKey))
      ? (radarValues[primaryKey] ?? 0) * DOMINANCE_MULTIPLIER : 0;
    domBonusMap[p.id] = domBonus;
    return {
      id: p.id,
      rawScore:      +raw.toFixed(2),
      priorityBonus: priority,
      domBonus,
      finalScore:    +(raw + priority * 100 + domBonus).toFixed(2),
      primaryKey,
    };
  });

  // 4. Filter + sort (preset → single-dominant primary-cat → score)
  let matched = scoredRows.filter(r => r.finalScore >= MATCH_THRESHOLD);
  matched.sort((a, b) => {
    const aPreset = presetBoostedIds.includes(a.id) ? 1 : 0;
    const bPreset = presetBoostedIds.includes(b.id) ? 1 : 0;
    if (bPreset !== aPreset) return bPreset - aPreset;
    if (singleDominantKey) {
      const aMatch = a.primaryKey === singleDominantKey ? 1 : 0;
      const bMatch = b.primaryKey === singleDominantKey ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
    }
    return b.finalScore - a.finalScore;
  });
  matched = matched.slice(0, MAX_PROJECTS);

  const scores: Record<string, number> = {};
  matched.forEach(r => { scores[r.id] = r.finalScore; });

  return {
    ids:    matched.map(r => r.id),
    scores,
    debugMeta: {
      dominantCategoryKeys: dominantKeys,
      singleDominantKey,
      presetBoostedIds,
      domBonusMap,
      dominanceThreshold: DOMINANCE_THRESHOLD,
    },
    _scoredRows: scoredRows,
  };
}
