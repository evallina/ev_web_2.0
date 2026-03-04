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
const backArrowHover   = 'rgba(255,255,255,0.50)';  // color — hover color of the ↑ arrow
// └─────────────────────────────────────────────────────────────────────────────┘

// ── Internal layout constants (tied to page structure, not meant to be tweaked) ──
const HEADER_H     = 48;  // px — height of the fixed header (set in layout.tsx)
const SIDE_MARGIN  = 40;  // px — matches the px-10 side margins of all other sections
const BOTTOM_NAV_H = 60;  // px — height of the bottom navigation bar

// ── Types ─────────────────────────────────────────────────────────────────────
type ProjectEntry = (typeof projectsData.projects)[number];

interface CardItem {
  src: string;
  alt: string;
  isFirstOfProject: boolean;
}

interface Props {
  selectedProjectIds?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProjectCards({ selectedProjectIds }: Props) {
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

  const containerRef  = useRef<HTMLDivElement>(null);
  const currentIdxRef = useRef(0);

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
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    updateIdx(clamped);
    container.scrollTo({ left: clamped * container.clientWidth, behavior: 'smooth' });
  }, [items.length, updateIdx]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = () => { setLeftBounceKey(k => k + 1);  snapToCard(currentIdx - 1); };
  const goNext = () => { setRightBounceKey(k => k + 1); snapToCard(currentIdx + 1); };

  const showLeft  = !isEmpty && currentIdx > 0;
  const showRight = !isEmpty && currentIdx < items.length - 1;

  const backToChart = () => {
    const el = document.getElementById('project-selection');
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

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
        ? { minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
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
              bottom: BOTTOM_NAV_H,
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

                {/* Invisible tap zones: left half → previous card, right half → next card.
                    Also trigger the bottom arrow bounce animation for visual feedback. */}
                {currentIdx > 0 && (
                  <div
                    onClick={goPrev}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '50%', left: 0,
                      cursor: 'w-resize',
                      zIndex: 1,
                    }}
                    aria-hidden="true"
                  />
                )}
                {currentIdx < items.length - 1 && (
                  <div
                    onClick={goNext}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '50%', right: 0, left: 'auto',
                      cursor: 'e-resize',
                      zIndex: 1,
                    }}
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
            Bottom navigation bar — three buttons centered in one row:
            ◀ Previous  |  ↑ Back to chart  |  Next ▶
          */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: BOTTOM_NAV_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
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
          </div>
        </>
      )}
    </section>
  );
}
