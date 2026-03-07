"use client";

import { useEffect, useRef, useState } from "react";
import RadarChart from "./components/RadarChart";
import ProjectCards, { type DebugMeta } from "./components/ProjectCards";
import DesignPhilosophy from "./components/DesignPhilosophy";
import MorphingImages from "./components/MorphingImages";
import projectsData from "@/src/data/projects.json";

// Inline underline-draw component for hero philosophy line
function UnderlineWord({ word, show, duration }: { word: string; show: boolean; duration: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {word}
      <span style={{ position: 'absolute', bottom: -2, left: 0, height: 2, background: 'white', width: show ? '100%' : '0%', transition: show ? `width ${duration}ms ease-out` : 'none', display: 'block' }} />
    </span>
  );
}

const NAV_ITEMS = [
  { label: 'HOME',       id: 'hero' },
  { label: 'TRAJECTORY', id: 'trajectory' },
  { label: 'PHILOSOPHY', id: 'design-philosophy' },
  { label: 'WORKS',      id: 'project-selection' },
  { label: 'CONTACT',    id: 'contact-bottom' },
] as const;

const CATEGORY_IMAGES = [
  '/images/categories/1_Public-Realm_01.png',
  '/images/categories/2_Place_01.png',  
  '/images/categories/3_Interactivity_01.png',
  '/images/categories/4_Data-Driven_01.png',
  '/images/categories/5_Strategy_01.png',
  '/images/categories/6_User-Oriented_01.png',
];

// ── Multi-segment typewriter with inter-segment pauses and erase-on-reset.
// resetKey increment triggers erase → retype from scratch.
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

export default function Home() {
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) {
      window.scrollTo({ top: hero.offsetTop, behavior: "instant" });
    }
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroResetKey, setHeroResetKey] = useState(0);
  const [showUnderlines, setShowUnderlines] = useState([false, false, false, false]);
  const [heroIsVertical, setHeroIsVertical] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const check = () => setHeroIsVertical(window.innerWidth < heroVerticalBreakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  // heroVerticalBreakpoint is a compile-time constant — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Secret "debug" key sequence toggle ───────────────────────────────────────
  useEffect(() => {
    const SEQ = 'debug';
    const TIMEOUT = 2000; // ms — window to type the full sequence
    let buffer = '';
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is inside any input / textarea / contenteditable
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      buffer += e.key.toLowerCase();
      // Only keep the last N characters matching the sequence length
      if (buffer.length > SEQ.length) buffer = buffer.slice(-SEQ.length);

      clearTimeout(timerId);
      if (buffer === SEQ) {
        buffer = '';
        setShowDebug(prev => {
          const next = !prev;
          setDebugFlash(next ? '🔧 Debug ON' : '🔧 Debug OFF');
          return next;
        });
      } else {
        timerId = setTimeout(() => { buffer = ''; }, TIMEOUT);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); clearTimeout(timerId); };
  }, []);

  // Global Design parameters
  const grainOpacity        = 0.20;        // change here to adjust grain intensity everywhere (background + cards)
  const whiteGrainOpacity   = 0.70;        // grain intensity on white areas (contact sections + Works framing)

  // ── Header controls ──────────────────────────────────────────────────────────
  const menuSquareSize        = 20;                          // px   — width & height of the white square / X icon
  const menuSquareRadius      = 0;                           // px   — corner radius of the white square (0 = sharp)
  const headerNamePaddingLeft = 37;                          // px   — gap from left edge to "ENOL VALLINA"
  const headerMenuPaddingRight= 37;                          // px   — gap from right edge to the menu button
  const headerNameSize        = '1.0rem';                  // size — font-size for "ENOL VALLINA" (e.g. '1rem', '14px')
  const headerNameFont        = 'var(--font-sans)';          // font — font family for "ENOL VALLINA"
  const headerNameBold        = true;                       // bool — true = bold, false = normal weight

  // ── Hero section: text content ───────────────────────────────────────────────
  const heroSeg1     = "Hi, I'm Enol Vallina,";
  const heroBoldName = 'Enol Vallina';                              // substring of heroSeg1 rendered bold
  const heroSeg2     = "architect by training, researcher by habit.";
  const heroSeg3     = "I use design to question, reveal, and reshape the systems behind the places we share.";
  // Derived positions for rendering
  const heroBoldStart = heroSeg1.indexOf(heroBoldName);
  const heroBoldEnd   = heroBoldStart + heroBoldName.length;
  const heroSeg2Start = heroSeg1.length;
  const heroSeg3Start = heroSeg1.length + heroSeg2.length;

  // ── Hero section: typewriter ──────────────────────────────────────────────────
  const heroTypingSpeed      = 40;    // ms per character while typing
  const heroErasingSpeed     = 15;    // ms per character while erasing on HOME reset
  const heroPauseAfterSeg1   = 1200;  // ms pause after segment 1
  const heroPauseAfterSeg2   = 1200;  // ms pause after segment 2
  const heroCursorBlinkSpeed = 500;   // ms cursor blink interval (on + off = 2× this value)

  // ── Hero section: word underlines ─────────────────────────────────────────────
  const underlineDelay    = 500;  // ms after typing done before first underline draws
  const underlineStagger  = 200;  // ms between successive underlines
  const underlineDuration = 300;  // ms for each underline to draw left → right

  // ── Hero section: morphing category images ────────────────────────────────────
  const morphTransitionDuration = 1750;  // ms for the WebGL warp transition between images
  const morphPauseDuration      = 0;     // ms each image stays fully visible before morphing
  const morphIntensity          = 0.8;   // warp strength (0.0 = plain crossfade, 1.0 = heavy distortion)
  const morphImageSize          = '30vw'; // canvas size in side-by-side (horizontal) layout
  const heroImageSizeVertical   = '75vw'; // canvas size in vertical/stacked layout
  const heroVerticalBreakpoint  = 1024;   // px — window width below which layout stacks vertically

  // ── Contact sections shape controls ─────────────────────────────────────────
  // Shared geometry for the top notch (Section 1) and the bottom notch (Section 7).
  const contactNotchHeight      = 200;  // px — depth of the notch cut-out
  const contactNotchWidth       = 30;   // %  — width of the notch (centered)
  const contactHeadingPadding          = 500;  // px — white space between heading and the notch edge
  const contactContainerRadius         = 25;   // px — outer corner radius of the white container (top corners on S1, bottom corners on S7)
  const contactHomeButtonEdgePadding   = 80;   // px — gap: outer page edge → HOME button
  const contactHomeButtonContainerPadding = 50; // px — gap: HOME button → white container edge
  // Derived: total dark band height (both gaps + ~30 px for the button itself)
  const contactSectionEdge = contactHomeButtonEdgePadding + 30 + contactHomeButtonContainerPadding;
  // Derived: left/right notch edge positions (auto-centered from contactNotchWidth)
  const contactNotchLeft  = (100 - contactNotchWidth) / 2;
  const contactNotchRight = 100 - contactNotchLeft;

  // ── Works section dark-shape controls ──────────────────────────────────────
  // These variables control the white framing panels that surround the dark chart area.
  const darkShapeTopPadding         = 65;    // px — white band between section top edge and dark area
  const darkShapeBottomCornerRadius = 20;     // px — rounds the inner top corners of the bottom white panels
  const darkShapeBottomCornerWidth  = '20%'; // width of each white bottom corner panel (left and right)
  const darkShapeBottomPanelHeight  = 60;    // px — height of the white bottom panels
  
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  // ── Hero: typewriter ──────────────────────────────────────────────────────────
  const { displayed: heroText, done: heroDone } = useHeroTypewriter(
    [heroSeg1, heroSeg2, heroSeg3],
    [heroPauseAfterSeg1, heroPauseAfterSeg2],
    heroTypingSpeed,
    heroErasingSpeed,
    heroResetKey,
  );

  // ── Hero: underline reveal — staggered after typing completes ─────────────────
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

  // ── Hero: derived render splits ────────────────────────────────────────────────
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

  // ── Project selection — driven by RadarChart play button ─────────────────
  const [selectedProjectIds,     setSelectedProjectIds]     = useState<string[]>([]);
  const [selectedProjectScores,  setSelectedProjectScores]  = useState<Record<string, number>>({});
  const [lastRadarValues,        setLastRadarValues]        = useState<Record<string, number>>({});
  const [lastPresetName,         setLastPresetName]         = useState<string | null>(null);
  const [lastDebugMeta,          setLastDebugMeta]          = useState<DebugMeta | null>(null);
  const [showDebug,              setShowDebug]              = useState(false);
  const [debugFlash,             setDebugFlash]             = useState<string | null>(null);

  // Clear debug flash after 1 s
  useEffect(() => {
    if (!debugFlash) return;
    const t = setTimeout(() => setDebugFlash(null), 1000);
    return () => clearTimeout(t);
  }, [debugFlash]);

  const resetHero = () => setHeroResetKey(k => k + 1);

  const handleRadarPlay = (radarValues: Record<string, number>, presetName: string | null = null) => {
    const MATCH_THRESHOLD      = 20;
    const DOMINANCE_THRESHOLD  = 80;
    const DOMINANCE_MULTIPLIER = 2;
    const MAX_PROJECTS         = 15;

    type Project = typeof projectsData.projects[number];

    // Category label (from projects.json `category` field) → radar key
    const CAT_LABEL_TO_KEY: Record<string, string> = {
      'Interactive':   'interactivity',
      'User-Oriented': 'userOriented',
      'Strategy':      'strategy',
      'Public Realm':  'publicRealm',
      'Data-Driven':   'dataDriven',
      'Places':        'places',
    };

    // ── 1. Detect dominant categories ──────────────────────────────────────
    const dominantKeys = Object.entries(radarValues)
      .filter(([, v]) => v >= DOMINANCE_THRESHOLD)
      .map(([k]) => k);

    // Single-dominant: exactly one category maxed out AND all others < 30%
    const maxedKeys = Object.entries(radarValues).filter(([, v]) => v >= 100).map(([k]) => k);
    const allOthersLow = Object.entries(radarValues)
      .filter(([k]) => !maxedKeys.includes(k))
      .every(([, v]) => v < 30);
    const singleDominantKey = (maxedKeys.length === 1 && allOthersLow) ? maxedKeys[0] : null;

    // ── 2. Detect preset-boosted projects ───────────────────────────────────
    const presetBoostedIds: string[] = presetName
      ? projectsData.projects
          .filter(p => {
            const presets = (p.presets as (string | string[])[] | null) ?? [];
            return presets.some(item =>
              typeof item === 'string'
                ? item.toUpperCase() === presetName.toUpperCase()
                : Array.isArray(item) && item.some(s => s.toUpperCase() === presetName.toUpperCase())
            );
          })
          .map(p => p.id)
      : [];

    // ── 3. Compute scores ───────────────────────────────────────────────────
    const domBonusMap: Record<string, number> = {};
    const scoredRows = projectsData.projects.map(p => {
      // Base score: dot product of radar values × project category scores
      const raw = Object.entries(p.categoryScores as Record<string, number>)
        .reduce((sum, [key, val]) => sum + (radarValues[key] ?? 0) * val / 100, 0);

      const priority   = (p as Project & { priority?: number }).priority ?? 0;
      const primaryKey = CAT_LABEL_TO_KEY[p.category] ?? '';

      // Dominance bonus: project's primary category is in a dominated axis
      const domBonus = (primaryKey && dominantKeys.includes(primaryKey))
        ? (radarValues[primaryKey] ?? 0) * DOMINANCE_MULTIPLIER
        : 0;
      domBonusMap[p.id] = domBonus;

      return {
        id: p.id,
        rawScore:     +raw.toFixed(2),
        priorityBonus: priority,
        domBonus,
        finalScore:   +(raw + priority * 100 + domBonus).toFixed(2),
        primaryKey,
      };
    });

    // ── 4. Filter by threshold ──────────────────────────────────────────────
    let matched = scoredRows.filter(r => r.finalScore >= MATCH_THRESHOLD);

    // ── 5. Sort strategy ────────────────────────────────────────────────────
    // Tier 1: preset-boosted projects first
    // Tier 2: if single category dominates, primary-category-matching projects next
    // Tier 3: descending score
    matched.sort((a, b) => {
      const aPreset = presetBoostedIds.includes(a.id) ? 1 : 0;
      const bPreset = presetBoostedIds.includes(b.id) ? 1 : 0;
      if (bPreset !== aPreset) return bPreset - aPreset;

      if (singleDominantKey) {
        const aMatch = a.primaryKey === singleDominantKey ? 1 : 0;
        const bMatch = b.primaryKey === singleDominantKey ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
      }

      return b.finalScore - a.finalScore;
    });

    matched = matched.slice(0, MAX_PROJECTS);

    // ── 6. Debug logging ────────────────────────────────────────────────────
    console.group('[RadarChart → ProjectCards] Play triggered');
    console.log('Radar values:', radarValues);
    console.log('Dominant keys (≥' + DOMINANCE_THRESHOLD + '%):', dominantKeys, '| Single dominant:', singleDominantKey);
    console.log('Preset boosted:', presetBoostedIds);
    console.table(scoredRows);
    console.log('Matched & sorted:', matched.map(r => `${r.id} (${r.finalScore})`).join(', ') || '— none —');
    console.groupEnd();

    // ── 7. Update state ─────────────────────────────────────────────────────
    const scores: Record<string, number> = {};
    matched.forEach(r => { scores[r.id] = r.finalScore; });

    const newDebugMeta: DebugMeta = {
      dominantCategoryKeys: dominantKeys,
      singleDominantKey,
      presetBoostedIds,
      domBonusMap,
      dominanceThreshold: DOMINANCE_THRESHOLD,
    };

    setSelectedProjectIds(matched.map(r => r.id));
    setSelectedProjectScores(scores);
    setLastRadarValues(radarValues);
    setLastPresetName(presetName);
    setLastDebugMeta(newDebugMeta);
    scrollToSection('project-cards');
  };

  const scrollToSectionBottom = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Fixed grain overlay — visible through all transparent dark sections ── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ opacity: grainOpacity, zIndex: 1 }}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="page-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <filter id="white-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#page-noise)" />
      </svg>

      {/* ── Fixed Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center transition-all duration-200"
        style={{
          paddingLeft: headerNamePaddingLeft,
          paddingRight: headerMenuPaddingRight,
          background: (scrolled || menuOpen) ? 'rgba(28, 28, 29, 0.92)' : 'transparent',
          backdropFilter: (scrolled || menuOpen) ? 'blur(8px)' : 'none',
          borderBottom: (scrolled || menuOpen) ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        {/* Name — also a HOME button */}
        <button
          onClick={() => { scrollToSection('hero'); resetHero(); }}
          className="shrink-0 hover:text-white/70 transition-colors cursor-pointer"
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'white',
            fontSize: headerNameSize,
            fontFamily: headerNameFont,
            fontWeight: headerNameBold ? 'bold' : 'normal',
            letterSpacing: '0.05em',
          }}
        >
          ENOL VALLINA
        </button>

        {/* Nav items — slide in from right with stagger */}
        <div className="flex-1 flex items-center justify-end overflow-hidden">
          {NAV_ITEMS.flatMap((item, i) => {
            const btn = (
              <button
                key={item.label}
                onClick={() => { if (item.id === 'trajectory') scrollToSectionBottom(item.id); else scrollToSection(item.id); setMenuOpen(false); if (item.id === 'hero') resetHero(); }}
                className="font-sans text-white text-xs uppercase tracking-[0.2em] px-3 shrink-0 hover:text-white/55 transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  background: 'none', border: 'none',
                  transform: menuOpen ? 'translateX(0)' : 'translateX(200%)',
                  opacity: menuOpen ? 1 : 0,
                  transition: 'transform 320ms ease, opacity 320ms ease',
                  transitionDelay: `${menuOpen ? (NAV_ITEMS.length - 1 - i) * 60 : i * 60}ms`,
                  pointerEvents: menuOpen ? 'auto' : 'none',
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
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: '0.6rem',
                    transform: menuOpen ? 'translateX(0)' : 'translateX(200%)',
                    opacity: menuOpen ? 1 : 0,
                    transition: 'transform 320ms ease, opacity 320ms ease',
                    transitionDelay: `${menuOpen ? (NAV_ITEMS.length - 1 - 0) * 60 : 0}ms`,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                >|</span>
              )];
            }
            return [btn];
          })}
        </div>

        {/* Hamburger / X toggle button */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="shrink-0 ml-4 relative transition-transform duration-200 hover:scale-[1.15] cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 4, width: 26, height: 26 }}
        >
          {/* White square (closed state) */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${menuOpen ? 0.4 : 1})`,
            width: menuSquareSize, height: menuSquareSize, background: 'white', borderRadius: menuSquareRadius,
            opacity: menuOpen ? 0 : 1,
            transition: 'opacity 200ms ease, transform 200ms ease',
            display: 'block',
          }} />
          {/* X icon (open state) */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${menuOpen ? 1 : 0.4})`,
            width: menuSquareSize, height: menuSquareSize,
            opacity: menuOpen ? 1 : 0,
            transition: 'opacity 200ms ease, transform 200ms ease',
            display: 'block',
          }}>
            <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, marginTop: '-0.75px', background: 'white', transform: 'rotate(45deg)', display: 'block', borderRadius: 1 }} />
            <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, marginTop: '-0.75px', background: 'white', transform: 'rotate(-45deg)', display: 'block', borderRadius: 1 }} />
          </span>
        </button>

        {/* Grain overlay on header */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
          <rect width="100%" height="100%" filter="url(#page-noise)" />
        </svg>
      </header>

      {/* ── Section 1: Contact (top) ── */}
      <section
        id="contact-top"
        className="relative z-2"
        style={{ paddingTop: contactSectionEdge }}
      >
        {/* Outer wrapper — border-radius on top corners; overflow:hidden clips the inner container.
            clip-path and border-radius cannot coexist on the same element, so the radius
            lives here and the notch clip-path lives on the inner div. */}
        <div
          className="mx-10"
          style={{
            borderTopLeftRadius: contactContainerRadius,
            borderTopRightRadius: contactContainerRadius,
            overflow: 'hidden',
          }}
        >
        {/* White container — clip-path carves the notch at top-center.
            The section background is transparent, so the dark gradient
            + grain shows through the notch naturally. */}
        <div
          className="relative bg-white"
          style={{
            clipPath: `polygon(0 0, ${contactNotchLeft}% 0, ${contactNotchLeft}% ${contactNotchHeight}px, ${contactNotchRight}% ${contactNotchHeight}px, ${contactNotchRight}% 0, 100% 0, 100% 100%, 0 100%)`,
          }}
        >
          {/* Grain overlay */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none', zIndex: 0 }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>

          {/* Spacer matching the notch height */}
          <div style={{ height: contactNotchHeight }} />

          {/* "Contact" heading on the white area */}
          <div className="relative flex justify-center" style={{ paddingTop: 32, paddingBottom: contactHeadingPadding, zIndex: 1 }}>
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Contact</h2>
          </div>
        </div>
        </div>{/* end outer radius wrapper */}

        {/* HOME button — above the white container, anchored from the outer page edge */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ top: contactHomeButtonEdgePadding }}
        >
          <button
            onClick={() => { scrollToSection('hero'); resetHero(); }}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer pointer-events-auto"
          >
            <span>Home</span>
            <span>▼</span>
          </button>
        </div>

        {/* Icons — absolutely positioned inside the dark notch */}
        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]" style={{ top: contactSectionEdge }}>
          {/* Instagram */}
          <a
            href="https://www.instagram.com/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://linkedin.com/in/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>

          {/* Separator */}
          <div className="w-4/5 h-0.75 bg-white" />

          {/* Email */}
          <a
            href="mailto:hello@enolvallina.com"
            aria-label="Email"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Section 2: My Trajectory ── */}
      <section
        id="trajectory"
        className="min-h-screen flex flex-col items-center justify-center py-20"
      >
        <h2 className="font-serif font-bold text-white text-4xl mb-12"> {/* Trajectory */}</h2>

        <div className="w-full px-10" onContextMenu={(e) => e.preventDefault()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/trajectory/2026-01-20_Timeline.jpg"
            alt="My Trajectory — Timeline"
            className="w-full h-auto img-protected"
          />
        </div>
      </section>

      {/* ── Section 3: Hero / Welcome — landing point ── */}
      <section
        id="hero"
        className="h-screen flex flex-col"
      >
        {/* Top nav hint — scroll up to Trajectory */}
        <div className="flex justify-center pt-16">
          <button
            onClick={() => scrollToSectionBottom("trajectory")}
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
            alignItems: 'center',
            justifyContent: heroIsVertical ? 'center' : undefined,
            gap: heroIsVertical ? '2rem' : 0,
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

        {/* Bottom nav hint — scroll down to Projects */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => scrollToSection("design-philosophy")}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
          >
            <span>Approach & Work</span>
            <span>▼</span>
          </button>
        </div>

      </section>

      {/* ── Section 4: Design Philosophy ── */}
      <DesignPhilosophy onScrollDown={() => scrollToSection('project-selection')} />

      {/* ── Section 5: Project Selection by Type ── */}
      <section
        id="project-selection"
        className="relative h-screen flex flex-col items-center px-10 pt-20 pb-10"
      >
        {/* White side strips — full section height, same width as px-10 margins */}
        <div className="absolute inset-y-0 left-0 w-10 bg-white z-2 pointer-events-none">
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute inset-y-0 right-0 w-10 bg-white z-2 pointer-events-none">
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>

        {/* White top strip — darkShapeTopPadding controls how far down the dark area starts */}
        <div className="absolute top-0 left-0 right-0 bg-white z-2 pointer-events-none" style={{ height: darkShapeTopPadding }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>

        {/* White bottom panels — darkShapeBottomCornerWidth controls panel width;
            darkShapeBottomPanelHeight controls height;
            darkShapeBottomCornerRadius rounds the inner top corners */}
        <div className="absolute bottom-0 left-0 bg-white z-2 pointer-events-none"
          style={{ width: darkShapeBottomCornerWidth, height: darkShapeBottomPanelHeight, borderTopRightRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 bg-white z-2 pointer-events-none"
          style={{ width: darkShapeBottomCornerWidth, height: darkShapeBottomPanelHeight, borderTopLeftRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>

        {/* Content — above white panels */}
        <div className="h-10" />
        <h2 className="relative z-10 font-serif font-bold text-white text-4xl text-center mb-3">
          Work Selection
        </h2>
        <p
          className="relative z-10 font-sans text-white/40 text-sm leading-relaxed text-center mx-auto"
          style={{ maxWidth: "65%" }}
        >
            Please configure a custom project showcase based on the design solution categories.
        </p>
        <div className="h-5" />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-4 w-full min-h-0">
          <RadarChart onPlay={handleRadarPlay} />
        </div>
      </section>

      {/* ── Section 6: Project Cards ── */}
      <ProjectCards selectedProjectIds={selectedProjectIds} selectedProjectScores={selectedProjectScores} radarValues={lastRadarValues} activePresetName={lastPresetName} debugMeta={lastDebugMeta ?? undefined} showDebug={showDebug} />

      {/* ── Debug flash notification ── */}
      {debugFlash && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: '0.05em',
            padding: '6px 16px',
            borderRadius: 6,
            pointerEvents: 'none',
            backdropFilter: 'blur(6px)',
            animation: 'philosophy-cursor-blink 500ms step-end 2',
          }}
        >
          {debugFlash}
        </div>
      )}

      {/* ── Section 7: Contact (bottom) ── */}
      <section
        id="contact-bottom"
        className="relative z-2"
        style={{ paddingBottom: contactSectionEdge }}
      >
        {/* Outer wrapper — border-radius on bottom corners; overflow:hidden clips the inner container. */}
        <div
          className="mx-10"
          style={{
            borderBottomLeftRadius: contactContainerRadius,
            borderBottomRightRadius: contactContainerRadius,
            overflow: 'hidden',
          }}
        >
        {/* White container — clip-path carves the notch at bottom-center.
            The section background is transparent, so the dark gradient
            + grain shows through the notch naturally. */}
        <div
          className="relative bg-white"
          style={{
            clipPath: `polygon(0 0, 100% 0, 100% 100%, ${contactNotchRight}% 100%, ${contactNotchRight}% calc(100% - ${contactNotchHeight}px), ${contactNotchLeft}% calc(100% - ${contactNotchHeight}px), ${contactNotchLeft}% 100%, 0 100%)`,
          }}
        >
          {/* Grain overlay */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none', zIndex: 0 }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>

          {/* "Contact" heading on the white area */}
          <div className="relative flex justify-center" style={{ paddingTop: contactHeadingPadding, paddingBottom: 32, zIndex: 1 }}>
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Contact</h2>
          </div>

          {/* Spacer matching the notch height */}
          <div style={{ height: contactNotchHeight }} />
        </div>
        </div>{/* end outer radius wrapper */}

        {/* Icons — absolutely positioned inside the dark bottom notch */}
        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]" style={{ bottom: contactSectionEdge }}>
          {/* Instagram */}
          <a
            href="https://www.instagram.com/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://linkedin.com/in/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>

          {/* Separator */}
          <div className="w-4/5 h-0.75 bg-white" />

          {/* Email */}
          <a
            href="mailto:hello@enolvallina.com"
            aria-label="Email"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </a>
        </div>

        {/* HOME button — below the white container, anchored from the outer page edge */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ bottom: contactHomeButtonEdgePadding }}
        >
          <button
            onClick={() => { scrollToSection('hero'); resetHero(); }}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer pointer-events-auto"
          >
            <span>▲</span>
            <span>Home</span>
          </button>
        </div>
      </section>
    </>
  );
}
