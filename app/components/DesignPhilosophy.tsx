'use client';

import { useEffect, useRef, useState } from 'react';
import principlesData from '@/src/data/designPrinciples.json';
import philosophyImages from '@/src/data/philosophyImages.json';

// ── Design variables ────────────────────────────────────────────────────────
const typingSpeed       = 60;                        // ms per character while typing
const erasingSpeed      = 20;                        // ms per character while erasing
const pauseDuration     = 3200;                      // ms to hold the fully-typed phrase
const photoDropInterval   = 4000;                       // ms between each photo appearing
const photoFadeInDuration = 2000;                       // ms for each photo to fade in
const photoOpacity        = 0.9;                       // opacity of background photos (0–1)
const grainOpacity        = 0.40;                      // opacity of grain overlay (0–1)
const headingSize         = 'clamp(3rem, 5vw, 5rem)'; // font-size of the heading
const headingColor        = '#1C1C1C';                 // color of "Design" and the typed phrase, '#282829' is the Default. '#ffffff'(White)
const typedLineWidth      = '60vw';                    // max-width of the typed continuation line
const textShadowOpacity   = 0.2;                      // opacity of the drop shadow behind the heading text (0–1)

// Max random offset from the section center for each image (px)
const maxOffsetX = 0; // horizontal scatter range: ±maxOffsetX , before was 80
const maxOffsetY = 0; // vertical scatter range:   ±maxOffsetY, before was 30

// ── Internal constants ──────────────────────────────────────────────────────
const MAX_STACK_VISIBLE = 1;

const PLACEHOLDER_COLORS = [
  'hsl(220, 10%, 86%)',
  'hsl(235, 10%, 82%)',
  'hsl(210, 12%, 88%)',
  'hsl(240,  8%, 84%)',
  'hsl(225, 11%, 80%)',
  'hsl(215,  9%, 87%)',
  'hsl(230, 10%, 83%)',
  'hsl(220, 12%, 81%)',
];

// ── Types ───────────────────────────────────────────────────────────────────
interface StackItem {
  photoIdx: number;
  x: number;       // center x position in px
  y: number;       // center y position in px
  key: number;
  visible: boolean; // false on first paint → true after browser paints → triggers CSS transition
}

// ── Typewriter hook ─────────────────────────────────────────────────────────
// Phase 'pausing' removed — the pause is handled via setTimeout so no
// setState call happens synchronously inside the effect body.
function useTypewriter(phrases: string[]) {
  const [display, setDisplay]     = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase]         = useState<'typing' | 'erasing'>('typing');
  const charIdx = useRef(0);

  useEffect(() => {
    if (phrases.length === 0) return;
    const phrase = phrases[phraseIdx % phrases.length];

    if (phase === 'typing') {
      if (charIdx.current < phrase.length) {
        const t = setTimeout(() => {
          charIdx.current += 1;
          setDisplay(phrase.slice(0, charIdx.current));
        }, typingSpeed);
        return () => clearTimeout(t);
      } else {
        // Done typing — wait pauseDuration then start erasing
        const t = setTimeout(() => setPhase('erasing'), pauseDuration);
        return () => clearTimeout(t);
      }
    }

    if (phase === 'erasing') {
      if (charIdx.current > 0) {
        const t = setTimeout(() => {
          charIdx.current -= 1;
          setDisplay(phrase.slice(0, charIdx.current));
        }, erasingSpeed);
        return () => clearTimeout(t);
      } else {
        // Done erasing — advance to next phrase
        const t = setTimeout(() => {
          setPhraseIdx(i => i + 1);
          setPhase('typing');
        }, 0);
        return () => clearTimeout(t);
      }
    }
  }, [display, phase, phraseIdx, phrases]);

  return display;
}

// ── Photo stack hook ────────────────────────────────────────────────────────
function usePhotoStack(photoCount: number) {
  const [stack, setStack] = useState<StackItem[]>([]);
  const photoIdxRef = useRef(0);
  const keyRef      = useRef(0);

  useEffect(() => {
    if (photoCount === 0) return;

    const addPhoto = () => {
      const x = window.innerWidth  / 2 + (Math.random() * 2 - 1) * maxOffsetX;
      const y = window.innerHeight / 2 + (Math.random() * 2 - 1) * maxOffsetY;
      const photoIdx = photoIdxRef.current % photoCount;
      photoIdxRef.current += 1;
      keyRef.current      += 1;
      const key = keyRef.current;
      setStack(prev => [...prev, { photoIdx, x, y, key, visible: false }].slice(-MAX_STACK_VISIBLE));
      // Two rAF frames ensure the browser has painted opacity:0 before we flip to
      // opacity:photoOpacity, so the CSS transition actually fires.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStack(prev => prev.map(i => i.key === key ? { ...i, visible: true } : i));
        });
      });
    };

    addPhoto(); // first photo immediately, no delay
    const id = setInterval(addPhoto, photoDropInterval);
    return () => clearInterval(id);
  }, [photoCount]);

  return stack;
}

// ── Component ───────────────────────────────────────────────────────────────
interface DesignPhilosophyProps {
  onScrollDown?: () => void;
}

export default function DesignPhilosophy({ onScrollDown }: DesignPhilosophyProps) {
  const phrases     = principlesData.principles;
  const displayText = useTypewriter(phrases);

  const photos     = philosophyImages as string[];
  const hasPhotos  = photos.length > 0;
  const photoCount = hasPhotos ? photos.length : PLACEHOLDER_COLORS.length;
  const stack      = usePhotoStack(photoCount);

  return (
    <section
      id="design-philosophy"
      className="relative bg-white h-screen overflow-hidden"
    >

      {/* ── Photo background layer ───────────────────────────────────────── */}
      {stack.map((item) => {
        const bg = hasPhotos
          ? undefined
          : PLACEHOLDER_COLORS[item.photoIdx % PLACEHOLDER_COLORS.length];

        return (
          // Wrapper: positions the image's CENTER at the random (x, y) point
          <div
            key={item.key}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              transform: 'translate(-50%, -50%)',
              opacity: item.visible ? photoOpacity : 0,
              transition: `opacity ${photoFadeInDuration}ms ease-out`,
            }}
          >
            {hasPhotos ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[item.photoIdx]}
                alt=""
                aria-hidden="true"
                className="img-protected"
                style={{
                  maxWidth: '65vw',
                  maxHeight: '65vh',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '65vw',
                  height: '45vw',
                  background: bg,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                }}
              />
            )}
          </div>
        );
      })}

      {/* ── Grain overlay ────────────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          opacity: grainOpacity,
          pointerEvents: 'none',
        }}
      >
        <filter id="philosophy-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#philosophy-grain)" />
      </svg>

      {/* ── Label — pinned top center ─────────────────────────────────────── */}
      <p
        className="font-sans text-[#282829]/40 text-xs uppercase tracking-[0.25em]"
        style={{ position: 'absolute', top: '5.5rem', left: 0, right: 0, textAlign: 'center', zIndex: 10 }}
      >
        My Design Philosophy
      </p>

      {/* ── Heading — centered in section ────────────────────────────────── */}
      <div
        className="font-serif font-bold"
        style={{
          color: headingColor,
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 'calc(35vh - 3rem)', // anchors "Design" near vertical center
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* "Design" — fixed first line */}
        <div style={{ fontSize: headingSize, lineHeight: 1.15, textShadow: `0 2px 24px rgba(0,0,0,${textShadowOpacity})` }}>Design</div>

        {/* Typed continuation — second line */}
        <div style={{ fontSize: headingSize, lineHeight: 1.15, fontWeight: 400, maxWidth: typedLineWidth, textAlign: 'center', textShadow: `0 2px 24px rgba(0,0,0,${textShadowOpacity})` }}>
          {displayText}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 3,
              height: '0.75em',
              background: headingColor,
              marginLeft: 3,
              verticalAlign: 'middle',
              animation: 'philosophy-cursor-blink 800ms step-end infinite',
            }}
          />
        </div>
      </div>

      {/* ── "Works" link — pinned bottom center ──────────────────────────── */}
      {onScrollDown && (
        <button
          onClick={onScrollDown}
          className="font-sans text-[#282829]/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-[#282829]/65 transition-colors cursor-pointer"
          style={{ position: 'absolute', bottom: '2.5rem', left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 10 }}
        >
          <span>Works</span>
          <span>▼</span>
        </button>
      )}

    </section>
  );
}
