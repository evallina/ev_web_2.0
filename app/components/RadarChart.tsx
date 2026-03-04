'use client';

import { useState } from 'react';

// ── Design variables (edit these to restyle the chart) ─────────────────────────
const activeStrokeWidth = 3;          // line weight of the active polygon
const ghostStrokeWidth  = 2;          // line weight of the ghost (history) polygons
const activeFillOpacity = 0.04;       // white fill opacity inside the active polygon
const categoryTextSize  = 'text-base'; // Tailwind-style size token for category labels
const arrowColor        = 'white';    // color of the + / − buttons
const arrowOpacity      = 0.30;       // resting opacity of the + / − buttons (0–1)
const arrowFontSize     = 25;         // font size of the + / − buttons in viewBox units

// ── Chart geometry ─────────────────────────────────────────────────────────────
const CX      = 400;   // SVG viewBox center x  (viewBox: 0 0 800 680)
const CY      = 300;   // SVG viewBox center y
const OUTER_R = 175;   // outer chart radius in viewBox units
const LABEL_R = 255;   // distance from center to label anchor
const TENSION = 0.35;  // Catmull-Rom spline tension (0 = sharp, 1 = very round)

// Tailwind text size → SVG viewBox fontSize units
const TEXT_SIZE_MAP: Record<string, number> = {
  'text-xs':   11,
  'text-sm':   13,
  'text-base': 15,
  'text-lg':   18,
  'text-xl':   20,
};
const catFontSize = TEXT_SIZE_MAP[categoryTextSize] ?? 12;

// Categories in clockwise order starting from top
const CATEGORIES = [
  { name: 'Places',        angle: -90 },
  { name: 'Strategy',      angle: -30 },
  { name: 'Public Realm',  angle:  30 },
  { name: 'Data-Driven',   angle:  90 },
  { name: 'Interactivity', angle: 150 },
  { name: 'User Oriented', angle: 210 },
] as const;

// categoryScores keys in projects.json, in the same order as CATEGORIES
const CAT_KEYS = ['places', 'strategy', 'publicRealm', 'dataDriven', 'interactivity', 'userOriented'] as const;

// const DEFAULT_VALUES = [50, 60, 30, 70, 30, 50];
const DEFAULT_VALUES = [70, 70, 70, 70, 70, 70];

// Ghost stroke opacities indexed oldest → newest (5 slots)
const GHOST_OPACITIES = [0.08, 0.14, 0.20, 0.28, 0.40];

// ── Geometry helpers ───────────────────────────────────────────────────────────
const toRad = (deg: number) => (deg * Math.PI) / 180;
const fmt   = (n: number)   => n.toFixed(2);

function spokePoint(i: number, value: number) {
  const a = toRad(CATEGORIES[i].angle);
  const r = (value / 100) * OUTER_R;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function spokeEnd(i: number) {
  const a = toRad(CATEGORIES[i].angle);
  return { x: CX + OUTER_R * Math.cos(a), y: CY + OUTER_R * Math.sin(a) };
}

function labelPos(i: number) {
  const a = toRad(CATEGORIES[i].angle);
  return { x: CX + LABEL_R * Math.cos(a), y: CY + LABEL_R * Math.sin(a) };
}

/**
 * Converts points to a smooth closed Catmull-Rom → cubic Bézier SVG path.
 * Always produces the same number of commands regardless of values,
 * so CSS transitions on the `d` attribute animate smoothly.
 */
function smoothClosedPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  const cmds: string[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) cmds.push(`M ${fmt(p1.x)} ${fmt(p1.y)}`);
    const cp1x = p1.x + (p2.x - p0.x) * TENSION / 3;
    const cp1y = p1.y + (p2.y - p0.y) * TENSION / 3;
    const cp2x = p2.x - (p3.x - p1.x) * TENSION / 3;
    const cp2y = p2.y - (p3.y - p1.y) * TENSION / 3;
    cmds.push(`C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`);
  }
  return cmds.join(' ') + ' Z';
}

// ── Component ──────────────────────────────────────────────────────────────────
interface RadarChartProps {
  onPlay?: (values: Record<string, number>) => void;
}

export default function RadarChart({ onPlay }: RadarChartProps) {
  const [values, setValues]         = useState<number[]>([...DEFAULT_VALUES]);
  const [ghosts, setGhosts]         = useState<number[][]>([]);
  const [played, setPlayed]         = useState(false);
  // Incrementing counters per arrow — changing the key remounts the element,
  // restarting the CSS animation even on rapid successive clicks.
  const [arrowKeys, setArrowKeys]   = useState<Record<string, number>>({});
  const [textKeys,  setTextKeys]    = useState<Record<number, number>>({});
  const [textDir,   setTextDir]     = useState<Record<number, 'up' | 'down'>>({});

  const adjust = (i: number, delta: number) => {
    setValues(prev => {
      const next = [...prev];
      next[i] = Math.max(0, Math.min(100, next[i] + delta));
      return next;
    });

    // Increment arrow key → remounts text → restarts animation
    const arrowKey = `${i}-${delta > 0 ? 'up' : 'down'}`;
    setArrowKeys(prev => ({ ...prev, [arrowKey]: (prev[arrowKey] ?? 0) + 1 }));

    // Increment text key + set direction → remounts text → restarts pulse
    setTextDir(prev => ({ ...prev, [i]: delta > 0 ? 'up' : 'down' }));
    setTextKeys(prev => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }));
  };

  const handlePlay = () => {
    setGhosts(prev => [...prev.slice(-4), [...values]]);
    setPlayed(true);
    onPlay?.(Object.fromEntries(CAT_KEYS.map((key, i) => [key, values[i]])));
  };

  const activePts  = values.map((v, i) => spokePoint(i, v));
  const activePath = smoothClosedPath(activePts);

  return (
    <div className="flex flex-col items-center w-full">

      {/* ── Radar SVG ─────────────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 800 680"
        style={{
          width: '100%',
          maxHeight: '54vh',
          fontFamily: 'var(--font-roboto, Roboto, sans-serif)',
        }}
        aria-label="Radar chart — select project types"
      >

        {/* Spoke lines */}
        {CATEGORIES.map((_, i) => {
          const e = spokeEnd(i);
          return (
            <line
              key={`spoke-${i}`}
              x1={CX} y1={CY} x2={e.x} y2={e.y}
              stroke="white" strokeOpacity={0.12} strokeWidth={1}
            />
          );
        })}

        {/* Ghost polygons — black stroke, oldest → newest */}
        {ghosts.map((gVals, gi) => {
          const oi = gi + 5 - ghosts.length; // opacity index: 0=oldest(0.08), 4=newest(0.40)
          return (
            <path
              key={`ghost-${gi}`}
              d={smoothClosedPath(gVals.map((v, i) => spokePoint(i, v)))}
              fill="none"
              stroke="#000000"
              strokeWidth={ghostStrokeWidth}
              strokeOpacity={GHOST_OPACITIES[oi]}
            />
          );
        })}

        {/* Active polygon */}
        <path
          d={activePath}
          fill="white"
          fillOpacity={activeFillOpacity}
          stroke="white"
          strokeWidth={activeStrokeWidth}
          style={{ transition: 'd 300ms ease-in-out' }}
        />

        {/* Category labels + arrow controls */}
        {CATEGORIES.map((cat, i) => {
          const { x, y } = labelPos(i);
          const upKey    = `${i}-up`;
          const downKey  = `${i}-down`;

          return (
            <g key={`label-${i}`}>

              {/* ▲ Increase */}
              <g onClick={() => adjust(i, 10)} style={{ cursor: 'pointer' }}>
                <rect x={x - 28} y={y - 44} width={56} height={26} fill="transparent" />
                <text
                  key={`arrow-up-${i}-${arrowKeys[upKey] ?? 0}`}
                  x={x} y={y - 28}
                  textAnchor="middle"
                  fill={arrowColor}
                  fillOpacity={arrowOpacity}
                  fontSize={arrowFontSize}
                  fontWeight="bold"
                  style={{
                    userSelect: 'none',
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: arrowKeys[upKey]
                      ? 'radar-arrow-flash 220ms ease-out forwards'
                      : 'none',
                  }}
                >+</text>
              </g>

              {/* Category name */}
              <text
                key={`cat-text-${i}-${textKeys[i] ?? 0}`}
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={catFontSize}
                fontWeight="bold"
                style={{
                  userSelect: 'none',
                  letterSpacing: '2px',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  animation: textKeys[i]
                    ? `radar-pulse-${textDir[i]} 300ms ease-out forwards`
                    : 'none',
                }}
              >
                {cat.name.toUpperCase()}
              </text>

              {/* ▼ Decrease */}
              <g onClick={() => adjust(i, -10)} style={{ cursor: 'pointer' }}>
                <rect x={x - 28} y={y + 28} width={56} height={26} fill="transparent" />
                <text
                  key={`arrow-down-${i}-${arrowKeys[downKey] ?? 0}`}
                  x={x} y={y + 42}
                  textAnchor="middle"
                  fill={arrowColor}
                  fillOpacity={arrowOpacity}
                  fontSize={arrowFontSize}
                  fontWeight="bold"
                  style={{
                    userSelect: 'none',
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: arrowKeys[downKey]
                      ? 'radar-arrow-flash 220ms ease-out forwards'
                      : 'none',
                  }}
                >−</text>
              </g>

            </g>
          );
        })}

      </svg>

      {/* ── Play hint note ────────────────────────────────────────────────── */}
      <p
        className="font-sans text-white/50 text-xs uppercase tracking-[0.2em] mb-3"
        style={{
          transition: 'opacity 600ms ease',
          opacity: played ? 0 : 1,
          pointerEvents: 'none',
        }}
      >
        Press Play to Unveil the selected showcase
      </p>

      {/* ── Play button ───────────────────────────────────────────────────── */}
      <button
        onClick={handlePlay}
        aria-label="Save current selection and load projects"
        className="mt-5 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
      >
        <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
          <polygon points="1,1 11,7 1,13" fill="white" />
        </svg>
      </button>

    </div>
  );
}
