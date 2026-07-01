'use client';

import { useEffect, useState } from 'react';
import doorwaysData from '@/src/data/doorways.json';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURABLE VARIABLES
// ════════════════════════════════════════════════════════════════════════════

// ── Typography (adjust these to tune title sizes) ──────────────────────
const TITLE_FONT_SIZE = 'clamp(1.8rem, 2.8vw, 2.8rem)';  // all cards same size — was clamp(1.4rem, 2.2vw, 2.2rem)
// ↑ Adjust this to change all card title sizes. Format: clamp(min, preferred, max)

// ── Grid ──
const GRID_GAP          = 12;         // px — gutter between cards
const GRID_ASPECT_RATIO = '16 / 9';   // desktop grid aspect ratio
const GRID_MAX_HEIGHT   = '77vh';     // leaves room for the nav links + gaps so the whole section fits one viewport
const MOBILE_BREAKPOINT = 750;        // px — switch to stacked single-column layout

// ── Overlay (darkens image) ──
const OVERLAY_DEFAULT = 'rgba(0, 0, 0, 0.55)';
const OVERLAY_REVEAL  = 'rgba(0, 0, 0, 0.70)';  // darker on hover reveal

// ── Image / reveal effects ──
const HOVER_SCALE     = 1.05;       // image zoom on hover reveal
const REVEAL_BLUR     = 6;          // px — image blur on hover reveal
const ZOOM_TRANSITION = '600ms ease';
const FADE_DURATION   = '400ms';    // overlay / filter fades
const TYPE_SPEED      = 10;         // ms per character for the description typewriter

// ── Layout ──
const CARD_CONTENT_PADDING   = 30;        // px — padding from card edge for title + description
const SECTION_PADDING_TOP    = 70;        // px — clears the ~48px sticky header with breathing room
const SECTION_PADDING_BOTTOM = 50;        // px — gap below the WORK SELECTION link
const GRID_NAV_GAP           = 15;        // px — vertical space between the grid and the top/bottom nav links
const SOLID_DARK             = '#1c1c1d'; // fallback background (no image)

// ════════════════════════════════════════════════════════════════════════════
// CARD DATA — content lives in src/data/doorways.json (titles + descriptions)
// ════════════════════════════════════════════════════════════════════════════

type CardType = 'link' | 'preset';

interface DoorwayCard {
  id:            string;
  title:         string;
  description:   string;
  type:          CardType;
  url?:          string;
  presetName?:   string;
  gridArea:      string;
  imagePath:     string;                    // '' → solid dark background
  imagePosition: { x: string; y: string };  // object-position — adjustable per card
}

const CARDS = (doorwaysData.cards as DoorwayCard[]);

// Stacked-layout order (top → bottom) and per-card mobile aspect ratios
const MOBILE_ORDER = ['minerva', 'systems', 'spatial', 'research', 'writing'];
const mobileAspect = (id: string) => (id === 'minerva' ? '16 / 9' : '16 / 10');

// ════════════════════════════════════════════════════════════════════════════
// NAV LINK — matches the site's section nav style (DesignPhilosophy "Works ▼")
// ════════════════════════════════════════════════════════════════════════════

function NavLink({ direction, label, onClick }: { direction: 'up' | 'down'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 cursor-pointer"
      style={{ background: 'none', border: 'none', padding: 0, color: '#1c1c1d', opacity: 0.85, transition: 'opacity 200ms ease' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.6'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; }}
    >
      {direction === 'up'   && <span style={{ lineHeight: 1 }}>▲</span>}
      <span>{label}</span>
      {direction === 'down' && <span style={{ lineHeight: 1 }}>▼</span>}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface DoorwaysProps {
  /** Triggers a preset selection + scroll to the project cards (handled by parent). */
  onPresetSelect: (presetName: string) => void;
  /** Scroll up to the design-philosophy section. */
  onScrollUp:     () => void;
  /** Scroll down to the project-selection (Work Selection) section. */
  onScrollDown:   () => void;
}

export default function Doorways({ onPresetSelect, onScrollUp, onScrollDown }: DoorwaysProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isMobile,  setIsMobile]  = useState(false);
  const [canHover,  setCanHover]  = useState(false);
  const [typed,     setTyped]     = useState('');

  // ── Responsive breakpoint ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Hover-capable pointer detection (reveal is hover-only; touch clicks straight through) ──
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ── Typewriter — types out the hovered card's description one char at a time ──
  const targetText = canHover && hoveredId
    ? (CARDS.find(c => c.id === hoveredId)?.description ?? '')
    : '';
  useEffect(() => {
    if (typed === targetText) return; // fully typed (or nothing to type) → idle
    const t = setTimeout(() => {
      setTyped(prev => {
        const base = targetText.startsWith(prev) ? prev : ''; // restart if the target changed
        return targetText.slice(0, base.length + 1);
      });
    }, TYPE_SPEED);
    return () => clearTimeout(t);
  }, [typed, targetText]);

  // ── Direct navigation on click ──
  const handleActivate = (card: DoorwayCard) => {
    if (card.type === 'preset' && card.presetName) {
      onPresetSelect(card.presetName); // parent applies the preset + scrolls to the project cards
    } else if (card.type === 'link' && card.url) {
      window.open(card.url, '_blank', 'noopener,noreferrer');
    }
    // link with no url (e.g. Writing "coming soon") → non-clickable, no-op
  };

  // ── Render one card (shared between grid & stacked layouts) ──
  const renderCard = (card: DoorwayCard) => {
    const isRevealed = canHover && hoveredId === card.id;
    const clickable  = card.type === 'preset' || (card.type === 'link' && !!card.url);

    const cardStyle: React.CSSProperties = {
      position:       'relative',
      display:        'block',
      overflow:       'hidden',
      borderRadius:   0,
      cursor:         clickable ? 'pointer' : 'default',
      background:     SOLID_DARK,
      textDecoration: 'none',
      color:          'inherit',
      ...(isMobile
        ? { width: '100%', aspectRatio: mobileAspect(card.id) }
        : { gridArea: card.gridArea, minHeight: 0 }),
    };

    const inner = (
      <>
        {/* Image layer (omitted → solid dark shows through) */}
        {card.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imagePath}
            alt=""
            draggable={false}
            style={{
              position:       'absolute',
              inset:          0,
              width:          '100%',
              height:         '100%',
              objectFit:      'cover',
              objectPosition: `${card.imagePosition.x} ${card.imagePosition.y}`,
              filter:         isRevealed ? `grayscale(100%) blur(${REVEAL_BLUR}px)` : 'grayscale(100%)',
              transform:      `scale(${isRevealed ? HOVER_SCALE : 1})`,
              transition:     `transform ${ZOOM_TRANSITION}, filter ${FADE_DURATION} ease`,
              userSelect:     'none',
              WebkitUserDrag: 'none',
              pointerEvents:  'none',
            } as React.CSSProperties}
          />
        )}

        {/* Overlay */}
        <div
          style={{
            position:      'absolute',
            inset:         0,
            background:    isRevealed ? OVERLAY_REVEAL : OVERLAY_DEFAULT,
            transition:    `background ${FADE_DURATION} ease`,
            pointerEvents: 'none',
          }}
        />

        {/* Title (always visible) + typed description (on hover reveal) — anchored top-left */}
        <div
          style={{
            position:       'absolute',
            inset:          0,
            padding:        CARD_CONTENT_PADDING,
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'flex-start',
            alignItems:     'flex-start',
            pointerEvents:  'none',
          }}
        >
          <h3
            style={{
              margin:     0,
              textAlign:  'left',
              fontFamily: 'var(--font-playfair)', // project serif
              fontWeight: 700,
              color:      '#ffffff',
              fontSize:   TITLE_FONT_SIZE,
              lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {card.title}
          </h3>
          <p
            style={{
              margin:     0,
              marginTop:  10,
              textAlign:  'left',
              maxWidth:   '85%',
              minHeight:  '1.45em',
              fontFamily: 'var(--font-roboto)', // project sans
              fontSize:   'clamp(0.75rem, 1vw, 0.9rem)',
              lineHeight: 1.45,
              color:      'rgba(255, 255, 255, 0.9)',
            }}
          >
            {isRevealed ? typed : ''}
            {isRevealed && (
              <span
                aria-hidden="true"
                style={{
                  display:       'inline-block',
                  width:         2,
                  height:        '1em',
                  marginLeft:    2,
                  background:    '#ffffff',
                  verticalAlign: 'text-bottom',
                  animation:     'philosophy-cursor-blink 800ms step-end infinite',
                }}
              />
            )}
          </p>
        </div>
      </>
    );

    const sharedProps = {
      style:        cardStyle,
      onMouseEnter: () => { setHoveredId(card.id); setTyped(''); },
      onMouseLeave: () => { setHoveredId(null); },
      'aria-label': card.title,
    };

    // Link cards → real <a> (new tab, middle-click, etc.). Preset / no-url → div.
    if (card.type === 'link' && card.url) {
      return (
        <a key={card.id} href={card.url} target="_blank" rel="noopener noreferrer" {...sharedProps}>
          {inner}
        </a>
      );
    }
    return (
      <div
        key={card.id}
        {...sharedProps}
        onClick={clickable ? () => handleActivate(card) : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(card); }
        } : undefined}
      >
        {inner}
      </div>
    );
  };

  // ── Grid / stack container ──
  const gridStyle: React.CSSProperties = isMobile
    ? {
        width:         '100%',
        display:       'flex',
        flexDirection: 'column',
        gap:           GRID_GAP,
      }
    : {
        width:               '100%',
        display:             'grid',
        gridTemplateColumns: '17fr 50fr 33fr',
        gridTemplateRows:    '37fr 30fr 33fr',
        gridTemplateAreas:   `"minerva minerva research" "minerva minerva spatial" "writing systems spatial"`,
        gap:                 GRID_GAP,
        aspectRatio:         GRID_ASPECT_RATIO,
        maxHeight:           GRID_MAX_HEIGHT,
      };

  const orderedCards = isMobile
    ? MOBILE_ORDER.map(id => CARDS.find(c => c.id === id)!).filter(Boolean)
    : CARDS;

  return (
    <section
      id="doorways"
      style={{
        background:     '#ffffff',
        minHeight:      '100vh',
        boxSizing:      'border-box',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            GRID_NAV_GAP,
        paddingLeft:    'var(--page-margin)',
        paddingRight:   'var(--page-margin)',
        paddingTop:     SECTION_PADDING_TOP,
        paddingBottom:  SECTION_PADDING_BOTTOM,
      }}
    >
      {/* PHILOSOPHY ▲ — scroll up */}
      <NavLink direction="up" label="Philosophy" onClick={onScrollUp} />

      {/* Bento grid */}
      <div style={gridStyle}>
        {orderedCards.map(renderCard)}
      </div>

      {/* WORK SELECTION ▼ — scroll down */}
      <NavLink direction="down" label="Work Selection" onClick={onScrollDown} />
    </section>
  );
}
