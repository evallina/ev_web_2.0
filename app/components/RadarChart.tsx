'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import catDesc from '@/src/data/categoryDescriptions.json';

// ── Design variables (edit these to restyle the chart) ─────────────────────────
const activeStrokeWidth  = 3;            // line weight of the active polygon
const ghostStrokeWidth   = 2;            // line weight of the ghost (history) polygons
const activeFillOpacity  = 0.04;         // white fill opacity inside the active polygon
const categoryTextSize   = 'text-base';  // Tailwind-style size token for category labels
const arrowColor         = 'white';      // color of the + / − buttons
const arrowOpacity       = 0.30;         // resting opacity of the + / − buttons (0–1)
const arrowFontSize      = 25;           // font size of the + / − buttons in viewBox units
const popoutFadeDuration = 1100;         // ms for popout fade in / out
const popoutBorderRadius = 0;            // px corner radius of the popout card
const popoutOpenScale    = 1.4;          // label scale factor while its popout is open
const labelHoverScale    = 1.2;          // label scale factor on mouse hover
const labelScaleDuration = 400;          // ms for label scale transition

// ── Preset button styles ───────────────────────────────────────────────────────
const presetNames            = ['Research', 'Spatial Experiences', 'Systems    Thinking'] as const;
const downArrowMarginTop     = 40;                        // px gap above the down-arrow button
const presetTextSize         = 'text-xs';                 // Tailwind font-size class
const presetBorderColor      = 'rgb(255,255,255,0.5)';  // static border when inactive - rgb(255,255,255,0.1)
const presetBorderAnimColor  = '#FFFFFF';                 // animated border color when active
// IMPORTANT: fill colors must be opaque — the border trick works by placing a spinning
// gradient behind the button; the button's solid fill hides the gradient in the center,
// leaving it visible only through the border-width gap at the edges.
// For a "transparent" look on the dark background, use the page bg color: #1c1c1d.
const presetFillColor        = 'transparent';                 // fill when inactive (match page bg) '#1c1c1d'
const presetTextColor        = 'rgba(255,255,255,0.6)';   // text when inactive
const presetFillColorHover   = 'transparent';                 // fill on hover (slightly lighter)#2b2b2c
const presetTextColorHover   = '#FFFFFF';                 // text on hover
const presetFillColorPressed = '#FFFFFF';                 // fill when active (solid white)
const presetTextColorPressed = '#282829';                 // text when active
const presetBorderRadius     = 30;                         // px corner radius for buttons
const presetBorderWidth      = 1;                          // px border thickness
const presetButtonHeight     = 45;                         // px fixed height for all buttons

// ── Chart geometry ─────────────────────────────────────────────────────────────
const CX      = 400;   // SVG viewBox center x  (viewBox: 0 0 800 760)
const CY      = 360;   // SVG viewBox center y  (shifted down so top labels have room)
const OUTER_R = 210;   // outer chart radius in viewBox units  (175 × 1.2)
const LABEL_R = 306;   // distance from center to label anchor (255 × 1.2)
const TENSION = 0.35;  // Catmull-Rom spline tension (0 = sharp, 1 = very round)

// Tailwind text size → SVG viewBox fontSize units
const TEXT_SIZE_MAP: Record<string, number> = {
  'text-xs':   11,
  'text-sm':   13,
  'text-base': 15,
  'text-lg':   18,
  'text-xl':   20,
};
const catFontSize = TEXT_SIZE_MAP[categoryTextSize] ?? 12;

// Categories in clockwise order starting from top
const CATEGORIES = [
  { name: 'Places',        angle: -90 },
  { name: 'Strategy',      angle: -30 },
  { name: 'Public Realm',  angle:  30 },
  { name: 'Data-Driven',   angle:  90 },
  { name: 'Interactivity', angle: 150 },
  { name: 'User Oriented', angle: 210 },
] as const;

// categoryScores keys in projects.json, in the same order as CATEGORIES
const CAT_KEYS = ['places', 'strategy', 'publicRealm', 'dataDriven', 'interactivity', 'userOriented'] as const;

const DEFAULT_VALUES = [70, 70, 70, 70, 70, 70];

// ── Presets ────────────────────────────────────────────────────────────────────
// Values in CAT_KEYS order: places, strategy, publicRealm, dataDriven, interactivity, userOriented
const PRESETS = [
  { name: presetNames[0], values: [70,  60,  20, 100, 100,  30] },
  { name: presetNames[1], values: [100, 10,  90,  10,  10, 100] },
  { name: presetNames[2], values: [80,  70, 100,  20,  10,  50] },
];

const PRESET_ANIM_DURATION  = 650;  // ms for preset morph animation (initial auto-play + manual clicks)
const autoPlayPauseDuration = 150;  // ms to hold each preset during initial auto-play

// ── Reset auto-play timing (independent from initial auto-play) ────────────────
const resetAutoPlayPauseDuration = 100; // ms to hold each preset during reset auto-play
const resetPresetAnimDuration    = 400;  // ms for each chart morph during reset auto-play
// Total ms the reset sequence takes (initial delay + 3 steps + final morph):
const RESET_TOTAL_DURATION = 200 + (resetPresetAnimDuration + resetAutoPlayPauseDuration) * 3 + resetPresetAnimDuration;
const resetIconRotations   = 3; // how many full rotations the reset icon makes during the sequence

// Ghost stroke opacities indexed oldest → newest (5 slots)
const GHOST_OPACITIES = [0.08, 0.14, 0.20, 0.28, 0.40];

// ── Geometry helpers ───────────────────────────────────────────────────────────
const toRad = (deg: number) => (deg * Math.PI) / 180;
const fmt   = (n: number)   => n.toFixed(2);

function spokePoint(i: number, value: number) {
  const a = toRad(CATEGORIES[i].angle);
  const r = (value / 100) * OUTER_R;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function spokeEnd(i: number) {
  const a = toRad(CATEGORIES[i].angle);
  return { x: CX + OUTER_R * Math.cos(a), y: CY + OUTER_R * Math.sin(a) };
}

function labelPos(i: number) {
  const a = toRad(CATEGORIES[i].angle);
  return { x: CX + LABEL_R * Math.cos(a), y: CY + LABEL_R * Math.sin(a) };
}

function smoothClosedPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  const cmds: string[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) cmds.push(`M ${fmt(p1.x)} ${fmt(p1.y)}`);
    const cp1x = p1.x + (p2.x - p0.x) * TENSION / 3;
    const cp1y = p1.y + (p2.y - p0.y) * TENSION / 3;
    const cp2x = p2.x - (p3.x - p1.x) * TENSION / 3;
    const cp2y = p2.y - (p3.y - p1.y) * TENSION / 3;
    cmds.push(`C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`);
  }
  return cmds.join(' ') + ' Z';
}

// ── Category data ──────────────────────────────────────────────────────────────
type CatKey = typeof CAT_KEYS[number];
const catData = catDesc as Record<CatKey, { description: string; image: string }>;

// Popout width (px)
const POPOUT_W = 300;

// ── Component ──────────────────────────────────────────────────────────────────
interface RadarChartProps {
  onPlay?: (values: Record<string, number>) => void;
}

// Popout anchor positioning:
// `above = false`: wrapper top = label bottom edge, card first then − button below.
// `above = true`:  wrapper bottom = label top edge, + button first then card below.
// `bottom` (px from viewport bottom) is pre-computed so the wrapper can use CSS
// `bottom:` without needing window.innerHeight at render time.
interface PopoutPos { left: number; top: number; bottom: number; above: boolean; }

export default function RadarChart({ onPlay }: RadarChartProps) {
  const [values,        setValues]        = useState<number[]>([...DEFAULT_VALUES]);
  const [ghosts,        setGhosts]        = useState<number[][]>([]);
  const [arrowKeys,     setArrowKeys]     = useState<Record<string, number>>({});
  const [textKeys,      setTextKeys]      = useState<Record<number, number>>({});
  const [textDir,       setTextDir]       = useState<Record<number, 'up' | 'down'>>({});
  const [hoveredCat,      setHoveredCat]      = useState<number | null>(null);
  const [hoveredPreset,   setHoveredPreset]   = useState<string | null>(null);
  const [activePreset,    setActivePreset]    = useState<string | null>(null);
  const [isAnimating,     setIsAnimating]     = useState(false);
  const [resetSpinning,  setResetSpinning]  = useState(false);

  const [openCat,       setOpenCat]       = useState<number | null>(null);
  const [popoutPos,     setPopoutPos]     = useState<PopoutPos | null>(null);
  const [popoutVisible, setPopoutVisible] = useState(false);

  const svgRef             = useRef<SVGSVGElement>(null);
  const containerRef       = useRef<HTMLDivElement>(null);
  const closeTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef       = useRef<number | null>(null);
  const autoTimersRef      = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasAutoPlayedRef   = useRef(false);
  const spinTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of values at the moment a preset animation starts.
  const animStartRef       = useRef<number[]>([...DEFAULT_VALUES]);
  // Stable ref to animateToPreset — updated each render so effects always call the latest version.
  const animateToPresetRef = useRef<(target: number[], name: string | null, animDuration?: number) => void>(() => {});

  // Cancel preset animation on unmount.
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  const cancelAutoPlay = useCallback(() => {
    autoTimersRef.current.forEach(clearTimeout);
    autoTimersRef.current = [];
  }, []);

  // Stops the reset-button spin animation and clears its stop-timer.
  const stopResetSpin = useCallback(() => {
    setResetSpinning(false);
    if (spinTimerRef.current) { clearTimeout(spinTimerRef.current); spinTimerRef.current = null; }
  }, []);

  // Schedules the full preset sequence. Cancels any running sequence first.
  // Called automatically on first scroll-into-view, and manually by the reset button.
  const runAutoPlaySequence = useCallback(() => {
    cancelAutoPlay();
    const STEP = PRESET_ANIM_DURATION + autoPlayPauseDuration;
    const schedule = (delay: number, fn: () => void) => {
      const id = setTimeout(fn, delay);
      autoTimersRef.current.push(id);
    };
    schedule(500,            () => animateToPresetRef.current(PRESETS[0].values, presetNames[0]));
    schedule(500 + STEP,     () => animateToPresetRef.current(PRESETS[1].values, presetNames[1]));
    schedule(500 + STEP * 2, () => animateToPresetRef.current(PRESETS[2].values, presetNames[2]));
    schedule(500 + STEP * 3, () => animateToPresetRef.current([...DEFAULT_VALUES], null));
  }, [cancelAutoPlay]);

  // Like runAutoPlaySequence but uses reset-specific timing, and drives the spin animation.
  const runResetAutoPlaySequence = useCallback(() => {
    cancelAutoPlay();
    setResetSpinning(true);
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    // Stop spin exactly when the last morph finishes
    spinTimerRef.current = setTimeout(() => {
      setResetSpinning(false);
      spinTimerRef.current = null;
    }, RESET_TOTAL_DURATION);

    const STEP = resetPresetAnimDuration + resetAutoPlayPauseDuration;
    const schedule = (delay: number, fn: () => void) => {
      const id = setTimeout(fn, delay);
      autoTimersRef.current.push(id);
    };
    schedule(500,           () => animateToPresetRef.current(PRESETS[0].values, presetNames[0], resetPresetAnimDuration));
    schedule(500 + STEP,    () => animateToPresetRef.current(PRESETS[1].values, presetNames[1], resetPresetAnimDuration));
    schedule(500 + STEP * 2, () => animateToPresetRef.current(PRESETS[2].values, presetNames[2], resetPresetAnimDuration));
    schedule(500 + STEP * 3, () => animateToPresetRef.current([...DEFAULT_VALUES], null, resetPresetAnimDuration));
  }, [cancelAutoPlay, stopResetSpin]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjust = (i: number, delta: number) => {
    cancelAutoPlay();
    stopResetSpin();
    // Cancel any in-progress preset animation and clear the selection.
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setIsAnimating(false);
    setActivePreset(null);

    setValues(prev => {
      const next = [...prev];
      next[i] = Math.max(0, Math.min(100, next[i] + delta));
      return next;
    });
    const arrowKey = `${i}-${delta > 0 ? 'up' : 'down'}`;
    setArrowKeys(prev => ({ ...prev, [arrowKey]: (prev[arrowKey] ?? 0) + 1 }));
    setTextDir(prev => ({ ...prev, [i]: delta > 0 ? 'up' : 'down' }));
    setTextKeys(prev => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }));
  };

  const closePopout = () => {
    setPopoutVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenCat(null);
      setPopoutPos(null);
    }, popoutFadeDuration);
  };

  const animateToPreset = (target: number[], name: string | null, animDuration: number = PRESET_ANIM_DURATION) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    // Close any open category popout before morphing.
    if (openCat !== null) closePopout();

    // Capture the current values at the moment the button was pressed.
    setValues(prev => { animStartRef.current = [...prev]; return prev; });
    setActivePreset(name);
    setIsAnimating(true);

    let startTime: number | null = null;

    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const t = Math.min((ts - startTime) / animDuration, 1);
      // Cubic ease-in-out
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const start = animStartRef.current;
      setValues(start.map((s, i) => s + (target[i] - s) * ease));
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setValues([...target]);
        setIsAnimating(false);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  // Keep the ref pointing at the latest version of animateToPreset (runs after every render).
  useEffect(() => { animateToPresetRef.current = animateToPreset; });

  // ── Auto-play on first section entry ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAutoPlayedRef.current) return;
        hasAutoPlayedRef.current = true;
        observer.disconnect();
        runAutoPlaySequence();
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => { observer.disconnect(); cancelAutoPlay(); };
  }, [cancelAutoPlay, runAutoPlaySequence]);

  const handlePlay = () => {
    setGhosts(prev => [...prev.slice(-4), [...values]]);
    onPlay?.(Object.fromEntries(CAT_KEYS.map((key, i) => [key, values[i]])));
  };

  const handleReset = () => {
    runResetAutoPlaySequence();
  };

  // Convert an SVG viewBox point to viewport (screen) coordinates.
  const toScreen = (svgEl: SVGSVGElement, svgX: number, svgY: number) => {
    const pt = svgEl.createSVGPoint();
    pt.x = svgX; pt.y = svgY;
    const ctm = svgEl.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm) : null;
  };

  const handleLabelClick = (i: number, svgX: number, svgY: number) => {
    // Toggle: clicking the open label closes it.
    if (openCat === i) { closePopout(); return; }

    // Cancel any in-progress fade-out before opening a new popout.
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    const svgEl = svgRef.current;
    if (!svgEl) return;

    // Labels with svgY > CY are in the bottom half → popout grows upward.
    const above    = svgY > CY;

    // The edge of the label hit-rect the popout should attach to.
    const hitEdgeY = above ? svgY - 16 : svgY + 16;
    const edgePt   = toScreen(svgEl, svgX, hitEdgeY);
    const centerPt = toScreen(svgEl, svgX, svgY);
    if (!edgePt || !centerPt) return;

    // Center the popout horizontally on the label, clamped to the viewport.
    let left = centerPt.x - POPOUT_W / 2;
    left = Math.max(8, Math.min(window.innerWidth - POPOUT_W - 8, left));

    setOpenCat(i);
    setPopoutPos({ left, top: edgePt.y, bottom: window.innerHeight - edgePt.y, above });
    setPopoutVisible(false);

    // Double-RAF ensures the browser paints opacity:0 before we flip to 1,
    // so the CSS transition actually fires on mount.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPopoutVisible(true);
      });
    });
  };

  const activePts  = values.map((v, i) => spokePoint(i, v));
  const activePath = smoothClosedPath(activePts);

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full">

      {/* ── Radar SVG ─────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 760"
        style={{
          width: '100%',
          maxHeight: '60vh',
          fontFamily: 'var(--font-roboto, Roboto, sans-serif)',
        }}
        aria-label="Radar chart — select project types"
      >

        {/* Spoke lines */}
        {CATEGORIES.map((_, i) => {
          const e = spokeEnd(i);
          return (
            <line
              key={`spoke-${i}`}
              x1={CX} y1={CY} x2={e.x} y2={e.y}
              stroke="white" strokeOpacity={0.12} strokeWidth={1}
            />
          );
        })}

        {/* Ghost polygons */}
        {ghosts.map((gVals, gi) => {
          const oi = gi + 5 - ghosts.length;
          return (
            <path
              key={`ghost-${gi}`}
              d={smoothClosedPath(gVals.map((v, i) => spokePoint(i, v)))}
              fill="none"
              stroke="#000000"
              strokeWidth={ghostStrokeWidth}
              strokeOpacity={GHOST_OPACITIES[oi]}
            />
          );
        })}

        {/* Active polygon — CSS d-transition only when not under JS animation */}
        <path
          d={activePath}
          fill="white"
          fillOpacity={activeFillOpacity}
          stroke="white"
          strokeWidth={activeStrokeWidth}
          style={{ transition: isAnimating ? 'none' : 'd 300ms ease-in-out' }}
        />

        {/* Category labels + arrow controls */}
        {CATEGORIES.map((cat, i) => {
          const { x, y } = labelPos(i);
          const upKey    = `${i}-up`;
          const downKey  = `${i}-down`;
          const isOpen   = openCat === i;
          const above    = isOpen ? (popoutPos?.above ?? false) : false;

          // Hide the SVG arrow that would sit behind the open popout.
          const hideUp   = isOpen && above;
          const hideDown = isOpen && !above;

          // Label scale: open > hovered > default
          const labelScale = isOpen
            ? popoutOpenScale
            : hoveredCat === i
              ? labelHoverScale
              : 1;

          return (
            <g key={`label-${i}`}>

              {/* ▲ Increase — hidden while its popout covers it */}
              {!hideUp && (
                <g onClick={() => adjust(i, 10)} style={{ cursor: 'pointer' }}>
                  <rect x={x - 28} y={y - 44} width={56} height={26} fill="transparent" />
                  <text
                    key={`arrow-up-${i}-${arrowKeys[upKey] ?? 0}`}
                    x={x} y={y - 28}
                    textAnchor="middle"
                    fill={arrowColor} fillOpacity={arrowOpacity}
                    fontSize={arrowFontSize} fontWeight="bold"
                    style={{
                      userSelect: 'none',
                      transformBox: 'fill-box', transformOrigin: 'center',
                      animation: arrowKeys[upKey] ? 'radar-arrow-flash 220ms ease-out forwards' : 'none',
                    }}
                  >+</text>
                </g>
              )}

              {/* Category label — click to open/close popout; hover to hint scale */}
              <g
                onClick={() => handleLabelClick(i, x, y)}
                onMouseEnter={() => setHoveredCat(i)}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  cursor: 'pointer',
                  transform: `scale(${labelScale})`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transition: `transform ${labelScaleDuration}ms ease-out`,
                }}
              >
                {/* Transparent hit area */}
                <rect x={x - 70} y={y - 16} width={140} height={32} fill="transparent" />
                <text
                  key={`cat-text-${i}-${textKeys[i] ?? 0}`}
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white"
                  fontSize={catFontSize} fontWeight="bold"
                  style={{
                    userSelect: 'none',
                    letterSpacing: '2px',
                    transformBox: 'fill-box', transformOrigin: 'center',
                    opacity: isOpen ? 1 : 0.85,
                    animation: textKeys[i]
                      ? `radar-pulse-${textDir[i]} 300ms ease-out forwards`
                      : 'none',
                  }}
                >
                  {cat.name.toUpperCase()}
                </text>
              </g>

              {/* ▼ Decrease — hidden while its popout covers it */}
              {!hideDown && (
                <g onClick={() => adjust(i, -10)} style={{ cursor: 'pointer' }}>
                  <rect x={x - 28} y={y + 28} width={56} height={26} fill="transparent" />
                  <text
                    key={`arrow-down-${i}-${arrowKeys[downKey] ?? 0}`}
                    x={x} y={y + 42}
                    textAnchor="middle"
                    fill={arrowColor} fillOpacity={arrowOpacity}
                    fontSize={arrowFontSize} fontWeight="bold"
                    style={{
                      userSelect: 'none',
                      transformBox: 'fill-box', transformOrigin: 'center',
                      animation: arrowKeys[downKey] ? 'radar-arrow-flash 220ms ease-out forwards' : 'none',
                    }}
                  >−</text>
                </g>
              )}

            </g>
          );
        })}

      </svg>

      {/* ── Preset buttons ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 500, marginBottom: 8 }}>
        {PRESETS.map((preset) => {
          const isActive  = activePreset === preset.name;
          const isHovered = hoveredPreset === preset.name;
          const bg    = isActive ? presetFillColorPressed : (isHovered ? presetFillColorHover : presetFillColor);
          const color = isActive ? presetTextColorPressed : (isHovered ? presetTextColorHover : presetTextColor);
          // Default border: low opacity (~30%); hover: presetBorderColor (~50-60%); active: solid white
          const borderColor = isActive ? presetFillColorPressed : (isHovered ? presetBorderColor : 'rgba(255,255,255,0.3)');
          return (
            <button
              key={preset.name}
              onClick={() => { cancelAutoPlay(); stopResetSpin(); animateToPreset(preset.values, preset.name); }}
              onMouseEnter={() => setHoveredPreset(preset.name)}
              onMouseLeave={() => setHoveredPreset(null)}
              className={`font-sans cursor-pointer ${presetTextSize}`}
              style={{
                flex: 1,
                height: presetButtonHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                color,
                border: `${presetBorderWidth}px solid ${borderColor}`,
                borderRadius: presetBorderRadius,
                padding: '0 10px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 200ms, color 200ms, border-color 200ms',
              }}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* ── Reset + Down-arrow buttons ─────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2" style={{ marginTop: downArrowMarginTop }}>

        {/* Reset button — restarts the auto-play sequence */}
        <button
          onClick={handleReset}
          aria-label="Restart auto-play sequence"
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
        >
          {/* refresh-cw icon from /public/images/ui/icons/refresh-cw.svg (inlined for animation) */}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{
              animation: resetSpinning
                ? `icon-spin-once ${RESET_TOTAL_DURATION / resetIconRotations}ms linear ${resetIconRotations}`
                : 'none',
            }}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>

        {/* Down-arrow button — confirms selection and loads projects */}
        <button
          onClick={handlePlay}
          aria-label="Save selection and load projects"
          className="radar-down-arrow-btn w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
        >
          <svg
            width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
          >
            <line x1="6.5" y1="1" x2="6.5" y2="9.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            <polyline points="2,7 6.5,12 11,7" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

      </div>

      {/* ── Category popout ───────────────────────────────────────────────── */}
      {openCat !== null && popoutPos && (() => {
        const data  = catData[CAT_KEYS[openCat]];
        const { above } = popoutPos;

        // Shared style for the overlay arrow button (the one hidden in the SVG).
        const arrowBtnStyle: React.CSSProperties = {
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: arrowColor,
          opacity: arrowOpacity,
          fontSize: 28,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center',
          padding: '8px 0',
        };

        // The wrapper is a flex column anchored to the label edge:
        //
        // `above = false` (label in top half, popout below):
        //   top = label bottom edge  →  children: [card] [− button]
        //
        // `above = true` (label in bottom half, popout above):
        //   bottom = label top edge  →  children: [+ button] [card]
        //   The wrapper grows upward naturally because `bottom:` anchors its
        //   bottom edge, and flex-column stacks children from top to bottom
        //   inside it — so the card's bottom sits at the label edge.
        const wrapperPos: React.CSSProperties = above
          ? { bottom: popoutPos.bottom }
          : { top: popoutPos.top };

        return (
          <>
            {/* Full-screen backdrop — click outside to close */}
            <div
              aria-hidden="true"
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={closePopout}
            />

            {/* Flex-column wrapper — contains overlay arrow + popout card.
                Opacity transition on the whole wrapper fades both together.
                pointerEvents disabled while invisible to let backdrop register clicks. */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: popoutPos.left,
                ...wrapperPos,
                width: POPOUT_W,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                opacity: popoutVisible ? 1 : 0,
                transition: `opacity ${popoutFadeDuration}ms ease`,
                pointerEvents: popoutVisible ? 'auto' : 'none',
              }}
            >
              {/* + button rendered above the card for `above` labels */}
              {above && (
                <button
                  onClick={() => adjust(openCat, 10)}
                  aria-label={`Increase ${CATEGORIES[openCat].name}`}
                  style={arrowBtnStyle}
                >+</button>
              )}

              {/* Popout card */}
              <div
                role="dialog"
                aria-label={`${CATEGORIES[openCat].name} description`}
                style={{
                  background: 'white',
                  borderRadius: popoutBorderRadius,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
                  overflow: 'hidden',
                }}
              >
                {/* Close button */}
                <button
                  onClick={closePopout}
                  aria-label="Close"
                  style={{
                    position: 'absolute', top: 10, right: 12,
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 18,
                    color: '#aaa', lineHeight: 1, padding: '2px 4px',
                    zIndex: 1,
                  }}
                >×</button>

                {/* Description */}
                <div style={{ padding: '18px 36px 14px 18px' }}>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: '#444',
                    fontFamily: 'var(--font-roboto, Roboto, sans-serif)',
                  }}>
                    {data?.description}
                  </p>
                </div>

                {/* Illustration — full-bleed at bottom of card */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data?.image}
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', display: 'block' }}
                />
              </div>

              {/* − button rendered below the card for `!above` labels */}
              {!above && (
                <button
                  onClick={() => adjust(openCat, -10)}
                  aria-label={`Decrease ${CATEGORIES[openCat].name}`}
                  style={arrowBtnStyle}
                >−</button>
              )}
            </div>
          </>
        );
      })()}

    </div>
  );
}
