'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { CATEGORIES } from '@/src/config/categories';
import { MAX_DISPLAYED_PROJECTS } from '@/src/config/selection';
import { selectProjects } from '@/src/lib/selectProjects';
import projectsData from '@/src/data/projects.json';

// ── Design variables ───────────────────────────────────────────────────────────
const ICON_W               = 32;   // px — icon width
const ICON_H               = 44;   // px — icon height
const ICON_GAP             = 4;    // px — gap between icons
const ICON_FOLD_W          = 9;    // px — fold notch from right edge
const ICON_FOLD_H          = 6;    // px — fold notch from top edge

// Text inside each icon
const iconCategoryTextSize  = 11;  // px — category abbreviation (e.g. "AI")
const iconProjectIdTextSize = 9;   // px — project ID (e.g. "EV-26")

// Non-selected icon opacity
const unselectedOpacity     = 0.25;

// Selection outline — fixed-width box, always viewport-centered
// Width is derived from MAX_DISPLAYED_PROJECTS so changing that one number
// automatically resizes the outline and the CENTER zone.
const selectionOutlineColor   = 'rgba(255, 255, 255, 0.4)';
const selectionOutlineWidth   = 1;   // px
const selectionOutlineRadius  = 6;   // px
const SEL_PAD_X               = 6;   // px — horizontal padding inside outline
const SEL_PAD_Y               = 3;   // px — vertical padding inside outline

// Gap between the CENTER outline edges and the LEFT / RIGHT non-selected zones
const ZONE_GAP = 8; // px

// Max possible outline width — used as the fallback for zone-boundary calculations
// when nothing is selected yet. The ACTUAL rendered outline adapts dynamically
// to the real selected count (see dynamicOutlineW useMemo in the component).
const MAX_OUTLINE_INNER_W = MAX_DISPLAYED_PROJECTS * (ICON_W + ICON_GAP) - ICON_GAP;
const MAX_OUTLINE_W       = MAX_OUTLINE_INNER_W + SEL_PAD_X * 2;

// Component height and margins
const LABEL_H         = 20;  // px — height of area above icons for the "SELECTED WORK" label
const BOTTOM_H        = 10;   // px — space below icons
const REEL_H          = LABEL_H + ICON_H + BOTTOM_H; // 72 px

// reelMarginTop: gap between the chart SVG and the reel.
// Use a negative value to pull the reel closer, compensating for the SVG's
// empty viewBox space below the lowest arrow buttons.
// Pair with svgBottomClip in RadarChart.tsx for fine control.
const reelMarginTop    = 8;   // px
const reelMarginBottom = 10;  // px

// Intro animation timing — fast reveal after chart autoplay completes
const STAGGER_MS = 12;   // ms — delay between consecutive icon entrances
const ENTER_MS   = 120;  // ms — duration of each icon's entrance animation

// ── Static data (computed once at module load) ──────────────────────────────────
type RawProject = {
  id: string;
  title: string;
  category: string;
  priority?: number;
  presets?: (string | string[])[] | null;
  categoryScores: Record<string, number>;
};

const ALL_PROJECTS = projectsData.projects as RawProject[];

const CAT_ABBR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.jsonCategory, c.abbr])
);

// Category-sorted order (Futures → AI → Architecture → Public Realm → CD),
// alphabetical by title within each category.
const ORDERED_PROJECTS: { id: string; title: string; category: string; abbr: string }[] =
  CATEGORIES.flatMap(cat =>
    ALL_PROJECTS
      .filter(p => p.category === cat.jsonCategory)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(p => ({ id: p.id, title: p.title, category: p.category, abbr: CAT_ABBR[p.category] ?? '?' }))
  );

// Split point for LEFT / RIGHT zones.
// Sorted index < HALF → LEFT zone (Futures + AI).
// Sorted index >= HALF → RIGHT zone (Architecture + Public Realm + CD).
const HALF = Math.floor(ORDERED_PROJECTS.length / 2);

const INTRO_TOTAL_MS = (ORDERED_PROJECTS.length - 1) * STAGGER_MS + ENTER_MS + 200;

// ── File icon shape ────────────────────────────────────────────────────────────
// confirmed=true + selected → inverted: dark background, white fold line
function FileIcon({ selected, confirmed }: { selected: boolean; confirmed: boolean }) {
  const fw  = ICON_W - ICON_FOLD_W;
  const fh  = ICON_FOLD_H;
  const inv = selected && confirmed; // inverted (confirmed-selected) state
  return (
    <svg width={ICON_W} height={ICON_H} viewBox={`0 0 ${ICON_W} ${ICON_H}`} style={{ display: 'block' }}>
      <polygon
        points={`0,0 ${fw},0 ${ICON_W},${fh} ${ICON_W},${ICON_H} 0,${ICON_H}`}
        fill={inv ? 'rgba(30,30,30,0.88)' : selected ? 'white' : 'rgba(180,180,180,0.85)'}
      />
      <polyline
        points={`${fw},0 ${fw},${fh} ${ICON_W},${fh}`}
        fill="none"
        stroke={inv ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)'}
        strokeWidth={0.8}
      />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface IconCardReelProps {
  radarValues:      Record<string, number>;
  presetName?:      string | null;
  /** true when the user has pressed the down-arrow (confirmed selection).
   *  Non-selected icons fade out; selected icons invert to dark-background style.
   *  false = live-updating state (reset button or radar value change). */
  confirmed?:       boolean;
  onIntroComplete?: () => void;
  /** Set to true when the chart's autoplay sequence has completed.
   *  The reel mounts invisible and only starts its entrance animation once this fires.
   *  Flip back to false (on reset) to immediately hide the reel; flip to true again
   *  to replay the fast intro. */
  chartReady?:      boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function IconCardReel({
  radarValues,
  presetName,
  confirmed = false,
  onIntroComplete,
  chartReady = false,
}: IconCardReelProps) {

  const containerRef      = useRef<HTMLDivElement>(null);
  const [containerW,      setContainerW] = useState(0);
  const [phase,           setPhase]      = useState<'idle' | 'entering' | 'final'>('idle');
  const [hoveredId,       setHoveredId]  = useState<string | null>(null);
  const [tooltipPos,      setTooltipPos] = useState<{ x: number; y: number; flip: boolean } | null>(null);

  const introTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChartReadyRef = useRef(false);
  const hasEnteredViewRef = useRef(false);

  // ── Container width via ResizeObserver ────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(el);
    setContainerW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // ── Intro animation ───────────────────────────────────────────────────────
  const runIntro = useCallback(() => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    setPhase('entering');
    introTimerRef.current = setTimeout(() => {
      setPhase('final');
      onIntroComplete?.();
    }, INTRO_TOTAL_MS);
  }, [onIntroComplete]);

  // Mark when the reel section has entered the viewport.
  // Does NOT start the intro — that's gated on chartReady below.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasEnteredViewRef.current) return;
        hasEnteredViewRef.current = true;
        observer.disconnect();
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Gate the intro on chartReady (fires when chart autoplay completes).
  //   false → true  : run the fast intro (if the section is in view)
  //   true  → false : hide the reel (chart is resetting)
  useEffect(() => {
    const wasReady = prevChartReadyRef.current;
    prevChartReadyRef.current = chartReady;

    if (chartReady && !wasReady) {
      if (hasEnteredViewRef.current) {
        const id = setTimeout(runIntro, 0);
        return () => clearTimeout(id);
      }
    } else if (!chartReady && wasReady) {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      const id = setTimeout(() => setPhase('idle'), 0);
      return () => clearTimeout(id);
    }
  }, [chartReady, runIntro]);

  useEffect(() => () => { if (introTimerRef.current) clearTimeout(introTimerRef.current); }, []);

  // ── Selection ─────────────────────────────────────────────────────────────
  // selectedOrdered: IDs sorted best score first → fill CENTER zone left-to-right
  const { selectedOrdered, selectedIdSet } = useMemo(() => {
    const result = selectProjects(radarValues, ALL_PROJECTS, presetName ?? null);
    return { selectedOrdered: result.ids, selectedIdSet: new Set(result.ids) };
  }, [radarValues, presetName]);

  // Non-selected icons split by sorted position:
  //   index < HALF (Futures + AI)              → LEFT zone
  //   index >= HALF (Architecture + PR + CD)   → RIGHT zone
  const { nonSelectedLeft, nonSelectedRight } = useMemo(() => {
    const left:  typeof ORDERED_PROJECTS = [];
    const right: typeof ORDERED_PROJECTS = [];
    ORDERED_PROJECTS.forEach((p, i) => {
      if (selectedIdSet.has(p.id)) return;
      (i < HALF ? left : right).push(p);
    });
    return { nonSelectedLeft: left, nonSelectedRight: right };
  }, [selectedIdSet]);

  // ── Dynamic outline width — adapts to the actual selected count ──────────
  // The outline exactly wraps the selected icons (+ SEL_PAD_X on each side).
  // Falls back to MAX_OUTLINE_W when nothing is selected (outline is hidden then anyway).
  const dynamicOutlineW = useMemo(() => {
    if (selectedOrdered.length === 0) return MAX_OUTLINE_W;
    return selectedOrdered.length * (ICON_W + ICON_GAP) - ICON_GAP + SEL_PAD_X * 2;
  }, [selectedOrdered.length]);

  // ── Icon X positions (absolute px from container left edge) ───────────────
  //
  // Three zones:
  //   LEFT   — non-selected, packed right-to-left, ending before the outline left edge
  //   CENTER — selected icons in score order (best = leftmost), always viewport-centered
  //   RIGHT  — non-selected, packed left-to-right, starting after the outline right edge
  //
  // Because CENTER is anchored at containerW/2, the outline stays visually
  // centered regardless of which icons are selected or how many there are.
  const iconXMap = useMemo(() => {
    const cw = containerW || 800; // fallback for initial / SSR render
    const CENTER_OUTLINE_LEFT = cw / 2 - dynamicOutlineW / 2;
    const CENTER_ICON_START   = CENTER_OUTLINE_LEFT + SEL_PAD_X;
    const LEFT_ZONE_END       = CENTER_OUTLINE_LEFT - ZONE_GAP;
    const RIGHT_ZONE_START    = CENTER_OUTLINE_LEFT + dynamicOutlineW + ZONE_GAP;

    const map = new Map<string, number>();

    // CENTER: selected icons fill the outline exactly (no centering offset needed)
    selectedOrdered.forEach((id, i) => {
      map.set(id, CENTER_ICON_START + i * (ICON_W + ICON_GAP));
    });

    // LEFT: packed right-to-left (index nL-1 = rightmost, nearest the outline)
    const nL = nonSelectedLeft.length;
    nonSelectedLeft.forEach((p, i) => {
      map.set(p.id, LEFT_ZONE_END - (nL - i) * (ICON_W + ICON_GAP) + ICON_GAP);
    });

    // RIGHT: packed left-to-right
    nonSelectedRight.forEach((p, i) => {
      map.set(p.id, RIGHT_ZONE_START + i * (ICON_W + ICON_GAP));
    });

    return map;
  }, [containerW, dynamicOutlineW, selectedOrdered, nonSelectedLeft, nonSelectedRight]);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const hoveredProject = useMemo(
    () => ORDERED_PROJECTS.find(p => p.id === hoveredId) ?? null,
    [hoveredId],
  );

  const handleIconEnter = useCallback((p: typeof ORDERED_PROJECTS[0], e: React.MouseEvent) => {
    if (phase !== 'final') return;
    setHoveredId(p.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tipH  = 28;
    const flip  = rect.top - tipH - 6 < 8;
    setTooltipPos({ x: rect.left + rect.width / 2, y: flip ? rect.bottom + 6 : rect.top - 6, flip });
  }, [phase]);

  const handleIconLeave = useCallback(() => {
    setHoveredId(null);
    setTooltipPos(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const showOutline = phase === 'final' && selectedOrdered.length > 0;

  return (
    <div
      ref={containerRef}
      style={{
        position:      'relative',
        width:         '100%',
        height:        REEL_H,
        flexShrink:    0,
        marginTop:     reelMarginTop,
        marginBottom:  reelMarginBottom,
        // When confirmed the reel is still visible but non-interactive.
        pointerEvents: confirmed ? 'none' : 'auto',
      }}
    >
      {/* ── Icon layer — overflow:hidden clips off-screen icons and carries the fade-edge mask ── */}
      <div
        style={{
          position:        'absolute',
          inset:           0,
          overflow:        'hidden',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          maskImage:       'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        {ORDERED_PROJECTS.map((p, i) => {
          const x          = iconXMap.get(p.id) ?? 0;
          const isSelected = selectedIdSet.has(p.id);
          const delay      = i * STAGGER_MS; // stagger by category-sort index

          // Phase-dependent styles:
          //   idle     — invisible; icons are already at their zone positions (left: x)
          //   entering — CSS stagger animation slides each icon in 8px from the right
          //   final    — explicit opacity; `left` CSS-transitions when selection changes
          //
          // confirmed=true (down-arrow pressed):
          //   selected icons stay at opacity 1 with inverted colors (handled in FileIcon + text)
          //   non-selected icons fade to opacity 0
          let iconStyle: React.CSSProperties;
          if (phase === 'idle') {
            // transition enables a smooth 200ms fade-out when chartReady → false (reset)
            iconStyle = { opacity: 0, transition: 'opacity 200ms ease' };
          } else if (phase === 'entering') {
            iconStyle = { animation: `icon-reel-enter ${ENTER_MS}ms ease-out ${delay}ms both` };
          } else {
            const targetOpacity = isSelected ? 1 : (confirmed ? 0 : unselectedOpacity);
            iconStyle = {
              opacity:    targetOpacity,
              transition: 'opacity 300ms ease, left 300ms ease',
            };
          }

          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left:     x,
                top:      LABEL_H,
                width:    ICON_W,
                height:   ICON_H,
                ...iconStyle,
              }}
              onMouseEnter={e => handleIconEnter(p, e)}
              onMouseLeave={handleIconLeave}
            >
              <FileIcon selected={isSelected} confirmed={confirmed} />

              {/* Text overlay — bottom-left inside the icon */}
              <div
                style={{
                  position:      'absolute',
                  bottom:        3,
                  left:          3,
                  right:         2,
                  pointerEvents: 'none',
                  overflow:      'hidden',
                }}
              >
                <div style={{
                  fontFamily:    'var(--font-roboto, sans-serif)',
                  fontSize:      iconCategoryTextSize,
                  fontWeight:    700,
                  lineHeight:    1.15,
                  // confirmed+selected → white text on dark bg; else normal
                  color:         isSelected ? (confirmed ? 'white' : '#2a2a2a') : '#555',
                  letterSpacing: '0.3px',
                  whiteSpace:    'nowrap',
                }}>
                  {p.abbr}
                </div>
                <div style={{
                  fontFamily: 'var(--font-roboto, sans-serif)',
                  fontSize:   iconProjectIdTextSize,
                  fontWeight: 400,
                  lineHeight: 1.15,
                  color:      isSelected ? (confirmed ? 'rgba(255,255,255,0.75)' : '#4a4a4a') : '#777',
                  whiteSpace: 'nowrap',
                }}>
                  {p.id}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Selection outline overlay ─────────────────────────────────────────
          Outside the overflow:hidden icon layer — never clipped.
          `left: calc(50% - Xpx)` keeps it visually centered at all times. */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          left:          `calc(50% - ${dynamicOutlineW / 2}px)`,
          top:           LABEL_H - SEL_PAD_Y,
          width:         dynamicOutlineW,
          height:        ICON_H + SEL_PAD_Y * 2,
          border:        `${selectionOutlineWidth}px solid ${selectionOutlineColor}`,
          borderRadius:  selectionOutlineRadius,
          boxSizing:     'border-box',
          pointerEvents: 'none',
          opacity:       showOutline ? 1 : 0,
          transition:    'opacity 300ms ease, left 300ms ease, width 300ms ease',
        }}
      >
        {/* "SELECTED WORK" label — above the outline, never cropped */}
        <span
          style={{
            position:      'absolute',
            bottom:        '100%',
            left:          '50%',
            transform:     'translateX(-50%)',
            paddingBottom: 4,
            color:         'white',
            opacity:       0.55,
            fontSize:      7,
            fontFamily:    'var(--font-roboto, sans-serif)',
            letterSpacing: '2px',
            whiteSpace:    'nowrap',
            userSelect:    'none',
          }}
        >SELECTED WORK</span>
      </div>

      {/* ── Tooltip — position:fixed escapes overflow:hidden ──────────────── */}
      {hoveredProject && tooltipPos && (
        <div
          style={{
            position:       'fixed',
            left:           tooltipPos.x,
            top:            tooltipPos.y,
            transform:      tooltipPos.flip ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            background:     'rgba(15,15,15,0.88)',
            color:          'white',
            fontSize:       11,
            fontFamily:     'var(--font-roboto, sans-serif)',
            padding:        '4px 8px',
            borderRadius:   4,
            whiteSpace:     'nowrap',
            pointerEvents:  'none',
            zIndex:         9999,
            backdropFilter: 'blur(4px)',
            letterSpacing:  '0.03em',
          }}
        >
          {hoveredProject.id} — {hoveredProject.category} — {hoveredProject.title}
        </div>
      )}
    </div>
  );
}
