'use client';

import { useState, useEffect } from 'react';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  DESIGN VARIABLES — edit these to tune the header appearance               │
// ├─────────────────────────────────────────────────────────────────────────────┤
const menuSquareSize         = 20;                 // px   — width & height of the white square / X icon
const menuSquareRadius       = 0;                  // px   — corner radius of the white square (0 = sharp)
const headerNamePaddingLeft  = 37;                 // px   — gap from left edge to "ENOL VALLINA"
const headerMenuPaddingRight = 37;                 // px   — gap from right edge to the menu button
const headerNameSize         = '1.0rem';           // size — font-size for "ENOL VALLINA"
const headerNameFont         = 'var(--font-sans)'; // font — font family for "ENOL VALLINA"
const headerNameBold         = true;               // bool — true = bold, false = normal weight

// ── Mobile full-screen menu ──────────────────────────────────────────────────
const mobileBreakpoint  = 750;                     // px   — below this width, full-screen menu is used
const mobileItemSize    = '1.05rem';               // size — font-size for mobile nav items
const mobileItemGap     = 38;                      // px   — vertical gap between mobile nav items
const mobileItemSpacing = '0.22em';                // em   — letter-spacing for mobile nav items
const mobileItemDelay   = 55;                      // ms   — stagger delay between items on open
// └─────────────────────────────────────────────────────────────────────────────┘

const NAV_ITEMS = [
  { label: 'HOME',       id: 'hero' },
  { label: 'TRAJECTORY', id: 'trajectory' },
  { label: 'PHILOSOPHY', id: 'design-philosophy' },
  { label: 'WORKS',      id: 'project-selection' },
  { label: 'CONTACT',    id: 'contact-bottom' },
] as const;

interface Props {
  menuOpen:     boolean;
  setMenuOpen:  (v: boolean) => void;
  scrolled:     boolean;
  grainOpacity: number;
  onNavigate:   (id: string) => void;
  onResetHero:  () => void;
}

export default function Header({ menuOpen, setMenuOpen, scrolled, grainOpacity, onNavigate, onResetHero }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center transition-all duration-200"
        style={{
          paddingLeft:  headerNamePaddingLeft,
          paddingRight: headerMenuPaddingRight,
          background:      (scrolled || menuOpen) ? 'rgba(15, 15, 16, 0.90)' : 'transparent',
          backdropFilter:  (scrolled || menuOpen) ? 'blur(8px)' : 'none',
          borderBottom:    (scrolled || menuOpen) ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        {/* Name — also a HOME button */}
        <button
          onClick={() => { onNavigate('hero'); onResetHero(); }}
          className="shrink-0 hover:text-white/70 transition-colors cursor-pointer"
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'white',
            fontSize:     headerNameSize,
            fontFamily:   headerNameFont,
            fontWeight:   headerNameBold ? 'bold' : 'normal',
            letterSpacing: '0.05em',
          }}
        >
          ENOL VALLINA
        </button>

        {/* Nav items — desktop only (slide in from right with stagger) */}
        {!isMobile && (
          <div className="flex-1 flex items-center justify-end overflow-hidden">
            {NAV_ITEMS.flatMap((item, i) => {
              const btn = (
                <button
                  key={item.label}
                  onClick={() => { onNavigate(item.id); setMenuOpen(false); if (item.id === 'hero') onResetHero(); }}
                  className="font-sans text-white text-xs uppercase tracking-[0.2em] px-3 shrink-0 hover:text-white/55 transition-colors cursor-pointer whitespace-nowrap"
                  style={{
                    background: 'none', border: 'none',
                    transform:        menuOpen ? 'translateX(0)' : 'translateX(200%)',
                    opacity:          menuOpen ? 1 : 0,
                    transition:       'transform 320ms ease, opacity 320ms ease',
                    transitionDelay:  `${menuOpen ? (NAV_ITEMS.length - 1 - i) * 60 : i * 60}ms`,
                    pointerEvents:    menuOpen ? 'auto' : 'none',
                  }}
                >
                  {item.label}
                </button>
              );
              if (i === 0) {
                return [btn, (
                  <span
                    key="sep-home-trajectory"
                    style={{
                      color:           'rgba(255,255,255,0.25)',
                      fontSize:        '0.6rem',
                      transform:       menuOpen ? 'translateX(0)' : 'translateX(200%)',
                      opacity:         menuOpen ? 1 : 0,
                      transition:      'transform 320ms ease, opacity 320ms ease',
                      transitionDelay: `${menuOpen ? (NAV_ITEMS.length - 1 - 0) * 60 : 0}ms`,
                      pointerEvents:   'none',
                      userSelect:      'none',
                      flexShrink:       0,
                    }}
                  >|</span>
                )];
              }
              return [btn];
            })}
          </div>
        )}

        {/* Spacer on mobile so hamburger stays right-aligned */}
        {isMobile && <div className="flex-1" />}

        {/* Hamburger / X toggle button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="shrink-0 ml-4 relative transition-transform duration-200 hover:scale-[1.15] cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 4, width: 26, height: 26 }}
        >
          {/* White square (closed state) */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${menuOpen ? 0.4 : 1})`,
            width: menuSquareSize, height: menuSquareSize, background: 'white', borderRadius: menuSquareRadius,
            opacity:    menuOpen ? 0 : 1,
            transition: 'opacity 200ms ease, transform 200ms ease',
            display:    'block',
          }} />
          {/* X icon (open state) */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${menuOpen ? 1 : 0.4})`,
            width: menuSquareSize, height: menuSquareSize,
            opacity:    menuOpen ? 1 : 0,
            transition: 'opacity 200ms ease, transform 200ms ease',
            display:    'block',
          }}>
            <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, marginTop: '-0.75px', background: 'white', transform: 'rotate(45deg)',  display: 'block', borderRadius: 1 }} />
            <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, marginTop: '-0.75px', background: 'white', transform: 'rotate(-45deg)', display: 'block', borderRadius: 1 }} />
          </span>
        </button>

        {/* Grain overlay on header — reuses the #page-noise filter defined in page.tsx */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
          <rect width="100%" height="100%" filter="url(#page-noise)" />
        </svg>
      </header>

      {/* ── Full-screen mobile menu overlay ──────────────────────────────────── */}
      {isMobile && (
        <div
          aria-hidden={!menuOpen}
          style={{
            position:       'fixed',
            inset:          0,
            zIndex:         49,   // just below the header (z-50)
            background:     'rgba(15, 15, 16, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            opacity:        menuOpen ? 1 : 0,
            pointerEvents:  menuOpen ? 'auto' : 'none',
            transition:     'opacity 280ms ease',
          }}
        >
          {/* Grain — same filter as header and page */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <rect width="100%" height="100%" filter="url(#page-noise)" style={{ opacity: grainOpacity }} />
          </svg>

          {/* Nav items — vertically centered column */}
          <nav
            style={{
              position:       'relative',
              zIndex:         1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            mobileItemGap,
            }}
          >
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item.label}
                onClick={() => { onNavigate(item.id); setMenuOpen(false); if (item.id === 'hero') onResetHero(); }}
                style={{
                  background:    'none',
                  border:        'none',
                  padding:       0,
                  cursor:        'pointer',
                  color:         'white',
                  fontFamily:    'var(--font-sans)',
                  fontSize:      mobileItemSize,
                  fontWeight:    'normal',
                  letterSpacing: mobileItemSpacing,
                  textTransform: 'uppercase',
                  transform:     menuOpen ? 'translateY(0)' : 'translateY(16px)',
                  opacity:       menuOpen ? 1 : 0,
                  transition:    'transform 350ms ease, opacity 350ms ease, color 150ms ease',
                  transitionDelay: menuOpen ? `${i * mobileItemDelay}ms` : '0ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.50)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'white')}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
