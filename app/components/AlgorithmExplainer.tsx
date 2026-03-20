'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/src/config/categories';
import { MIN_DISPLAYED_PROJECTS, MAX_DISPLAYED_PROJECTS } from '@/src/config/selection';
import presetsData from '@/src/data/presets.json';
import type { DebugMeta } from '@/src/types';

// ── Design variables ───────────────────────────────────────────────────────────
const PANEL_TOP       = 60;   // px — below header
const PANEL_WIDTH     = 320;  // px
const FADE_DURATION   = 200;  // ms
const MATCH_THRESHOLD = 20;   // minimum score (mirrors selectProjects)

// ── Preset lookup ──────────────────────────────────────────────────────────────
const presetMaxMap: Record<string, number | null> = {};
for (const p of presetsData as { name: string; maxProjects?: number }[]) {
  presetMaxMap[p.name] = p.maxProjects ?? null;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
  color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 600,
};
const titleStyle: React.CSSProperties = {
  fontWeight: 500, color: 'rgba(255,255,255,0.95)', fontSize: 13, marginBottom: 4,
};
const descStyle: React.CSSProperties = {
  fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.55, marginBottom: 8,
};
const noteStyle: React.CSSProperties = {
  fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5, marginTop: 6,
  fontStyle: 'italic',
};
const monoStyle: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 11,
};
const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0',
};
const pillBase: React.CSSProperties = {
  ...monoStyle,
  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
  marginRight: 4, marginBottom: 4,
};
const pillHighlight: React.CSSProperties = {
  ...pillBase,
  background: 'rgba(217,169,56,0.35)', color: 'rgba(255,220,120,0.95)',
};
const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: 12, marginBottom: 3,
};
const rowLabel: React.CSSProperties = { color: 'rgba(255,255,255,0.50)' };
const rowValue: React.CSSProperties = { ...monoStyle, color: 'rgba(255,255,255,0.80)' };

// ── Scrollbar CSS (injected once) ──────────────────────────────────────────────
const SCROLLBAR_CSS = `
.algo-explainer::-webkit-scrollbar { width: 4px; }
.algo-explainer::-webkit-scrollbar-track { background: transparent; }
.algo-explainer::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
`;

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  radarValues: Record<string, number>;
  presetName: string | null;
  debugMeta: DebugMeta | null;
  selectedCount: number;
  totalProjects: number;
  matchedCount: number;
}

export default function AlgorithmExplainer({
  visible, radarValues, presetName, debugMeta,
  selectedCount, totalProjects, matchedCount,
}: Props) {
  const [inRange, setInRange] = useState(false);

  // Track whether project-selection or project-cards is in viewport
  useEffect(() => {
    const ids = ['project-selection', 'project-cards'];
    const visibilityMap: Record<string, boolean> = {};

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          visibilityMap[entry.target.id] = entry.isIntersecting;
        }
        setInRange(ids.some(id => visibilityMap[id]));
      },
      { threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const show = visible && inRange;

  // ── Computed values ──────────────────────────────────────────────────────
  const catKeys = CATEGORIES.map(c => c.key);
  const vals = catKeys.map(k => radarValues[k] ?? 0);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const dynamicMax = Math.round(
    MIN_DISPLAYED_PROJECTS + (MAX_DISPLAYED_PROJECTS - MIN_DISPLAYED_PROJECTS) * (avg / 100),
  );
  const presetOverride = presetName ? (presetMaxMap[presetName] ?? null) : null;
  const finalMax = presetOverride ?? dynamicMax;

  const dominant = debugMeta?.dominantCategoryKeys ?? [];
  const singleDom = debugMeta?.singleDominantKey ?? null;
  const presetBoosted = debugMeta?.presetBoostedIds ?? [];

  return (
    <>
      <style>{SCROLLBAR_CSS}</style>
      <div
        className="algo-explainer"
        style={{
          position: 'fixed',
          left: 'var(--page-margin)',
          top: PANEL_TOP,
          width: PANEL_WIDTH,
          maxHeight: `calc(80vh - ${PANEL_TOP}px)`,
          overflowY: 'auto',
          zIndex: 40,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '16px 18px',
          color: 'white',
          fontSize: 13,
          opacity: show ? 1 : 0,
          pointerEvents: show ? 'auto' : 'none',
          transition: `opacity ${FADE_DURATION}ms ease`,
        }}
      >
        {/* HEADER */}
        <div style={labelStyle}>Algorithm Explainer</div>

        {/* PURPOSE */}
        <p style={descStyle}>
          This algorithm selects and ranks projects based on how well they match
          the radar chart&apos;s category values. It translates a visual shape into a
          curated list of relevant work — the more a project&apos;s strengths align
          with the radar&apos;s emphasis, the higher it scores.
        </p>

        <div style={dividerStyle} />

        {/* CATEGORIES LEGEND */}
        <div style={titleStyle}>Categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '2px 8px', marginBottom: 6 }}>
          {CATEGORIES.map(c => (
            <div key={c.key} style={{ contents: undefined, display: 'contents' }}>
              <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{c.abbr}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>{c.label}</span>
            </div>
          ))}
        </div>
        <p style={noteStyle}>
          Each project has a score (0–100) in every category, reflecting how
          strongly it relates to that discipline.
        </p>

        <div style={dividerStyle} />

        {/* PRESETS */}
        <div style={titleStyle}>Presets</div>
        <p style={descStyle}>
          Presets are curated radar configurations — pre-tuned combinations of
          category values that represent a thematic lens for viewing the work.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '2px 8px', marginBottom: 6 }}>
          <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.65)' }}>Overview</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Even distribution — balanced cross-section</span>
          <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.65)' }}>Research</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Emphasizes computational + experimental work</span>
          <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.65)' }}>Spatial Exp.</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Emphasizes public realm + architecture</span>
          <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.65)' }}>Systems</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Emphasizes computational + futures thinking</span>
        </div>
        <p style={noteStyle}>
          Projects can be tagged with a preset name in the data. Tagged projects
          are boosted to the top of results when that preset is active.
        </p>
        <p style={noteStyle}>
          Presets can also define a max projects override, replacing the dynamic
          calculation with a fixed number.
        </p>

        <div style={dividerStyle} />

        {/* STEP 1 */}
        <div style={titleStyle}>Step 1 — Radar input</div>
        <p style={descStyle}>
          The 5 radar values define the search criteria. Higher = stronger preference.
        </p>
        <div style={{ marginBottom: 8 }}>
          {CATEGORIES.map(c => {
            const v = radarValues[c.key] ?? 0;
            return (
              <span key={c.key} style={v >= 80 ? pillHighlight : pillBase}>
                {c.abbr} {v}
              </span>
            );
          })}
        </div>

        <div style={dividerStyle} />

        {/* STEP 2 */}
        <div style={titleStyle}>Step 2 — Max projects</div>
        <p style={descStyle}>
          How many projects to show. Scales with radar signal strength, unless a
          preset overrides it.
        </p>
        <div style={rowStyle}><span style={rowLabel}>avg signal</span><span style={rowValue}>{avg.toFixed(0)} / 100</span></div>
        <div style={rowStyle}><span style={rowLabel}>dynamic range</span><span style={rowValue}>{MIN_DISPLAYED_PROJECTS} – {MAX_DISPLAYED_PROJECTS}</span></div>
        <div style={rowStyle}><span style={rowLabel}>dynamic result</span><span style={rowValue}>{dynamicMax}</span></div>
        <div style={rowStyle}><span style={rowLabel}>preset override</span><span style={rowValue}>{presetOverride !== null ? `${presetName} → ${presetOverride}` : 'none'}</span></div>
        <div style={rowStyle}><span style={rowLabel}>final max</span><span style={{ ...rowValue, color: 'rgba(255,220,120,0.95)' }}>{finalMax}</span></div>

        <div style={dividerStyle} />

        {/* STEP 3 */}
        <div style={titleStyle}>Step 3 — Dominance detection</div>
        <p style={descStyle}>
          Categories at ≥80% get a bonus multiplier (×2). If exactly one is at
          100% and all others &lt;30%, it becomes &quot;single dominant&quot; — its
          projects sort first.
        </p>
        <div style={rowStyle}>
          <span style={rowLabel}>dominant (≥80)</span>
          <span style={rowValue}>{dominant.length > 0 ? dominant.map(k => CATEGORIES.find(c => c.key === k)?.abbr ?? k).join(', ') : 'none'}</span>
        </div>
        <div style={rowStyle}>
          <span style={rowLabel}>single dominant?</span>
          <span style={rowValue}>{singleDom ? (CATEGORIES.find(c => c.key === singleDom)?.abbr ?? singleDom) : 'no'}</span>
        </div>
        <div style={rowStyle}><span style={rowLabel}>bonus multiplier</span><span style={rowValue}>× 2</span></div>

        <div style={dividerStyle} />

        {/* STEP 4 */}
        <div style={titleStyle}>Step 4 — Scoring each project</div>
        <p style={descStyle}>
          Every project is scored by multiplying its category scores against the
          radar values (a dot product), then adding bonuses.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 6,
          padding: '8px 10px', marginBottom: 8, ...monoStyle, lineHeight: 1.8,
          color: 'rgba(255,255,255,0.75)',
        }}>
          <div><span style={{ color: 'rgba(255,220,120,0.95)' }}>final</span> = raw score</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ priority × 100</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ dominance bonus</div>
        </div>
        <div style={{ ...descStyle, fontSize: 11 }}>
          <strong style={{ color: 'rgba(255,255,255,0.65)' }}>raw</strong> = sum of (radar[cat] × project[cat] / 100) for each category
        </div>
        <div style={{ ...descStyle, fontSize: 11 }}>
          <strong style={{ color: 'rgba(255,255,255,0.65)' }}>priority</strong> = manually assigned importance (0–10) in the data
        </div>
        <div style={{ ...descStyle, fontSize: 11 }}>
          <strong style={{ color: 'rgba(255,255,255,0.65)' }}>dom. bonus</strong> = radar[cat] × 2, only if project&apos;s primary category is dominant
        </div>

        <div style={dividerStyle} />

        {/* STEP 5 */}
        <div style={titleStyle}>Step 5 — Filter + sort</div>
        <p style={descStyle}>
          Projects below threshold ({MATCH_THRESHOLD}) are removed. Sorted by:
        </p>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, paddingLeft: 8 }}>
          <div>1st — Preset-tagged projects float to top</div>
          <div>2nd — If single dominant exists, its projects sort next</div>
          <div>3rd — Highest final score</div>
        </div>
        <p style={noteStyle}>Then sliced to the max project count from step 2.</p>

        <div style={dividerStyle} />

        {/* STEP 6 */}
        <div style={titleStyle}>Step 6 — Result</div>
        <p style={descStyle}>
          The final curated selection is sent to the card carousel.
        </p>
        <div style={rowStyle}><span style={rowLabel}>total scored</span><span style={rowValue}>{totalProjects}</span></div>
        <div style={rowStyle}><span style={rowLabel}>above threshold</span><span style={rowValue}>{matchedCount}</span></div>
        <div style={rowStyle}><span style={rowLabel}>selected</span><span style={{ ...rowValue, color: 'rgba(255,220,120,0.95)' }}>{selectedCount}</span></div>
        <div style={rowStyle}><span style={rowLabel}>preset boosted</span><span style={rowValue}>{presetBoosted.length} of {selectedCount}</span></div>
      </div>
    </>
  );
}
