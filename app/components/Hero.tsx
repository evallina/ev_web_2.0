'use client';

import { useEffect, useRef, useState } from 'react';
import MorphingImages from './MorphingImages';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  DESIGN VARIABLES — edit these to tune the hero section                    │
// ├─────────────────────────────────────────────────────────────────────────────┤
// ── Text content ──────────────────────────────────────────────────────────────
const heroSeg1     = "Hi, I'm Enol Vallina,";
const heroBoldName = 'Enol Vallina';                // substring of heroSeg1 rendered bold
const heroSeg2     = "architect by training, researcher by habit.";
const heroSeg3     = "I use design to question, reveal, and reshape the systems behind the places we share.";

// ── Typewriter timing ─────────────────────────────────────────────────────────
const heroTypingSpeed      = 40;    // ms per character while typing
const heroErasingSpeed     = 15;    // ms per character while erasing on HOME reset
const heroPauseAfterSeg1   = 1200;  // ms pause after segment 1
const heroPauseAfterSeg2   = 1200;  // ms pause after segment 2
const heroCursorBlinkSpeed = 500;   // ms cursor blink interval (on + off = 2× this value)

// ── Word underlines ───────────────────────────────────────────────────────────
const underlineDelay    = 500;  // ms after typing done before first underline draws
const underlineStagger  = 200;  // ms between successive underlines
const underlineDuration = 300;  // ms for each underline to draw left → right

// ── Morphing category images ──────────────────────────────────────────────────
const morphTransitionDuration = 1750;  // ms for the WebGL warp transition between images
const morphPauseDuration      = 0;     // ms each image stays fully visible before morphing
const morphIntensity          = 0.8;   // warp strength (0.0 = plain crossfade, 1.0 = heavy distortion)
const morphImageSize          = '30vw'; // canvas size in side-by-side (horizontal) layout
const heroImageSizeVertical   = '75vw'; // canvas size in vertical/stacked layout
const heroVerticalBreakpoint  = 1024;   // px — window width below which layout stacks vertically
// └─────────────────────────────────────────────────────────────────────────────┘

const CATEGORY_IMAGES = [
  '/images/categories/1_Public-Realm_01.png',
  '/images/categories/2_Place_01.png',
  '/images/categories/3_Interactivity_01.png',
  '/images/categories/4_Data-Driven_01.png',
  '/images/categories/5_Strategy_01.png',
  '/images/categories/6_User-Oriented_01.png',
];

// Derived positions (compile-time constants)
const heroBoldStart = heroSeg1.indexOf(heroBoldName);
const heroBoldEnd   = heroBoldStart + heroBoldName.length;
const heroSeg2Start = heroSeg1.length;
const heroSeg3Start = heroSeg1.length + heroSeg2.length;

// ── UnderlineWord ─────────────────────────────────────────────────────────────
function UnderlineWord({ word, show, duration }: { word: string; show: boolean; duration: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {word}
      <span style={{
        position: 'absolute', bottom: -2, left: 0, height: 2, background: 'white',
        width: show ? '100%' : '0%',
        transition: show ? `width ${duration}ms ease-out` : 'none',
        display: 'block',
      }} />
    </span>
  );
}

// ── Multi-segment typewriter with inter-segment pauses and erase-on-reset ─────
function useHeroTypewriter(
  segments: string[],
  pauses: number[],       // pauses[i] = delay (ms) after segment i (for i < last)
  typingSpeed: number,
  erasingSpeed: number,
  resetKey: number,
) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    let active = true;
    const fullText = segments.join('');
    // Cumulative boundary positions: boundaries[i] = index after segment i ends
    const boundaries: number[] = [];
    let acc = 0;
    for (const seg of segments) { acc += seg.length; boundaries.push(acc); }

    let timerId: ReturnType<typeof setTimeout>;

    const type = () => {
      if (!active) return;
      idxRef.current++;
      setDisplayed(fullText.slice(0, idxRef.current));

      if (idxRef.current >= fullText.length) {
        setDone(true);
        return;
      }

      // Pause at segment boundaries (except the last)
      const segIdx = boundaries.indexOf(idxRef.current);
      if (segIdx !== -1 && segIdx < segments.length - 1) {
        timerId = setTimeout(type, pauses[segIdx] ?? typingSpeed);
      } else {
        timerId = setTimeout(type, typingSpeed);
      }
    };

    const erase = () => {
      if (!active) return;
      if (idxRef.current > 0) {
        idxRef.current--;
        setDisplayed(fullText.slice(0, idxRef.current));
        timerId = setTimeout(erase, erasingSpeed);
      } else {
        timerId = setTimeout(type, typingSpeed);
      }
    };

    if (resetKey > 0) {
      setDone(false); // signal immediately so underline effect resets
      timerId = setTimeout(erase, erasingSpeed);
    } else {
      idxRef.current = 0;
      setDisplayed('');
      setDone(false);
      timerId = setTimeout(type, typingSpeed);
    }

    return () => { active = false; clearTimeout(timerId); };
  // Segments/pauses/speeds are compile-time constants — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return { displayed, done };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  resetKey:      number;
  onNavigateUp:  () => void;
  onNavigateDown: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Hero({ resetKey, onNavigateUp, onNavigateDown }: Props) {
  const [showUnderlines, setShowUnderlines] = useState([false, false, false, false]);
  const [heroIsVertical, setHeroIsVertical] = useState(false);

  useEffect(() => {
    const check = () => setHeroIsVertical(window.innerWidth < heroVerticalBreakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  // heroVerticalBreakpoint is a compile-time constant — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { displayed: heroText, done: heroDone } = useHeroTypewriter(
    [heroSeg1, heroSeg2, heroSeg3],
    [heroPauseAfterSeg1, heroPauseAfterSeg2],
    heroTypingSpeed,
    heroErasingSpeed,
    resetKey,
  );

  // Underline reveal — staggered after typing completes
  useEffect(() => {
    if (!heroDone) { setShowUnderlines([false, false, false, false]); return; }
    const timers = [0, 1, 2, 3].map(i =>
      setTimeout(
        () => setShowUnderlines(prev => prev.map((v, j) => j === i ? true : v)),
        underlineDelay + i * underlineStagger,
      )
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroDone]);

  // Derived render splits
  const heroLine1 = heroText.slice(0, Math.min(heroText.length, heroSeg2Start));
  const heroLine2 = heroText.length > heroSeg2Start
    ? heroText.slice(heroSeg2Start, Math.min(heroText.length, heroSeg3Start))
    : null;
  const heroLine3 = heroText.length > heroSeg3Start ? heroText.slice(heroSeg3Start) : null;
  const heroCursor = (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 3,
        height: '0.8em',
        background: 'white',
        marginLeft: 4,
        verticalAlign: 'middle',
        animation: `philosophy-cursor-blink ${heroCursorBlinkSpeed * 2}ms step-end infinite`,
      }}
    />
  );

  return (
    <section id="hero" className="h-screen flex flex-col">
      {/* Top nav hint — scroll up to Trajectory */}
      <div className="flex justify-center pt-16">
        <button
          onClick={onNavigateUp}
          className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
        >
          <span>▲</span>
          <span>My Trajectory</span>
        </button>
      </div>

      {/* Main content — side-by-side above heroVerticalBreakpoint, stacked below */}
      <div
        className="flex-1 flex"
        style={{
          flexDirection: heroIsVertical ? 'column' : 'row',
          alignItems:    'center',
          justifyContent: heroIsVertical ? 'center' : undefined,
          gap:            heroIsVertical ? '2rem' : 0,
        }}
      >
        {/* Text column */}
        <div style={{ width: heroIsVertical ? '100%' : '50%' }} className="pl-16 pr-8">
          <h1 className="font-serif font-normal text-[2.75rem] leading-[1.2] text-white">
            {/* Line 1: greeting with bold name */}
            <div>
              {heroLine1.slice(0, Math.min(heroLine1.length, heroBoldStart))}
              {heroLine1.length > heroBoldStart && (
                <span className="font-bold">
                  {heroLine1.slice(heroBoldStart, Math.min(heroLine1.length, heroBoldEnd))}
                </span>
              )}
              {heroLine1.length > heroBoldEnd && heroLine1.slice(heroBoldEnd)}
              {heroLine2 === null && heroCursor}
            </div>
            {/* Line 2: background */}
            {heroLine2 !== null && (
              <div>
                {heroLine2}
                {heroLine3 === null && heroCursor}
              </div>
            )}
            {/* Line 3: philosophy — plain while typing, underlined after done */}
            {heroLine3 !== null && (
              <div>
                {heroDone ? (
                  <>
                    I use Design to{' '}
                    <UnderlineWord word="question"        show={showUnderlines[0]} duration={underlineDuration} />,{' '}
                    <UnderlineWord word="reveal"          show={showUnderlines[1]} duration={underlineDuration} />, and{' '}
                    <UnderlineWord word="reshape"         show={showUnderlines[2]} duration={underlineDuration} />{' '}
                    the systems behind the{' '}
                    <UnderlineWord word="places we share" show={showUnderlines[3]} duration={underlineDuration} />.
                  </>
                ) : heroLine3}
                {heroCursor}
              </div>
            )}
          </h1>
        </div>

        {/* Image column */}
        <div style={{ width: heroIsVertical ? '100%' : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: heroIsVertical ? 0 : '3rem' }}>
          <MorphingImages
            images={CATEGORY_IMAGES}
            morphTransitionDuration={morphTransitionDuration}
            morphPauseDuration={morphPauseDuration}
            morphIntensity={morphIntensity}
            style={{
              width:     heroIsVertical ? heroImageSizeVertical : morphImageSize,
              height:    heroIsVertical ? heroImageSizeVertical : morphImageSize,
              maxHeight: '65vh',
            }}
          />
        </div>
      </div>

      {/* Bottom nav hint — scroll down to Philosophy */}
      <div className="flex justify-center pb-8">
        <button
          onClick={onNavigateDown}
          className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
        >
          <span>Approach & Work</span>
          <span>▼</span>
        </button>
      </div>
    </section>
  );
}
