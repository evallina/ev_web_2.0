'use client';

import { useEffect, useRef, useState } from 'react';
import principlesData from '@/src/data/designPrinciples.json';
import philosophyImages from '@/src/data/philosophyImages.json';

// ── Design variables ────────────────────────────────────────────────────────
const typingSpeed          = 60;                        // ms per character while typing
const erasingSpeed         = 20;                        // ms per character while erasing
const pauseDuration        = 3200;                      // ms to hold the fully-typed phrase
const photoDropInterval    = 4000;                      // ms between each new photo appearing
const photoFadeInDuration  = 1400;                      // ms — incoming image fades in
const photoFadeOutDuration = 1000;                      // ms — outgoing image fades out
const photoFadeOutDelay    = 300;                       // ms after new image starts before old begins to fade out
const photoOpacity         = 0.9;                       // peak opacity of background photos (0–1)
const grainOpacity         = 0.60;                      // opacity of grain overlay (0–1)
const headingSize          = 'clamp(3rem, 5vw, 5rem)'; // font-size of the heading
const headingColor         = '#1C1C1C';                 // color of "Design" and the typed phrase
const typedLineWidth       = '60vw';                    // max-width of the typed continuation line
const textShadowOpacity    = 0.2;                       // opacity of the drop shadow behind the heading text

const zoomScale       = 1.15;             // max scale for the zoom effect (1.0 = no zoom)
const zoomDuration    = photoDropInterval; // ms — matches the photo display duration
const imageTopMargin  = '5rem';           // top inset of the image clip area (sides/bottom use --page-margin)

const labelColor     = '#282829';      // color of the "My Design Philosophy" label
const labelOpacity   = 0.9;           // opacity of the label (0–1)
const labelTopOffset = '7rem';        // distance from the top of the section

const worksColor        = 'black';   // color of the Works ▼ button
const worksOpacity      = 0.85;        // opacity at rest (0–1)
const worksHoverOpacity = 0.65;        // opacity on hover (0–1)
const worksBottomOffset = '3.5rem';    // distance from the bottom of the section

// ── Mobile overrides (< MOBILE_BP px) ───────────────────────────────────────
const MOBILE_BP           = 750;       // px — mobile breakpoint
const mobileImagePaddingTop = '3.5rem';    // top AND bottom inset of the photo background clip area
const mobileImagePaddingBottom = '2.0rem';    // top AND bottom inset of the photo background clip area
const mobileTextPaddingH  = '1rem';    // left/right padding of the "Design / typed phrase" heading
const mobileHeadingSize   = 'clamp(2rem, 8vw, 2.8rem)'; // font-size of heading on mobile (overrides headingSize)

// ── Internal constants ──────────────────────────────────────────────────────
// Keep at most 2 items alive at once (the incoming + the outgoing during crossfade)
const MAX_STACK_VISIBLE = 2;

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
  photoIdx:  number;
  zoomsIn:   boolean;  // true = scale(1.0→zoomScale), false = scale(zoomScale→1.0)
  key:       number;
  visible:   boolean;  // false → true triggers fade-in CSS transition
  fadingOut: boolean;  // false → true triggers fade-out CSS transition
}

// ── Typewriter hook ─────────────────────────────────────────────────────────
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
  const [stack, setStack]   = useState<StackItem[]>([]);
  const photoIdxRef         = useRef(0);
  const keyRef              = useRef(0);
  const fadeOutTimerRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const removeTimerRef      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (photoCount === 0) return;

    const addPhoto = () => {
      const photoIdx = photoIdxRef.current % photoCount;
      const zoomsIn  = photoIdxRef.current % 2 === 0; // 1st, 3rd, 5th… zoom in; 2nd, 4th… zoom out
      photoIdxRef.current += 1;
      keyRef.current      += 1;
      const key = keyRef.current;

      // Add new photo (invisible) alongside existing ones, capped at MAX_STACK_VISIBLE
      setStack(prev =>
        [...prev, { photoIdx, zoomsIn, key, visible: false, fadingOut: false }]
          .slice(-MAX_STACK_VISIBLE)
      );

      // Two rAF frames: let the browser paint opacity:0 first so the transition fires
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setStack(prev => prev.map(i => i.key === key ? { ...i, visible: true } : i));
      }));

      // After photoFadeOutDelay, begin fading out every photo that isn't the new one
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = setTimeout(() => {
        setStack(prev => prev.map(i => i.key !== key ? { ...i, fadingOut: true } : i));
      }, photoFadeOutDelay);

      // After the fade-out finishes, prune them from the DOM
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = setTimeout(() => {
        setStack(prev => prev.filter(i => i.key === key));
      }, photoFadeOutDelay + photoFadeOutDuration);
    };

    addPhoto(); // first photo immediately
    const id = setInterval(addPhoto, photoDropInterval);
    return () => {
      clearInterval(id);
      clearTimeout(fadeOutTimerRef.current);
      clearTimeout(removeTimerRef.current);
    };
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <section
      id="design-philosophy"
      className="relative bg-white h-screen overflow-hidden"
    >

      {/* ── Photo background layer — clipped to page margins ─────────────── */}
      <div data-parallax style={{
        position: 'absolute',
        top:      isMobile ? mobileImagePaddingTop : imageTopMargin,
        bottom:   isMobile ? mobileImagePaddingBottom : 'var(--page-margin)',
        left:     'var(--page-margin)',
        right:    'var(--page-margin)',
        overflow: 'hidden',
        zIndex:   1,
      }}>
        {stack.map((item) => {
          const startScale = item.zoomsIn ? 1.0       : zoomScale;
          const endScale   = item.zoomsIn ? zoomScale : 1.0;
          const scale      = item.visible ? endScale : startScale;
          const bg         = hasPhotos
            ? undefined
            : PLACEHOLDER_COLORS[item.photoIdx % PLACEHOLDER_COLORS.length];

          return (
            <div
              key={item.key}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position:   'absolute',
                inset:      0,
                opacity:    item.fadingOut ? 0 : (item.visible ? photoOpacity : 0),
                transition: item.fadingOut
                  ? `opacity ${photoFadeOutDuration}ms ease-in`
                  : `opacity ${photoFadeInDuration}ms ease-out`,
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
                    position:        'absolute',
                    inset:           0,
                    width:           '100%',
                    height:          '100%',
                    objectFit:       'cover',
                    display:         'block',
                    transform:       `scale(${scale})`,
                    transformOrigin: 'center center',
                    transition:      item.fadingOut
                      ? 'none'
                      : `transform ${zoomDuration}ms linear`,
                  }}
                />
              ) : (
                <div
                  style={{
                    position:        'absolute',
                    inset:           0,
                    background:      bg,
                    transform:       `scale(${scale})`,
                    transformOrigin: 'center center',
                    transition:      item.fadingOut
                      ? 'none'
                      : `transform ${zoomDuration}ms linear`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Grain overlay ────────────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          width:         '100%',
          height:        '100%',
          zIndex:        2,
          opacity:       grainOpacity,
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
        className="font-sans text-xs uppercase tracking-[0.25em]"
        style={{ position: 'absolute', top: labelTopOffset, left: 0, right: 0, textAlign: 'center', zIndex: 10, color: labelColor, opacity: labelOpacity }}
      >
        My Design Philosophy
      </p>

      {/* ── Heading — centered in section ────────────────────────────────── */}
      <div
        className="font-serif font-bold"
        style={{
          color:          headingColor,
          position:       'absolute',
          inset:          0,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'flex-start',
          paddingTop:     'calc(35vh - 3rem)',
          paddingLeft:    isMobile ? mobileTextPaddingH : 0,
          paddingRight:   isMobile ? mobileTextPaddingH : 0,
          zIndex:         10,
          pointerEvents:  'none',
        }}
      >
        <div style={{ fontSize: isMobile ? mobileHeadingSize : headingSize, lineHeight: 1.15, textShadow: `0 2px 24px rgba(0,0,0,${textShadowOpacity})` }}>Design</div>
        <div style={{ fontSize: isMobile ? mobileHeadingSize : headingSize, lineHeight: 1.15, fontWeight: 400, maxWidth: typedLineWidth, textAlign: 'center', textShadow: `0 2px 24px rgba(0,0,0,${textShadowOpacity})` }}>
          {displayText}
          <span
            aria-hidden="true"
            style={{
              display:       'inline-block',
              width:         3,
              height:        '0.75em',
              background:    headingColor,
              marginLeft:    3,
              verticalAlign: 'middle',
              animation:     'philosophy-cursor-blink 800ms step-end infinite',
            }}
          />
        </div>
      </div>

      {/* ── "Works" link — pinned bottom center ──────────────────────────── */}
      {onScrollDown && (
        <button
          onClick={onScrollDown}
          className="font-sans text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 transition-opacity cursor-pointer"
          style={{
            position: 'absolute',
            bottom:   worksBottomOffset,
            left: 0, right: 0, margin: '0 auto',
            width:   'fit-content',
            zIndex:  10,
            color:   worksColor,
            opacity: worksOpacity,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = String(worksHoverOpacity))}
          onMouseLeave={e => (e.currentTarget.style.opacity = String(worksOpacity))}
        >
          <span>Works</span>
          <span>▼</span>
        </button>
      )}

    </section>
  );
}
