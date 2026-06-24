'use client';

import { useEffect, useRef, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURABLE VARIABLES
// ════════════════════════════════════════════════════════════════════════════

// ── Typography (adjust these to tune title sizes) ──────────────────────
const TITLE_FONT_SIZE = 'clamp(1.8rem, 2.8vw, 2.8rem)';  // all cards same size — was clamp(1.4rem, 2.2vw, 2.2rem)
// ↑ Adjust this to change all card title sizes. Format: clamp(min, preferred, max)

// ── Grid ──
const GRID_GAP          = 12;          // px — gutter between cards (1.5× original 6)
const GRID_ASPECT_RATIO = '16 / 9';   // desktop grid aspect ratio
const GRID_MAX_HEIGHT   = '77vh';     // leaves room for the nav links + gaps so the whole section fits one viewport
const MOBILE_BREAKPOINT = 750;        // px — switch to stacked single-column layout

// ── Overlay (darkens image) ──
const OVERLAY_DEFAULT = 'rgba(0, 0, 0, 0.55)';
const OVERLAY_ACTIVE  = 'rgba(0, 0, 0, 0.70)';  // darker when active

// ── Image effects ──
const HOVER_SCALE     = 1.05;
const ACTIVE_BLUR     = 6;          // px — image blur when active
const ZOOM_TRANSITION = '600ms ease';
const FADE_DURATION   = '400ms';    // overlay / phrase / button / filter fades

// ── Button ──
const BUTTON_SIZE = 50;   // px — square button (1.5× the original 40)

// ── Layout ──
const CARD_CONTENT_PADDING   = 30;        // px — padding from card edge for text AND button
const SECTION_PADDING_TOP    = 70;        // px — clears the ~48px sticky header with ~18px breathing room
const SECTION_PADDING_BOTTOM = 50;        // px — small gap below the WORK SELECTION link
const GRID_NAV_GAP           = 15;        // px — vertical space between the grid and the top/bottom nav links
const SOLID_DARK             = '#1c1c1d'; // fallback background (no image)

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
  imagePath:     string;                    // '' → solid dark background
  imagePosition: { x: string; y: string };  // object-position — adjustable per card
  buttonEnabled: boolean;
}

const CARDS: DoorwayCard[] = [
  {
    id:            'minerva',
    title:         'Project Minerva',
    phrase:        'My most recent work, an online platform I built to empower the creative process.',
    type:          'link',
    url:           'https://minerva-lime.vercel.app/',
    gridArea:      'minerva',
    imagePath:     '/images/cardboard/minerva.webp',
    imagePosition: { x: '50%', y: '50%' },
    buttonEnabled: true,
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
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none"
      stroke="#1c1c1d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#1c1c1d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

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
    const mq = window.matchMedia('(hover: hover)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
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
    const isActive   = activeCardId === card.id;
    const isHovered  = hoveredId === card.id;
    const zoomed     = isActive || (canHover && isHovered);
    const showButton = card.buttonEnabled && (card.type === 'preset' || !!card.url);

    const cardStyle: React.CSSProperties = {
      position:     'relative',
      overflow:     'hidden',
      borderRadius: 0,            // straight corners
      cursor:       'pointer',
      background:   SOLID_DARK,
      ...(isMobile
        ? { width: '100%', aspectRatio: mobileAspect(card.id) }
        : { gridArea: card.gridArea, minHeight: 0 }),
    };

    const buttonStyle: React.CSSProperties = {
      position:       'absolute',
      right:          CARD_CONTENT_PADDING,
      bottom:         CARD_CONTENT_PADDING,
      width:          BUTTON_SIZE,
      height:         BUTTON_SIZE,
      background:     'rgba(255, 255, 255, 0.95)',
      borderRadius:   0,          // square corners
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
              filter:         isActive ? `grayscale(100%) blur(${ACTIVE_BLUR}px)` : 'grayscale(100%)',
              transform:      `scale(${zoomed ? HOVER_SCALE : 1})`,
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
            background:    isActive ? OVERLAY_ACTIVE : OVERLAY_DEFAULT,
            transition:    `background ${FADE_DURATION} ease`,
            pointerEvents: 'none',
          }}
        />

        {/* Title + phrase — anchored top-left, left-justified; title never moves */}
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
              fontFamily: 'var(--font-playfair)', // project serif (see Doorways font note)
              fontWeight: 700,
              color:      '#ffffff',
              fontSize:   TITLE_FONT_SIZE, // consistent across all cards — see TITLE_FONT_SIZE at top
              lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {card.title}
          </h3>
          <p
            style={{
              margin:     0,
              marginTop:  8,
              textAlign:  'left',
              maxWidth:   '85%',
              fontFamily: 'var(--font-roboto)', // project sans
              fontSize:   'clamp(0.75rem, 1vw, 0.9rem)',
              lineHeight: 1.45,
              color:      'rgba(255, 255, 255, 0.85)',
              opacity:    isActive ? (card.id === 'writing' ? 0.6 : 1) : 0,
              transition: `opacity ${FADE_DURATION} ease`,
            }}
          >
            {card.phrase}
          </p>
        </div>

        {/* Button — bottom-left; preset (chevron) or link (external) */}
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
      <div ref={gridRef} style={gridStyle}>
        {orderedCards.map(renderCard)}
      </div>

      {/* WORK SELECTION ▼ — scroll down */}
      <NavLink direction="down" label="Work Selection" onClick={onScrollDown} />
    </section>
  );
}
