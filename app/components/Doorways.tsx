'use client';

import { useEffect, useRef, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURABLE VARIABLES
// ════════════════════════════════════════════════════════════════════════════

// ── Grid ──
const GRID_GAP          = 6;          // px — gutter between cards
const GRID_ASPECT_RATIO = '16 / 9';   // desktop grid aspect ratio
const GRID_MAX_HEIGHT   = '85vh';     // prevent oversized cards on tall screens
const GRID_MIN_HEIGHT   = 440;        // px — keep cards from collapsing on short screens
const MOBILE_BREAKPOINT = 750;        // px — switch to stacked single-column layout

// ── Overlay ──
const OVERLAY_DEFAULT = 'rgba(0, 0, 0, 0.55)';  // darkens image (default/hover)
const OVERLAY_ACTIVE  = 'rgba(0, 0, 0, 0.25)';  // lightens image (active)

// ── Hover zoom ──
const HOVER_SCALE     = 1.05;
const ZOOM_TRANSITION = '600ms ease';

// ── Button ──
const BUTTON_SIZE         = 40;   // px — square button
const BUTTON_EDGE_PADDING = 16;   // px — from right and bottom card edges
const BUTTON_RADIUS       = 6;    // px

// ── Fade transitions (overlay / phrase / button) ──
const FADE_DURATION = '400ms';

// ── Card ──
const CARD_RADIUS       = 4;    // px — subtle rounding
const TEXT_EDGE_PADDING = 28;   // px — left/right inset of the title + phrase block
const TEXT_BLOCK_GAP    = 10;   // px — gap between title and phrase

// ── Section ──
const SECTION_PADDING_VERTICAL = 40;        // px — top & bottom section padding
const SOLID_DARK               = '#1c1c1d'; // fallback background (no image)

// ════════════════════════════════════════════════════════════════════════════
// CARD DATA
// ════════════════════════════════════════════════════════════════════════════

type CardType = 'link' | 'preset';

interface DoorwayCard {
  id:            string;
  title:         string;
  phrase:        string;
  type:          CardType;
  url?:          string;
  presetName?:   string;
  gridArea:      string;
  imagePath:     string;                 // '' → solid dark background
  imagePosition: { x: string; y: string }; // object-position — adjustable per card
  buttonEnabled: boolean;
  large?:        boolean;                // larger title (hero card)
}

const CARDS: DoorwayCard[] = [
  {
    id:            'minerva',
    title:         'Project Minerva',
    phrase:        'My most recent work, an online platform I built to empower the creative process.',
    type:          'link',
    url:           'https://minerva.enolvallina.com', // placeholder — user will confirm
    gridArea:      'minerva',
    imagePath:     '/images/cardboard/minerva.webp',
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: true,
    large:         true,
  },
  {
    id:            'systems',
    title:         'Systems Thinking',
    phrase:        'Projects designed as systems, expanding from territorial analysis to urban fabric interventions.',
    type:          'preset',
    presetName:    'Systems Thinking',
    gridArea:      'systems',
    imagePath:     '/images/cardboard/systems.webp',
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: true,
  },
  {
    id:            'spatial',
    title:         'Spatial Experiences',
    phrase:        'A collection of architecture projects you move through, where space is shaped into experience.',
    type:          'preset',
    presetName:    'Spatial Experiences',
    gridArea:      'spatial',
    imagePath:     '/images/cardboard/spatial.webp',
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: true,
  },
  {
    id:            'research',
    title:         'Research',
    phrase:        'An ensemble of studies questioning how we perceive and experience the city, and therefore how we analyze it.',
    type:          'preset',
    presetName:    'Research',
    gridArea:      'research',
    imagePath:     '/images/cardboard/research.webp',
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: true,
  },
  {
    id:            'writing',
    title:         'Writing',
    phrase:        'Notes on design, cities, and technology. Coming soon.',
    type:          'link',
    url:           '', // no URL yet
    gridArea:      'writing',
    imagePath:     '', // solid dark background (no image yet)
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: false, // ← flip to true when Substack is ready
  },
];

// Stacked-layout order (top → bottom) and per-card mobile aspect ratios
const MOBILE_ORDER = ['minerva', 'systems', 'spatial', 'research', 'writing'];
const mobileAspect = (id: string) => (id === 'minerva' ? '16 / 9' : '16 / 10');

// ════════════════════════════════════════════════════════════════════════════
// ICONS (inline SVG, dark stroke on the white button)
// ════════════════════════════════════════════════════════════════════════════

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#1c1c1d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#1c1c1d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface DoorwaysProps {
  /** Triggers a preset selection + scroll to the project cards (handled by parent). */
  onPresetSelect: (presetName: string) => void;
}

export default function Doorways({ onPresetSelect }: DoorwaysProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const [isMobile,     setIsMobile]     = useState(false);
  const [canHover,     setCanHover]     = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Responsive breakpoint ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Hover-capable pointer detection (no zoom-on-hover for touch) ──
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover)').matches);
  }, []);

  // ── Click outside the grid → deactivate ──
  useEffect(() => {
    if (activeCardId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const grid = gridRef.current;
      if (grid && !grid.contains(e.target as Node)) {
        setActiveCardId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeCardId]);

  // ── A card body click toggles active (deactivates if already active) ──
  const handleCardClick = (card: DoorwayCard) => {
    setActiveCardId(prev => (prev === card.id ? null : card.id));
  };

  // ── Preset button click → fire callback (parent scrolls to cards) ──
  const handlePresetButton = (e: React.MouseEvent, card: DoorwayCard) => {
    e.stopPropagation(); // don't toggle the card off
    if (card.presetName) onPresetSelect(card.presetName);
  };

  // ── Render one card (shared between grid & stacked layouts) ──
  const renderCard = (card: DoorwayCard) => {
    const isActive  = activeCardId === card.id;
    const isHovered = hoveredId === card.id;
    const zoomed    = isActive || (canHover && isHovered);
    const showButton = card.buttonEnabled && (card.type === 'preset' || !!card.url);

    const cardStyle: React.CSSProperties = {
      position:     'relative',
      overflow:     'hidden',
      borderRadius: CARD_RADIUS,
      cursor:       'pointer',
      background:   SOLID_DARK,
      ...(isMobile
        ? { width: '100%', aspectRatio: mobileAspect(card.id) }
        : { gridArea: card.gridArea, minHeight: 0 }),
    };

    const buttonStyle: React.CSSProperties = {
      position:       'absolute',
      right:          BUTTON_EDGE_PADDING,
      bottom:         BUTTON_EDGE_PADDING,
      width:          BUTTON_SIZE,
      height:         BUTTON_SIZE,
      background:     'rgba(255, 255, 255, 0.95)',
      borderRadius:   BUTTON_RADIUS,
      border:         'none',
      padding:        0,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      cursor:         'pointer',
      opacity:        isActive ? 1 : 0,
      pointerEvents:  isActive ? 'auto' : 'none',
      transition:     `opacity ${FADE_DURATION} ease, transform 150ms ease`,
      boxShadow:      '0 2px 8px rgba(0, 0, 0, 0.25)',
      textDecoration: 'none',
    };

    const onBtnEnter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = 'scale(1.1)'; };
    const onBtnLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = 'none'; };

    return (
      <div
        key={card.id}
        style={cardStyle}
        onClick={() => handleCardClick(card)}
        onMouseEnter={() => setHoveredId(card.id)}
        onMouseLeave={() => setHoveredId(null)}
        aria-label={card.title}
      >
        {/* Image layer (omitted → solid dark shows through) */}
        {card.imagePath && (
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
              filter:         'grayscale(100%)',
              transform:      `scale(${zoomed ? HOVER_SCALE : 1})`,
              transition:     `transform ${ZOOM_TRANSITION}`,
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
            background:    isActive ? OVERLAY_ACTIVE : OVERLAY_DEFAULT,
            transition:    `background ${FADE_DURATION} ease`,
            pointerEvents: 'none',
          }}
        />

        {/* Title + phrase — vertically centered; title never moves (phrase space reserved) */}
        <div
          style={{
            position:      'absolute',
            top:           '50%',
            transform:     'translateY(-50%)',
            left:          TEXT_EDGE_PADDING,
            right:         TEXT_EDGE_PADDING,
            display:       'flex',
            flexDirection: 'column',
            gap:           TEXT_BLOCK_GAP,
            pointerEvents: 'none',
          }}
        >
          <h3
            style={{
              margin:     0,
              fontFamily: 'var(--font-playfair)', // serif — @theme inline doesn't emit --font-serif to :root, so use the inherited next/font var
              fontWeight: 700,
              color:      '#ffffff',
              fontSize:   card.large ? 'clamp(1.8rem, 3vw, 3rem)' : 'clamp(1.4rem, 2.2vw, 2.2rem)',
              lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {card.title}
          </h3>
          <p
            style={{
              margin:     0,
              maxWidth:   '80%',
              fontFamily: 'var(--font-roboto)', // sans — see note on h3 above
              fontSize:   'clamp(0.75rem, 1.1vw, 0.95rem)',
              lineHeight: 1.45,
              color:      card.id === 'writing' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.85)',
              opacity:    isActive ? 1 : 0,
              transition: `opacity ${FADE_DURATION} ease`,
            }}
          >
            {card.phrase}
          </p>
        </div>

        {/* Button — preset (chevron) or link (external) */}
        {showButton && (
          card.type === 'preset' ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={(e) => handlePresetButton(e, card)}
              onMouseEnter={onBtnEnter}
              onMouseLeave={onBtnLeave}
              aria-label={`Show ${card.title} projects`}
            >
              <ChevronDownIcon />
            </button>
          ) : (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              style={buttonStyle}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={onBtnEnter}
              onMouseLeave={onBtnLeave}
              aria-label={`Open ${card.title}`}
            >
              <ExternalLinkIcon />
            </a>
          )
        )}
      </div>
    );
  };

  // ── Layout container ──
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
        minHeight:           GRID_MIN_HEIGHT,
      };

  const orderedCards = isMobile
    ? MOBILE_ORDER.map(id => CARDS.find(c => c.id === id)!).filter(Boolean)
    : CARDS;

  return (
    <section
      id="doorways"
      style={{
        position:       'relative',
        background:     '#ffffff',
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        paddingLeft:    'var(--page-margin)',
        paddingRight:   'var(--page-margin)',
        paddingTop:     SECTION_PADDING_VERTICAL,
        paddingBottom:  SECTION_PADDING_VERTICAL,
      }}
    >
      <div ref={gridRef} style={gridStyle}>
        {orderedCards.map(renderCard)}
      </div>
    </section>
  );
}
