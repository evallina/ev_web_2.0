'use client';

import { useEffect, useRef, useState } from 'react';
import principlesData from '@/src/data/designPrinciples.json';
import philosophyImages from '@/src/data/philosophyImages.json';

// ── Design variables ────────────────────────────────────────────────────────
const typingSpeed       = 60;   // ms per character while typing
const erasingSpeed      = 40;   // ms per character while erasing
const pauseDuration     = 2200; // ms to hold the fully-typed phrase before erasing
const photoDropInterval = 300;  // ms between each photo appearing on the stack

// ── Internal constants ──────────────────────────────────────────────────────
const MAX_STACK_VISIBLE = 4;

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
  rotation: number; // degrees, -5 to +5
  scale: number;    // 0.95 to 1.05
  key: number;
}

// ── Typewriter hook ─────────────────────────────────────────────────────────
function useTypewriter(phrases: string[]) {
  const [display, setDisplay]     = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase]         = useState<'typing' | 'pausing' | 'erasing'>('typing');
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
        const t = setTimeout(() => setPhase('pausing'), pauseDuration);
        return () => clearTimeout(t);
      }
    }

    if (phase === 'pausing') {
      setPhase('erasing');
      return;
    }

    if (phase === 'erasing') {
      if (charIdx.current > 0) {
        const t = setTimeout(() => {
          charIdx.current -= 1;
          setDisplay(phrase.slice(0, charIdx.current));
        }, erasingSpeed);
        return () => clearTimeout(t);
      } else {
        setPhraseIdx(i => i + 1);
        setPhase('typing');
        return;
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
      const rotation = Math.random() * 10 - 5;       // -5° to +5°
      const scale    = 0.95 + Math.random() * 0.10;  // 0.95 to 1.05
      const photoIdx = photoIdxRef.current % photoCount;
      photoIdxRef.current += 1;
      keyRef.current      += 1;
      const key = keyRef.current;
      setStack(prev => [...prev, { photoIdx, rotation, scale, key }].slice(-MAX_STACK_VISIBLE));
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
      className="relative bg-white min-h-screen flex flex-col md:flex-row overflow-hidden"
    >

      {/* ── Text column ──────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left px-8 md:px-16 pt-20 pb-8 md:py-0 w-full md:w-[60%]">

        <p className="font-sans text-[#282829]/40 text-xs uppercase tracking-[0.25em] mb-8">
          My Design Philosophy
        </p>

        {/* "Design" + typed continuation on ONE line */}
        <div
          className="font-serif font-bold text-[#282829]"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', lineHeight: 1.2 }}
        >
          <span>Design </span>
          <span style={{ fontWeight: 400 }}>{displayText}</span>

          {/* Blinking cursor */}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 3,
              height: '0.75em',
              background: '#282829',
              marginLeft: 3,
              verticalAlign: 'middle',
              animation: 'philosophy-cursor-blink 800ms step-end infinite',
            }}
          />
        </div>

        {onScrollDown && (
          <button
            onClick={onScrollDown}
            className="mt-16 font-sans text-[#282829]/35 text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:text-[#282829]/65 transition-colors cursor-pointer self-center md:self-start"
          >
            <span>Works</span>
            <span>▼</span>
          </button>
        )}
      </div>

      {/* ── Photo stack column ───────────────────────────────────────────── */}
      <div className="relative w-full md:w-[40%] flex items-center justify-center px-6 md:px-0 py-12 md:py-0">
        {/*
          Container sized to fill most of the column.
          85% width + aspect-ratio lets the height auto-compute so
          absolutely-positioned stack items always fill it correctly.
        */}
        <div style={{ position: 'relative', width: '85%', height: '70vh' }}>
          {stack.map((item) => {
            const bg = hasPhotos
              ? undefined
              : PLACEHOLDER_COLORS[item.photoIdx % PLACEHOLDER_COLORS.length];

            return (
              <div
                key={item.key}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'none',
                }}
              >
                {hasPhotos ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[item.photoIdx]}
                    alt=""
                    aria-hidden="true"
                    style={{
                      maxWidth: '92%',
                      maxHeight: '92%',
                      width: 'auto',
                      height: 'auto',
                      display: 'block',
                      transform: `rotate(${item.rotation}deg) scale(${item.scale})`,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '92%',
                      height: '92%',
                      background: bg,
                      transform: `rotate(${item.rotation}deg) scale(${item.scale})`,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
