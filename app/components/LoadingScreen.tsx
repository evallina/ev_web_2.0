'use client';

import { useEffect, useState } from 'react';
import projectsData from '@/src/data/projects.json';

// ── Design variables ───────────────────────────────────────────────────────────
const MIN_DISPLAY_TIME  = 8500;  // ms — minimum display; actual may be longer while images load
const FADE_OUT_DURATION = 800;   // ms — fade-out animation duration
const DOT_INTERVAL      = 400;   // ms — time between each animated dot appearing
const MOBILE_BREAKPOINT = 600;   // px

// ── Image preload list ─────────────────────────────────────────────────────────
const heroImages = [
  '/images/categories/1_Public-Realm_01.png',
  '/images/categories/2_Place_01.png',
  '/images/categories/3_Interactivity_01.png',
  '/images/categories/4_Data-Driven_01.png',
  '/images/categories/5_Strategy_01.png',
  '/images/categories/6_User-Oriented_01.png',
];

const presetCardImages: string[] = [];
for (const p of (projectsData.projects as any[])) {
  const presets = p.presets ?? [];
  const hasPreset = presets.some((tag: any) =>
    typeof tag === 'string' ? tag.length > 0 :
    Array.isArray(tag) ? tag.length > 0 : false
  );
  if (hasPreset && p.cards) {
    for (const card of p.cards) {
      presetCardImages.push(card);
    }
  }
}

const allPreloadImages = [...heroImages, ...presetCardImages];
console.log(`[LoadingScreen] Preloading ${allPreloadImages.length} images (${heroImages.length} hero + ${presetCardImages.length} project cards)`);

// ── Helpers ────────────────────────────────────────────────────────────────────
function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(url => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload  = () => resolve();
      img.onerror = () => resolve(); // don't block on failed loads
      img.src = url;
    }))
  );
}

interface Props {
  visible:    boolean;
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: Props) {
  const [dots,     setDots]     = useState('');
  const [fading,   setFading]   = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Dot animation: '' → '.' → '..' → '...' → '' → …
  useEffect(() => {
    const stages = ['', '.', '..', '...'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % stages.length;
      setDots(stages[i]);
    }, DOT_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Timing: wait for min display time + fonts.ready + window load + image preload, then fade out
  useEffect(() => {
    const minTimer   = new Promise<void>(resolve => setTimeout(resolve, MIN_DISPLAY_TIME));
    const fontsReady = document.fonts.ready.then(() => undefined);
    const windowLoad = new Promise<void>(resolve => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });
    const imagesReady = preloadImages(allPreloadImages);

    let cancelled = false;
    Promise.all([minTimer, fontsReady, windowLoad, imagesReady]).then(() => {
      if (cancelled) return;
      setFading(true);
      setTimeout(() => { if (!cancelled) onComplete(); }, FADE_OUT_DURATION);
    });

    return () => { cancelled = true; };
  // onComplete is intentionally excluded — it's stable and adding it would re-run the timer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position:       'fixed',
        inset:           0,
        zIndex:          9999,
        background:     '#FFFFFF',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:         fading ? 0 : 1,
        transition:     `opacity ${FADE_OUT_DURATION}ms ease`,
        pointerEvents:   fading ? 'none' : 'auto',
      }}
    >
      {/* Content — no position/z-index so mix-blend-mode on the GIF blends with the outer background */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Title */}
        <div style={{
          fontFamily:    'var(--font-roboto, sans-serif)',
          fontWeight:     900,
          color:         '#1c1c1d',
          opacity:        0.95,
          letterSpacing: '0.02em',
          fontSize:       isMobile ? '2.4rem' : '1.6rem',
          userSelect:    'none',
        }}>
          {/*ENOL VALLINA | DESIGN*/}
        </div>

        {/* Animated GIF */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/loading/Places_loading.gif"
          alt=""
          aria-hidden="true"
          style={{
            marginTop:    20,
            width:        '100%',
            maxWidth:      isMobile ? 250 : 300,
            display:      'block',
          }}
        />

        {/* "Loading…" with animated dots */}
        <div style={{
          marginTop:  16,
          fontFamily: 'var(--font-playfair, serif)',
          fontSize:   '0.85rem',
          color:      '#1c1c1d',
          opacity:     0.5,
          userSelect: 'none',
          minWidth:   '6ch',   // prevents layout shift as dots appear/disappear
          textAlign:  'center',
        }}>
          Loading{dots}
        </div>

      </div>

      {/* Grain overlay — on top of all content including the GIF */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, opacity: 0.60, pointerEvents: 'none' }}
      >
        <filter id="loading-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#loading-grain)" />
      </svg>
    </div>
  );
}
