'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import projectsData from '@/src/data/projects.json';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  DESIGN VARIABLES — edit these to tune the feel of the section             │
// ├─────────────────────────────────────────────────────────────────────────────┤
const cardGapTop       =  20;                       // px    — dark space above the card image
const cardGapBottom    =  20;                       // px    — dark space below the card image
const navArrowSize     =  20;                       // px    — font size of the ◀ / ▶ arrows
const navArrowColor    = 'rgba(255,255,255,0.60)';  // color — resting color of the ◀ / ▶ arrows
const backArrowSize    =  30;                       // px    — font size of the ↑ back-to-chart arrow
const backArrowColor   = 'rgba(255,255,255,0.60)';  // color — resting color of the ↑ arrow
const backArrowHover        = 'rgba(255,255,255,0.50)';  // color — hover color of the ↑ arrow
// ── Breakdown strip
const breakdownTitleColor   = 'rgba(255,255,255,0.60)';  // color — "Work Selection Category Breakdown" label
const breakdownValuesColor  = 'rgba(255,255,255,0.80)';  // color — category values (e.g. "70%")
const breakdownAbbrColor    = 'rgba(255,255,255,0.40)';  // color — abbreviation labels (e.g. "Pl=")
const breakdownSepColor     = 'rgba(255,255,255,0.40)';  // color — pipe separators between values
const breakdownCommentColor = 'rgba(255,255,255,0.40)';  // color — comment line (preset / custom)
// ── Tap zones
const zoomZoneWidth = 20; // % — width of the center zoom zone (nav zones share the remaining space equally)
// └─────────────────────────────────────────────────────────────────────────────┘


// ── Internal layout constants (tied to page structure, not meant to be tweaked) ──
const HEADER_H     = 48;  // px — height of the fixed header (set in layout.tsx)
const SIDE_MARGIN  = 40;  // px — matches the px-10 side margins of all other sections
const BOTTOM_NAV_H = 60;  // px — height of the arrow navigation row
const BREAKDOWN_H  = 40;  // px — height of the work-selection breakdown strip above nav
const BOTTOM_BAR_H = BOTTOM_NAV_H + BREAKDOWN_H; // px — total bottom bar height

// ── Types ─────────────────────────────────────────────────────────────────────
type ProjectEntry = (typeof projectsData.projects)[number];

interface CardItem {
  src: string;
  alt: string;
  isFirstOfProject: boolean;
}

// ── Debug algorithm metadata (computed in page.tsx, displayed here) ──────────
export interface DebugMeta {
  dominantCategoryKeys: string[];   // radar keys ≥ DOMINANCE_THRESHOLD
  singleDominantKey:    string | null;
  presetBoostedIds:     string[];
  domBonusMap:          Record<string, number>;
  dominanceThreshold:   number;
}

interface Props {
  selectedProjectIds?:    string[];
  selectedProjectScores?: Record<string, number>;
  radarValues?:           Record<string, number>;
  activePresetName?:      string | null;
  debugMeta?:             DebugMeta;
  showDebug?:             boolean;
}

// Category display order and abbreviations for the breakdown strip
const BREAKDOWN_CATS = [
  { key: 'places',        abbr: 'Pl'  },
  { key: 'userOriented',  abbr: 'UO'  },
  { key: 'publicRealm',   abbr: 'PR'  },
  { key: 'dataDriven',    abbr: 'DD'  },
  { key: 'strategy',      abbr: 'Str' },
  { key: 'interactivity', abbr: 'Int' },
] as const;

// ── Debug helpers ──────────────────────────────────────────────────────────────
const CAT_META: Record<string, { label: string; abbr: string }> = {
  interactivity: { label: 'Interactivity', abbr: 'Int' },
  publicRealm:   { label: 'Public Realm',  abbr: 'PR'  },
  userOriented:  { label: 'User-Oriented', abbr: 'UO'  },
  dataDriven:    { label: 'Data-Driven',   abbr: 'DD'  },
  strategy:      { label: 'Strategy',      abbr: 'Str' },
  places:        { label: 'Places',        abbr: 'Pl'  },
};

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
  if (gap <= 0.10) {
    const topLabel = top2[0]?.label ?? '—';
    return `Close match — ${topLabel} drove the score`;
  }
  if (top2.length === 0) return 'Low overall fit';
  if (top2.length === 1) return `Strong in ${top2[0].label}`;
  return `Strong in ${top2[0].label} + ${top2[1].label}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProjectCards({ selectedProjectIds, selectedProjectScores = {}, radarValues = {}, activePresetName = null, debugMeta, showDebug = false }: Props) {
  const { projects, other } = projectsData;
  const otherCards: string[] = other?.[0]?.cards ?? [];

  const isEmpty = !selectedProjectIds || selectedProjectIds.length === 0;

  const selected: ProjectEntry[] = isEmpty
    ? []
    : (selectedProjectIds ?? [])
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is ProjectEntry => p !== undefined);

  const items: CardItem[] = [];
  for (let pi = 0; pi < selected.length; pi++) {
    for (let ci = 0; ci < selected[pi].cards.length; ci++) {
      items.push({
        src: selected[pi].cards[ci],
        alt: selected[pi].title,
        isFirstOfProject: ci === 0 && pi > 0,
      });
    }
  }
  for (let ci = 0; ci < otherCards.length; ci++) {
    items.push({
      src: otherCards[ci],
      alt: 'Other work',
      isFirstOfProject: ci === 0 && selected.length > 0,
    });
  }

  // ── State & refs ──────────────────────────────────────────────────────────
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [leftBounceKey, setLeftBounceKey] = useState(0);
  const [rightBounceKey,setRightBounceKey]= useState(0);
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const containerRef   = useRef<HTMLDivElement>(null);
  const currentIdxRef  = useRef(0);
  const itemsLengthRef = useRef(items.length);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const closeTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { itemsLengthRef.current = items.length; });

  const updateIdx = useCallback((idx: number) => {
    setCurrentIdx(idx);
    currentIdxRef.current = idx;
  }, []);

  // Reset to first card whenever the project selection changes
  const selectionKey = (selectedProjectIds ?? []).join(',');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, [selectionKey]);

  // ── Track current card from scroll position ────────────────────────────────
  // CSS snap handles the actual snapping; this listener just keeps currentIdx
  // in sync so the navigation arrows show/hide correctly.
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

  // ── Programmatic scroll — used by the navigation arrows ───────────────────
  // scrollTo({ behavior: 'smooth' }) animates to the exact snap point;
  // CSS proximity snap then locks it in.
  const snapToCard = useCallback((idx: number) => {
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return;
    const clamped = Math.max(0, Math.min(itemsLengthRef.current - 1, idx));
    updateIdx(clamped);
    container.scrollTo({ left: clamped * container.clientWidth, behavior: 'smooth' });
  }, [updateIdx]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = () => { setLeftBounceKey(k => k + 1);  snapToCard(currentIdx - 1); };
  const goNext = () => { setRightBounceKey(k => k + 1); snapToCard(currentIdx + 1); };

  const showLeft  = !isEmpty && currentIdx > 0;
  const showRight = !isEmpty && currentIdx < items.length - 1;

  const backToChart = () => {
    const el = document.getElementById('project-selection');
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

  // ── Detail / zoom popout ───────────────────────────────────────────────────
  const openDetail = () => {
    clearTimeout(closeTimerRef.current);
    setDetailOpen(true);
    // Double rAF ensures the element is mounted before the transition starts
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailVisible(true)));
  };

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    closeTimerRef.current = setTimeout(() => setDetailOpen(false), 150);
  }, []);

  // Navigate within the detail view: reset scroll, update index, sync carousel
  const detailNavTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(itemsLengthRef.current - 1, next));
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
    updateIdx(clamped);
    const container = containerRef.current;
    if (container && container.clientWidth > 0)
      container.scrollTo({ left: clamped * container.clientWidth, behavior: 'instant' });
  }, [updateIdx]);

  // Keyboard handler while detail view is open
  useEffect(() => {
    if (!detailOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if      (e.key === 'Escape')      closeDetail();
      else if (e.key === 'ArrowLeft')   detailNavTo(currentIdxRef.current - 1);
      else if (e.key === 'ArrowRight')  detailNavTo(currentIdxRef.current + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailOpen, closeDetail, detailNavTo]);

  // ── Shared nav button base styles ─────────────────────────────────────────
  const navArrowBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 10,
    color: navArrowColor,
    transition: 'opacity 300ms ease',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      id="project-cards"
      style={isEmpty
        ? { minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }
        : { height: '100vh', position: 'relative', overflow: 'hidden' }
      }
      className={isEmpty ? 'px-10' : undefined}
    >
      {isEmpty ? (

        <p className="font-sans text-white/30 text-xs uppercase tracking-[0.2em] text-center leading-loose">
          Configure the chart above and press play
          <br />
          to discover projects
        </p>

      ) : (
        <>
          {/*
            Horizontal scroll container — sits between the fixed header (top)
            and the bottom navigation bar (bottom).
            • overflow-x: scroll  → horizontal card carousel
            • overflow-y: hidden  → vertical wheel events bubble to main page
            • scroll-snap-type: x proximity → browser handles snap naturally,
              not too aggressive (proximity, not mandatory)
            Scrollbar hidden via .cards-scroll in globals.css
          */}
          <div
            ref={containerRef}
            className="cards-scroll"
            style={{
              position: 'absolute',
              top: HEADER_H,
              left: 0,
              right: 0,
              bottom: BOTTOM_BAR_H,
              overflowX: 'scroll',
              overflowY: 'hidden',
              display: 'flex',
              scrollSnapType: 'x proximity',
              scrollbarWidth: 'none',
            }}
          >
            {items.map((item) => (
              <div
                key={item.src}
                style={{
                  width: '100%',       // = container clientWidth (not 100vw to avoid scrollbar offset)
                  flexShrink: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: `${cardGapTop}px ${SIDE_MARGIN}px ${cardGapBottom}px`,
                  position: 'relative',
                  scrollSnapAlign: 'center',
                }}
              >
                {/* Subtle vertical separator to the left of the first card of each new project */}
                {item.isFirstOfProject && (
                  <div style={{
                    position: 'absolute',
                    top: cardGapTop,
                    bottom: cardGapBottom,
                    left: 0,
                    width: 1,
                    background: 'rgba(255,255,255,0.10)',
                  }} />
                )}

                {/* Three tap zones: nav zones share space outside the center zoom zone */}
                {currentIdx > 0 && (
                  <div
                    onClick={goPrev}
                    style={{ position: 'absolute', inset: 0, width: `${(100 - zoomZoneWidth) / 2}%`, left: 0, cursor: 'w-resize', zIndex: 1 }}
                    aria-hidden="true"
                  />
                )}
                <div
                  onClick={openDetail}
                  style={{ position: 'absolute', inset: 0, left: `${(100 - zoomZoneWidth) / 2}%`, right: `${(100 - zoomZoneWidth) / 2}%`, cursor: 'zoom-in', zIndex: 1 }}
                  aria-hidden="true"
                />
                {currentIdx < items.length - 1 && (
                  <div
                    onClick={goNext}
                    style={{ position: 'absolute', inset: 0, width: `${(100 - zoomZoneWidth) / 2}%`, right: 0, left: 'auto', cursor: 'e-resize', zIndex: 1 }}
                    aria-hidden="true"
                  />
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              </div>
            ))}
          </div>

          {/*
            Bottom bar — two rows stacked:
              1. Work-selection category breakdown strip
              2. ◀ Previous  |  ↑ Back to chart  |  Next ▶
          */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: BOTTOM_BAR_H,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ── Breakdown strip ────────────────────────────────── */}
            <div style={{ height: BREAKDOWN_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <div style={{ fontFamily: 'var(--font-sans, sans-serif)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: breakdownTitleColor }}>
                Work Selection Category Breakdown
              </div>
              <div style={{ fontFamily: 'var(--font-sans, sans-serif)', fontSize: 9, letterSpacing: '0.08em', color: breakdownValuesColor }}>
                {BREAKDOWN_CATS.map((cat, i) => (
                  <span key={cat.key}>
                    {i > 0 && <span style={{ color: breakdownSepColor, margin: '0 5px' }}>|</span>}
                    <span style={{ color: breakdownAbbrColor }}>{cat.abbr}=</span>
                    <span>{radarValues[cat.key] ?? 0}%</span>
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: 'var(--font-sans, sans-serif)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: breakdownCommentColor }}>
                {activePresetName ? `(${activePresetName} preset selected)` : '(Custom work selection)'}
              </div>
            </div>

            {/* ── Arrow navigation row ────────────────────────────── */}
            <div style={{ height: BOTTOM_NAV_H, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {/* ◀ Previous card */}
            <button
              onClick={goPrev}
              aria-label="Previous project card"
              style={{
                ...navArrowBase,
                opacity: showLeft ? 1 : 0,
                pointerEvents: showLeft ? 'auto' : 'none',
              }}
            >
              <span
                key={`left-${leftBounceKey}`}
                style={{
                  display: 'block', fontSize: navArrowSize, lineHeight: 1, userSelect: 'none',
                  animation: leftBounceKey > 0 ? 'nav-bounce-left 300ms ease-out forwards' : 'none',
                }}
              >◀</span>
            </button>

            {/* ↑ Back to radar chart */}
            <button
              onClick={backToChart}
              aria-label="Back to radar chart"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 10,
                color: backArrowColor,
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = backArrowHover)}
              onMouseLeave={e => (e.currentTarget.style.color = backArrowColor)}
            >
              <svg
              width={backArrowSize}
              height={backArrowSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg> 
              {/*<span style={{ display: 'block', fontSize: backArrowSize, lineHeight: 1, userSelect: 'none' }}>⌃</span>*/}
            </button>

            {/* ▶ Next card */}
            <button
              onClick={goNext}
              aria-label="Next project card"
              style={{
                ...navArrowBase,
                opacity: showRight ? 1 : 0,
                pointerEvents: showRight ? 'auto' : 'none',
              }}
            >
              <span
                key={`right-${rightBounceKey}`}
                style={{
                  display: 'block', fontSize: navArrowSize, lineHeight: 1, userSelect: 'none',
                  animation: rightBounceKey > 0 ? 'nav-bounce-right 300ms ease-out forwards' : 'none',
                }}
              >▶</span>
            </button>
            </div>{/* end arrow row */}
          </div>{/* end bottom bar */}
        </>
      )}

      {/* ── Detail / zoom popout ─────────────────────────────────────────── */}
      {detailOpen && items[currentIdx] && (
        <div
          ref={detailScrollRef}
          onClick={closeDetail}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(0,0,0,0.85)',
            cursor: 'zoom-out',
            opacity: detailVisible ? 1 : 0,
            transition: detailVisible ? 'opacity 200ms ease' : 'opacity 150ms ease',
            overflowY: 'auto',
            padding: '60px 20px 20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Image wrapper — relative so tap zones can be absolute over the image */}
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[currentIdx].src}
              alt={items[currentIdx].alt}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {/* Left third — previous card (stop propagation so backdrop doesn't close) */}
            {currentIdx > 0 && (
              <div
                onClick={e => { e.stopPropagation(); detailNavTo(currentIdxRef.current - 1); }}
                style={{ position: 'absolute', inset: 0, width: '33%', left: 0, cursor: 'w-resize', zIndex: 1 }}
                aria-hidden="true"
              />
            )}
            {/* Right third — next card */}
            {currentIdx < items.length - 1 && (
              <div
                onClick={e => { e.stopPropagation(); detailNavTo(currentIdxRef.current + 1); }}
                style={{ position: 'absolute', inset: 0, width: '33%', right: 0, left: 'auto', cursor: 'e-resize', zIndex: 1 }}
                aria-hidden="true"
              />
            )}
            {/* Center third — lets click bubble up to backdrop → closes modal */}
          </div>
        </div>
      )}

      {/* ── Debug overlay ─────────────────────────────────────────────── */}
      {showDebug && (
        <div style={{
          position: 'absolute',
          top: HEADER_H + 8,
          right: 8,
          zIndex: 200,
          background: 'rgba(0,0,0,0.82)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 10.5,
          lineHeight: 1.55,
          padding: '8px 12px',
          borderRadius: 4,
          maxWidth: 480,
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ color: '#facc15', marginBottom: 4, fontWeight: 'bold' }}>◉ DEBUG: ProjectCards</div>
          <div>Pl=Places | UO= User-Oriented | PR= PublicRealm | DD=Data-Driven | Str=Strategy | Int=Interactive</div>
          <div style={{ marginBottom: 4 }}>Selected: <b>{selected.length}</b></div>

          {/* ── Algorithm summary ──────────────────────────────── */}
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
              const score    = selectedProjectScores[p.id] ?? 0;
              const priority = (p as ProjectEntry & { priority?: number }).priority ?? 0;
              const titleShort = p.title.slice(0, 6);
              const hasRadar = Object.keys(radarValues).length > 0;
              const contribs = hasRadar ? catContribs(p, radarValues) : [];
              const justification = hasRadar
                ? debugJustification(p, rank, selected, selectedProjectScores, radarValues)
                : null;
              const domBonus = debugMeta?.domBonusMap[p.id] ?? 0;
              const isPresetBoosted = debugMeta?.presetBoostedIds.includes(p.id) ?? false;

              return (
                <div
                  key={p.id}
                  style={{
                    marginTop: rank > 0 ? 6 : 0,
                    paddingTop: rank > 0 ? 6 : 0,
                    borderTop: rank > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                  }}
                >
                  {/* Header row: rank · id · short title · score · priority · bonuses */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'baseline' }}>
                    {isPresetBoosted && <span style={{ color: '#fb923c' }}>[PRESET]</span>}
                    <span style={{ color: '#6b7280' }}>#{rank + 1}</span>
                    <span style={{ color: '#e5e7eb' }}>{p.id}</span>
                    <span style={{ color: '#9ca3af' }}>({titleShort}…)</span>
                    <span style={{ color: '#86efac' }}>Score: {score.toFixed(0)}</span>
                    {priority > 0 && (
                      <span style={{ color: '#fbbf24' }}>Priority: +{priority}</span>
                    )}
                    {domBonus > 0 && (
                      <span style={{ color: '#60a5fa' }}>Dom: +{domBonus.toFixed(0)}</span>
                    )}
                  </div>

                  {/* Category contributions */}
                  {contribs.length > 0 && (
                    <div style={{ color: '#4b5563', fontSize: 9.5, marginTop: 1 }}>
                      {contribs.slice(0, 4).map(c => (
                        <span key={c.key} style={{ marginRight: 7 }}>
                          {c.abbr}:{c.rv}×{c.ps}={c.contrib.toFixed(0)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Primary category label */}
                  {p.category && (
                    <div style={{ color: '#4b5563', fontSize: 9.5 }}>
                      Category: {p.category}
                    </div>
                  )}

                  {/* Position justification */}
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
