'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import projectsData from '@/src/data/projects.json';
import { BREAKDOWN_CATS, CAT_META, CATEGORIES } from '@/src/config/categories';
import type { DebugMeta } from '@/src/types';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  DESIGN VARIABLES — edit these to tune the feel of the section             │
// └─────────────────────────────────────────────────────────────────────────────┘
const cardGapTop    = 20;  // px — dark space above card image
const cardGapBottom = 20;  // px — dark space below card image
const zoomZoneWidth = 20;  // % — center zoom zone (remaining space split for prev / next)

// ── Back-to-chart button (sits left of the icon strip)
const backArrowSize  = 22;                        // px — SVG icon size
const backArrowColor = 'rgba(255,255,255,0.50)';  // resting color
const backArrowHover = 'rgba(255,255,255,0.90)';  // hover color

// ── Side navigation arrows (◀ / ▶) ─────────────────────────────────────────────
// Arrow fill (the glyph color)
const arrowFillColor   = 'rgba(255, 255, 255, 0.8)';
const arrowFillOpacity = 1;

// Arrow circle outline
const arrowCircleStrokeColor   = 'rgba(255, 255, 255, 0.5)';
const arrowCircleStrokeOpacity = 1;
const arrowCircleStrokeWidth   = 1.0;       // px
const arrowCircleFillColor     = 'rgba(0, 0, 0, 0.1)';

// Micro-adjustments to position the circle relative to the arrow icon
const arrowCircleOffsetX = 2;   // px — positive moves circle right
const arrowCircleOffsetY = 0;   // px — positive moves circle down
const arrowCircleSize    = 44;  // px — diameter of the circle

const navArrowGlyphSize = 17;   // px — font size of the ◀ / ▶ glyphs

// ── Breakdown strip colors (used in debug overlay)
const breakdownValuesColor  = 'rgba(255,255,255,0.80)';
const breakdownAbbrColor    = 'rgba(255,255,255,0.40)';
const breakdownSepColor     = 'rgba(255,255,255,0.40)';
// └─────────────────────────────────────────────────────────────────────────────┘


// ── Layout constants ────────────────────────────────────────────────────────────
const HEADER_H     = 48;  // px — fixed header height (set in layout.tsx)
// SIDE_MARGIN removed — card padding now uses var(--page-margin) from globals.css
const ICON_STRIP_H = 58;  // px — icon strip: icons row + preset label below
const BOTTOM_BAR_H = 28;  // px — just the progress indicator

// Total top area = header + icon strip
const TOP_AREA_H = HEADER_H + ICON_STRIP_H;  // 106 px

// Side arrow vertical offset from 50%:
// Card area spans TOP_AREA_H → (vh - BOTTOM_BAR_H); midpoint = 50vh + (TOP_AREA_H - BOTTOM_BAR_H)/2
const SIDE_ARROW_OFFSET_PX = Math.round((TOP_AREA_H - BOTTOM_BAR_H) / 2);

// Pad the SVG element by the max offset so the circle is never clipped at the viewBox edge.
// arrowCircleOffsetX/Y are mirrored for the right arrow (positive = toward screen center for both).
const _arrowSvgPad  = Math.max(Math.abs(arrowCircleOffsetX), Math.abs(arrowCircleOffsetY), 0);
const _arrowSvgSize = arrowCircleSize + _arrowSvgPad * 2;

// ── Confirmed icon strip sizing ─────────────────────────────────────────────────
const STRIP_ICON_W    = 26;
const STRIP_ICON_H    = 36;
const STRIP_FOLD_W    =  7;
const STRIP_FOLD_H    =  5;
const STRIP_GAP       =  4;
const STRIP_TEXT_ABBR =  9;
const STRIP_TEXT_ID   =  7;

// ── Category lookup: jsonCategory → abbreviation ────────────────────────────────
const CAT_ABBR_BY_JSON: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.jsonCategory, c.abbr])
);

// ── Types ───────────────────────────────────────────────────────────────────────
type ProjectEntry = (typeof projectsData.projects)[number];

interface CardItem {
  src: string;
  alt: string;
  isFirstOfProject: boolean;
}

interface StripItem {
  id:           string;
  abbr:         string;
  firstCardIdx: number;
  isOther:      boolean;  // OTH icon renders in dark style; project icons in white
}

export type { DebugMeta } from '@/src/types';

interface Props {
  selectedProjectIds?:    string[];
  selectedProjectScores?: Record<string, number>;
  radarValues?:           Record<string, number>;
  activePresetName?:      string | null;
  debugMeta?:             DebugMeta;
  showDebug?:             boolean;
}


// ── Strip icon ──────────────────────────────────────────────────────────────────
// Project icons → white fill, dark text (visible on the dark section background).
// OTH icon      → dark fill, white text (visually distinct from project icons).
// `active`      → currently-visible project's icon (brighter + outlined).
function StripIcon({ abbr, id, active, isOther }: { abbr: string; id: string; active: boolean; isOther: boolean }) {
  const fw = STRIP_ICON_W - STRIP_FOLD_W;
  const fh = STRIP_FOLD_H;

  if (isOther) {
    // Dark inverted style
    return (
      <div style={{
        position: 'relative', width: STRIP_ICON_W, height: STRIP_ICON_H, flexShrink: 0,
        borderRadius: 2,
        outline: active ? '1px solid rgba(255,255,255,0.55)' : '1px solid transparent',
        transition: 'outline-color 150ms ease',
      }}>
        <svg width={STRIP_ICON_W} height={STRIP_ICON_H} viewBox={`0 0 ${STRIP_ICON_W} ${STRIP_ICON_H}`} style={{ display: 'block' }}>
          <polygon
            points={`0,0 ${fw},0 ${STRIP_ICON_W},${fh} ${STRIP_ICON_W},${STRIP_ICON_H} 0,${STRIP_ICON_H}`}
            style={{ fill: active ? 'rgba(68,68,68,0.95)' : 'rgba(30,30,30,0.88)', transition: 'fill 150ms ease' }}
          />
          <polyline points={`${fw},0 ${fw},${fh} ${STRIP_ICON_W},${fh}`} fill="none" strokeWidth={0.8}
            style={{ stroke: active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.18)', transition: 'stroke 150ms ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', bottom: 3, left: 3, right: 2, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'var(--font-roboto, sans-serif)', fontSize: STRIP_TEXT_ABBR, fontWeight: 700, lineHeight: 1.15, color: active ? 'white' : 'rgba(255,255,255,0.65)', letterSpacing: '0.3px', whiteSpace: 'nowrap', transition: 'color 150ms ease' }}>{abbr}</div>
          <div style={{ fontFamily: 'var(--font-roboto, sans-serif)', fontSize: STRIP_TEXT_ID, fontWeight: 400, lineHeight: 1.15, color: active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', transition: 'color 150ms ease' }}>{id}</div>
        </div>
      </div>
    );
  }

  // White (project) style — active = fully opaque white + outline; inactive = slightly dimmed
  return (
    <div style={{
      position: 'relative', width: STRIP_ICON_W, height: STRIP_ICON_H, flexShrink: 0,
      borderRadius: 2,
      outline: active ? '1px solid rgba(255,255,255,0.70)' : '1px solid transparent',
      transition: 'outline-color 150ms ease',
    }}>
      <svg width={STRIP_ICON_W} height={STRIP_ICON_H} viewBox={`0 0 ${STRIP_ICON_W} ${STRIP_ICON_H}`} style={{ display: 'block' }}>
        <polygon
          points={`0,0 ${fw},0 ${STRIP_ICON_W},${fh} ${STRIP_ICON_W},${STRIP_ICON_H} 0,${STRIP_ICON_H}`}
          style={{ fill: active ? 'white' : 'rgba(255,255,255,0.65)', transition: 'fill 150ms ease' }}
        />
        <polyline points={`${fw},0 ${fw},${fh} ${STRIP_ICON_W},${fh}`} fill="none" strokeWidth={0.8}
          style={{ stroke: 'rgba(0,0,0,0.12)' }}
        />
      </svg>
      <div style={{ position: 'absolute', bottom: 3, left: 3, right: 2, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'var(--font-roboto, sans-serif)', fontSize: STRIP_TEXT_ABBR, fontWeight: 700, lineHeight: 1.15, color: active ? '#1a1a1a' : 'rgba(0,0,0,0.52)', letterSpacing: '0.3px', whiteSpace: 'nowrap', transition: 'color 150ms ease' }}>{abbr}</div>
        <div style={{ fontFamily: 'var(--font-roboto, sans-serif)', fontSize: STRIP_TEXT_ID, fontWeight: 400, lineHeight: 1.15, color: active ? '#3a3a3a' : 'rgba(0,0,0,0.40)', whiteSpace: 'nowrap', transition: 'color 150ms ease' }}>{id}</div>
      </div>
    </div>
  );
}


// ── Debug helpers ───────────────────────────────────────────────────────────────
function catContribs(p: ProjectEntry, rv: Record<string, number>) {
  return Object.entries(p.categoryScores as Record<string, number>)
    .map(([key, ps]) => ({
      key,
      label:   CAT_META[key]?.label ?? key,
      abbr:    CAT_META[key]?.abbr  ?? key,
      rv:      rv[key] ?? 0,
      ps,
      contrib: (rv[key] ?? 0) * ps / 100,
    }))
    .filter(c => c.contrib > 0)
    .sort((a, b) => b.contrib - a.contrib);
}

function debugJustification(
  p: ProjectEntry,
  rank: number,
  selected: ProjectEntry[],
  scores: Record<string, number>,
  rv: Record<string, number>,
): string {
  const myScore = scores[p.id] ?? 0;
  if (rank === 0) return 'Top match — highest combined score';

  const prevScore = scores[selected[rank - 1].id] ?? 0;
  if (myScore === prevScore) return `Tied with #${rank} — order preserved`;

  const gap = prevScore > 0 ? (prevScore - myScore) / prevScore : 0;
  const top2 = catContribs(p, rv).slice(0, 2);
  if (gap <= 0.10) return `Close match — ${top2[0]?.label ?? '—'} drove the score`;
  if (top2.length === 0) return 'Low overall fit';
  if (top2.length === 1) return `Strong in ${top2[0].label}`;
  return `Strong in ${top2[0].label} + ${top2[1].label}`;
}


// ── Component ───────────────────────────────────────────────────────────────────
export default function ProjectCards({
  selectedProjectIds,
  selectedProjectScores = {},
  radarValues           = {},
  activePresetName      = null,
  debugMeta,
  showDebug             = false,
}: Props) {
  const { projects, other } = projectsData;
  const otherEntry  = other?.[0];
  const otherCards: string[] = otherEntry?.cards ?? [];
  const otherId     = (otherEntry as { id?: string } | undefined)?.id ?? 'other';

  const isEmpty = !selectedProjectIds || selectedProjectIds.length === 0;

  const selected: ProjectEntry[] = isEmpty
    ? []
    : (selectedProjectIds ?? [])
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is ProjectEntry => p !== undefined);

  // Build card items + record each project's first card index in one pass
  const projectFirstCardIdx: number[] = [];
  const items: CardItem[] = [];

  for (let pi = 0; pi < selected.length; pi++) {
    projectFirstCardIdx.push(items.length);
    for (let ci = 0; ci < selected[pi].cards.length; ci++) {
      items.push({
        src:              selected[pi].cards[ci],
        alt:              selected[pi].title,
        isFirstOfProject: ci === 0 && pi > 0,
      });
    }
  }
  const otherFirstCardIdx = items.length;
  for (let ci = 0; ci < otherCards.length; ci++) {
    items.push({
      src:              otherCards[ci],
      alt:              'Other work',
      isFirstOfProject: ci === 0 && selected.length > 0,
    });
  }

  // Strip items
  const stripItems: StripItem[] = [
    ...selected.map((p, i) => ({
      id:           p.id,
      abbr:         CAT_ABBR_BY_JSON[p.category] ?? '?',
      firstCardIdx: projectFirstCardIdx[i],
      isOther:      false,
    })),
    ...(otherCards.length > 0
      ? [{ id: otherId, abbr: 'OTH', firstCardIdx: otherFirstCardIdx, isOther: true }]
      : []),
  ];


  // ── State & refs ──────────────────────────────────────────────────────────────
  const [currentIdx,     setCurrentIdx]     = useState(0);
  const [leftBounceKey,  setLeftBounceKey]  = useState(0);
  const [rightBounceKey, setRightBounceKey] = useState(0);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [isMobile,          setIsMobile]          = useState(false);
  const [sectionInView,     setSectionInView]     = useState(false);
  const [leftArrowHovered,  setLeftArrowHovered]  = useState(false);
  const [rightArrowHovered, setRightArrowHovered] = useState(false);

  const sectionRef      = useRef<HTMLElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const currentIdxRef   = useRef(0);
  const itemsLengthRef  = useRef(items.length);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const closeTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { itemsLengthRef.current = items.length; });

  // isMobile — used only for detail popout padding
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Section visibility — gates fixed side arrows
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.intersectionRatio >= 0.98),
      { threshold: 0.98 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const updateIdx = useCallback((idx: number) => {
    setCurrentIdx(idx);
    currentIdxRef.current = idx;
  }, []);

  const selectionKey = (selectedProjectIds ?? []).join(',');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, [selectionKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;
    const onScroll = () => {
      if (container.clientWidth === 0) return;
      const nearest = Math.round(container.scrollLeft / container.clientWidth);
      const clamped = Math.max(0, Math.min(items.length - 1, nearest));
      if (clamped !== currentIdxRef.current) updateIdx(clamped);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [items.length, updateIdx]);

  const snapToCard = useCallback((idx: number) => {
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return;
    const clamped = Math.max(0, Math.min(itemsLengthRef.current - 1, idx));
    updateIdx(clamped);
    container.scrollTo({ left: clamped * container.clientWidth, behavior: 'smooth' });
  }, [updateIdx]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const goPrev = useCallback(() => { setLeftBounceKey(k => k + 1);  snapToCard(currentIdx - 1); }, [snapToCard, currentIdx]);
  const goNext = useCallback(() => { setRightBounceKey(k => k + 1); snapToCard(currentIdx + 1); }, [snapToCard, currentIdx]);

  const showLeft  = !isEmpty && currentIdx > 0;
  const showRight = !isEmpty && currentIdx < items.length - 1;

  const backToChart = () => {
    const el = document.getElementById('project-selection');
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

  // ── Detail / zoom popout ──────────────────────────────────────────────────────
  const openDetail = () => {
    clearTimeout(closeTimerRef.current);
    setDetailOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailVisible(true)));
  };

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    closeTimerRef.current = setTimeout(() => setDetailOpen(false), 150);
  }, []);

  const detailNavTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(itemsLengthRef.current - 1, next));
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
    updateIdx(clamped);
    const container = containerRef.current;
    if (container && container.clientWidth > 0)
      container.scrollTo({ left: clamped * container.clientWidth, behavior: 'instant' });
  }, [updateIdx]);

  // Arrow keys navigate the carousel when the section is in view (and detail is closed)
  useEffect(() => {
    if (isEmpty || detailOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!sectionInView) return;
      if (e.key === 'ArrowLeft')       { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEmpty, detailOpen, sectionInView, goPrev, goNext]);

  useEffect(() => {
    if (!detailOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if      (e.key === 'Escape')     closeDetail();
      else if (e.key === 'ArrowLeft')  detailNavTo(currentIdxRef.current - 1);
      else if (e.key === 'ArrowRight') detailNavTo(currentIdxRef.current + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailOpen, closeDetail, detailNavTo]);

  // Active strip icon — stays on current project while scrolling through its pages
  let currentProjectIdx = 0;
  for (let i = stripItems.length - 1; i >= 0; i--) {
    if (stripItems[i].firstCardIdx <= currentIdx) { currentProjectIdx = i; break; }
  }


  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      id="project-cards"
      style={isEmpty
        ? { minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingLeft: 'var(--page-margin)', paddingRight: 'var(--page-margin)' }
        : { height: '100vh', position: 'relative', overflow: 'hidden' }
      }
    >
      {isEmpty ? (

        <p className="font-sans text-white/30 text-xs uppercase tracking-[0.2em] text-center leading-loose">
          Configure the chart above and press play
          <br />
          to discover projects
        </p>

      ) : (
        <>
          {/* ── Icon strip + back button ──────────────────────────────────── */}
          {/* Layout:
              • ↑ back button — absolute left, vertically centered on the icon row
              • Icon row — horizontally centered in the full width, scrollable on narrow screens
              • Preset label — small text below the icons */}
          <div
            aria-label="Project navigation"
            style={{
              position:      'absolute',
              top:           HEADER_H,
              left:          0,
              right:         0,
              height:        ICON_STRIP_H,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              justifyContent:'center',
              zIndex:        10,
              gap:           4,
            }}
          >
            {/* Row: back button inline just left of the icon strip, both centered together */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 16, paddingRight: 16, maxWidth: '100%', overflow: 'hidden' }}>

              {/* ↑ Back to radar chart */}
              <button
                onClick={backToChart}
                aria-label="Back to radar chart"
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    '4px 6px',
                  color:      backArrowColor,
                  transition: 'color 200ms ease',
                  display:    'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = backArrowHover)}
                onMouseLeave={e => (e.currentTarget.style.color = backArrowColor)}
              >
                <svg
                  width={backArrowSize} height={backArrowSize}
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>

              {/* Scrollable icon strip */}
              <div
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            STRIP_GAP,
                  overflowX:      'auto',
                  scrollbarWidth: 'none',
                  maxWidth:       '100%',
                }}
              >
                {stripItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => snapToCard(item.firstCardIdx)}
                    aria-label={`Jump to ${item.id}`}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
                  >
                    <StripIcon
                      abbr={item.abbr}
                      id={item.id}
                      active={i === currentProjectIdx}
                      isOther={item.isOther}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Preset / selection label — replaces the old breakdown strip comment */}
            <div style={{
              fontFamily:    'var(--font-roboto, sans-serif)',
              fontSize:      7,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.32)',
              userSelect:    'none',
            }}>
              {activePresetName ? `${activePresetName} Preset` : 'Custom Selection'}
            </div>
          </div>

          {/* ── Card carousel ────────────────────────────────────────────── */}
          <div
            ref={containerRef}
            className="cards-scroll"
            style={{
              position:       'absolute',
              top:            TOP_AREA_H,
              left:           0,
              right:          0,
              bottom:         BOTTOM_BAR_H,
              overflowX:      'scroll',
              overflowY:      'hidden',
              display:        'flex',
              scrollSnapType: 'x proximity',
              scrollbarWidth: 'none',
            }}
          >
            {items.map((item) => (
              <div
                key={item.src}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width:          '100%',
                  flexShrink:     0,
                  height:         '100%',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  padding:        `${cardGapTop}px var(--page-margin) ${cardGapBottom}px`,
                  position:       'relative',
                  scrollSnapAlign:'center',
                }}
              >
                {item.isFirstOfProject && (
                  <div style={{
                    position: 'absolute', top: cardGapTop, bottom: cardGapBottom,
                    left: 0, width: 1, background: 'rgba(255,255,255,0.10)',
                  }} />
                )}

                {/* Tap zones: left = prev, center = zoom, right = next */}
                {currentIdx > 0 && (
                  <div onClick={goPrev}
                    style={{ position: 'absolute', inset: 0, width: `${(100 - zoomZoneWidth) / 2}%`, left: 0, cursor: 'w-resize', zIndex: 1 }}
                    aria-hidden="true" />
                )}
                <div onClick={openDetail}
                  style={{ position: 'absolute', inset: 0, left: `${(100 - zoomZoneWidth) / 2}%`, right: `${(100 - zoomZoneWidth) / 2}%`, cursor: 'zoom-in', zIndex: 1 }}
                  aria-hidden="true" />
                {currentIdx < items.length - 1 && (
                  <div onClick={goNext}
                    style={{ position: 'absolute', inset: 0, width: `${(100 - zoomZoneWidth) / 2}%`, right: 0, left: 'auto', cursor: 'e-resize', zIndex: 1 }}
                    aria-hidden="true" />
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src} alt={item.alt}
                  className="img-protected"
                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>

          {/* ── Side navigation arrows (position: fixed, shown when section in view) ─
              Circle drawn as SVG for independent fill / stroke / opacity control.
              All visual properties come from the design variables above.          */}
          {sectionInView && (
            <>
              {/* ◀ Previous */}
              <button
                onClick={goPrev}
                aria-label="Previous project card"
                onMouseEnter={() => setLeftArrowHovered(true)}
                onMouseLeave={() => setLeftArrowHovered(false)}
                style={{
                  position:    'fixed',
                  left:        14,
                  top:         `calc(50% + ${SIDE_ARROW_OFFSET_PX}px)`,
                  transform:   'translateY(-50%)',
                  zIndex:      50,
                  width:       arrowCircleSize,
                  height:      arrowCircleSize,
                  background:  'none',
                  border:      'none',
                  padding:     0,
                  cursor:      'pointer',
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  opacity:     showLeft ? 1 : 0,
                  pointerEvents: showLeft ? 'auto' : 'none',
                  transition:  'opacity 200ms ease',
                }}
              >
                <svg
                  width={_arrowSvgSize} height={_arrowSvgSize}
                  viewBox={`0 0 ${_arrowSvgSize} ${_arrowSvgSize}`}
                  style={{ position: 'absolute', left: -_arrowSvgPad, top: -_arrowSvgPad }}
                  aria-hidden="true"
                >
                  <circle
                    cx={_arrowSvgSize / 2 + arrowCircleOffsetX}
                    cy={_arrowSvgSize / 2 + arrowCircleOffsetY}
                    r={(arrowCircleSize - arrowCircleStrokeWidth) / 2}
                    fill={arrowCircleFillColor}
                    stroke={leftArrowHovered ? 'white' : arrowCircleStrokeColor}
                    strokeOpacity={leftArrowHovered ? 1 : arrowCircleStrokeOpacity}
                    strokeWidth={arrowCircleStrokeWidth}
                    style={{ transition: 'stroke 150ms ease, stroke-opacity 150ms ease' }}
                  />
                </svg>
                <span
                  key={`left-${leftBounceKey}`}
                  style={{
                    position:  'relative',
                    zIndex:    1,
                    fontSize:  navArrowGlyphSize,
                    color:     arrowFillColor,
                    opacity:   arrowFillOpacity,
                    userSelect:'none',
                    lineHeight: 1,
                    animation: leftBounceKey > 0 ? 'nav-bounce-left 300ms ease-out forwards' : 'none',
                  }}
                >◀</span>
              </button>

              {/* ▶ Next */}
              <button
                onClick={goNext}
                aria-label="Next project card"
                onMouseEnter={() => setRightArrowHovered(true)}
                onMouseLeave={() => setRightArrowHovered(false)}
                style={{
                  position:    'fixed',
                  right:       14,
                  top:         `calc(50% + ${SIDE_ARROW_OFFSET_PX}px)`,
                  transform:   'translateY(-50%)',
                  zIndex:      50,
                  width:       arrowCircleSize,
                  height:      arrowCircleSize,
                  background:  'none',
                  border:      'none',
                  padding:     0,
                  cursor:      'pointer',
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  opacity:     showRight ? 1 : 0,
                  pointerEvents: showRight ? 'auto' : 'none',
                  transition:  'opacity 200ms ease',
                }}
              >
                <svg
                  width={_arrowSvgSize} height={_arrowSvgSize}
                  viewBox={`0 0 ${_arrowSvgSize} ${_arrowSvgSize}`}
                  style={{ position: 'absolute', left: -_arrowSvgPad, top: -_arrowSvgPad }}
                  aria-hidden="true"
                >
                  <circle
                    cx={_arrowSvgSize / 2 - arrowCircleOffsetX}
                    cy={_arrowSvgSize / 2 + arrowCircleOffsetY}
                    r={(arrowCircleSize - arrowCircleStrokeWidth) / 2}
                    fill={arrowCircleFillColor}
                    stroke={rightArrowHovered ? 'white' : arrowCircleStrokeColor}
                    strokeOpacity={rightArrowHovered ? 1 : arrowCircleStrokeOpacity}
                    strokeWidth={arrowCircleStrokeWidth}
                    style={{ transition: 'stroke 150ms ease, stroke-opacity 150ms ease' }}
                  />
                </svg>
                <span
                  key={`right-${rightBounceKey}`}
                  style={{
                    position:  'relative',
                    zIndex:    1,
                    fontSize:  navArrowGlyphSize,
                    color:     arrowFillColor,
                    opacity:   arrowFillOpacity,
                    userSelect:'none',
                    lineHeight: 1,
                    animation: rightBounceKey > 0 ? 'nav-bounce-right 300ms ease-out forwards' : 'none',
                  }}
                >▶</span>
              </button>
            </>
          )}

          {/* ── Bottom bar — progress indicator only ─────────────────────── */}
          <div
            style={{
              position:       'absolute',
              bottom:         0,
              left:           0,
              right:          0,
              height:         BOTTOM_BAR_H,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <span style={{
              fontFamily:    'var(--font-roboto, sans-serif)',
              fontSize:      10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.38)',
              userSelect:    'none',
            }}>
              {currentIdx + 1} / {items.length}
            </span>
          </div>
        </>
      )}

      {/* ── Detail / zoom popout ─────────────────────────────────────────── */}
      {detailOpen && items[currentIdx] && (
        <div
          ref={detailScrollRef}
          onClick={closeDetail}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     500,
            background: 'rgba(0,0,0,0.85)',
            cursor:     'zoom-out',
            opacity:    detailVisible ? 1 : 0,
            transition: detailVisible ? 'opacity 200ms ease' : 'opacity 150ms ease',
            overflowY:  'auto',
            padding:    isMobile ? '60px 8px 8px' : '60px 20px 20px',
            boxSizing:  'border-box',
          }}
        >
          <div style={{ position: 'relative' }} onContextMenu={(e) => e.preventDefault()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[currentIdx].src} alt={items[currentIdx].alt}
              className="img-protected"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {currentIdx > 0 && (
              <div
                onClick={e => { e.stopPropagation(); detailNavTo(currentIdxRef.current - 1); }}
                style={{ position: 'absolute', inset: 0, width: '33%', left: 0, cursor: 'w-resize', zIndex: 1 }}
                aria-hidden="true"
              />
            )}
            {currentIdx < items.length - 1 && (
              <div
                onClick={e => { e.stopPropagation(); detailNavTo(currentIdxRef.current + 1); }}
                style={{ position: 'absolute', inset: 0, width: '33%', right: 0, left: 'auto', cursor: 'e-resize', zIndex: 1 }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Debug overlay ─────────────────────────────────────────────────── */}
      {showDebug && (
        <div style={{
          position:      'absolute',
          top:           HEADER_H + 8,
          right:         8,
          zIndex:        200,
          background:    'rgba(0,0,0,0.82)',
          color:         '#fff',
          fontFamily:    'monospace',
          fontSize:      10.5,
          lineHeight:    1.55,
          padding:       '8px 12px',
          borderRadius:  4,
          maxWidth:      480,
          pointerEvents: 'none',
          backdropFilter:'blur(4px)',
        }}>
          <div style={{ color: '#facc15', marginBottom: 4, fontWeight: 'bold' }}>◉ DEBUG: ProjectCards</div>

          {/* ── Category breakdown (moved from bottom bar) */}
          <div style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)', marginBottom: 3 }}>
              Work Selection Category Breakdown
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.06em', color: breakdownValuesColor }}>
              {BREAKDOWN_CATS.map((cat, i) => (
                <span key={cat.key}>
                  {i > 0 && <span style={{ color: breakdownSepColor, margin: '0 5px' }}>|</span>}
                  <span style={{ color: breakdownAbbrColor }}>{cat.abbr}=</span>
                  <span>{radarValues[cat.key] ?? 0}%</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
              {activePresetName ? `(${activePresetName} preset selected)` : '(Custom work selection)'}
            </div>
          </div>

          <div>Pl=Places | UO= User-Oriented | PR= PublicRealm | DD=Data-Driven | Str=Strategy | Int=Interactive</div>
          <div style={{ marginBottom: 4 }}>Selected: <b>{selected.length}</b></div>

          {debugMeta && (
            <div style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 9.5 }}>
              <div style={{ color: '#60a5fa' }}>
                Dominant (≥{debugMeta.dominanceThreshold}%):&nbsp;
                {debugMeta.dominantCategoryKeys.length > 0
                  ? debugMeta.dominantCategoryKeys.map(k => CAT_META[k]?.abbr ?? k).join(', ')
                  : '—'}
              </div>
              {debugMeta.singleDominantKey && (
                <div style={{ color: '#a78bfa' }}>
                  Single-dominant: {CAT_META[debugMeta.singleDominantKey]?.label ?? debugMeta.singleDominantKey} → category-first sort active
                </div>
              )}
              {debugMeta.presetBoostedIds.length > 0 && (
                <div style={{ color: '#fb923c' }}>
                  Preset-boosted: {debugMeta.presetBoostedIds.join(', ')}
                </div>
              )}
            </div>
          )}

          {selected.length === 0 ? (
            <div style={{ color: '#6b7280' }}>— none —</div>
          ) : (
            selected.map((p, rank) => {
              const score      = selectedProjectScores[p.id] ?? 0;
              const priority   = (p as ProjectEntry & { priority?: number }).priority ?? 0;
              const titleShort = p.title.slice(0, 6);
              const hasRadar   = Object.keys(radarValues).length > 0;
              const contribs   = hasRadar ? catContribs(p, radarValues) : [];
              const justification = hasRadar
                ? debugJustification(p, rank, selected, selectedProjectScores, radarValues)
                : null;
              const domBonus        = debugMeta?.domBonusMap[p.id] ?? 0;
              const isPresetBoosted = debugMeta?.presetBoostedIds.includes(p.id) ?? false;

              return (
                <div key={p.id} style={{ marginTop: rank > 0 ? 6 : 0, paddingTop: rank > 0 ? 6 : 0, borderTop: rank > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'baseline' }}>
                    {isPresetBoosted && <span style={{ color: '#fb923c' }}>[PRESET]</span>}
                    <span style={{ color: '#6b7280' }}>#{rank + 1}</span>
                    <span style={{ color: '#e5e7eb' }}>{p.id}</span>
                    <span style={{ color: '#9ca3af' }}>({titleShort}…)</span>
                    <span style={{ color: '#86efac' }}>Score: {score.toFixed(0)}</span>
                    {priority > 0 && <span style={{ color: '#fbbf24' }}>Priority: +{priority}</span>}
                    {domBonus > 0 && <span style={{ color: '#60a5fa' }}>Dom: +{domBonus.toFixed(0)}</span>}
                  </div>
                  {contribs.length > 0 && (
                    <div style={{ color: '#4b5563', fontSize: 9.5, marginTop: 1 }}>
                      {contribs.slice(0, 4).map(c => (
                        <span key={c.key} style={{ marginRight: 7 }}>{c.abbr}:{c.rv}×{c.ps}={c.contrib.toFixed(0)}</span>
                      ))}
                    </div>
                  )}
                  {p.category && <div style={{ color: '#4b5563', fontSize: 9.5 }}>Category: {p.category}</div>}
                  {(justification || isPresetBoosted) && (
                    <div style={{ color: '#9ca3af', fontSize: 9.5, marginTop: 1 }}>
                      →{isPresetBoosted && <span style={{ color: '#fb923c', marginRight: 4 }}> PRESET SELECT</span>}{justification && ` ${justification}`}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 6, color: '#6b7280' }}>
            &quot;Other&quot; appended:{' '}
            <span style={{ color: otherCards.length > 0 ? '#86efac' : '#f87171' }}>
              {otherCards.length > 0 ? `yes — ${otherCards.length} card${otherCards.length !== 1 ? 's' : ''}` : 'no'}
            </span>
          </div>
        </div>
      )}

    </section>
  );
}
