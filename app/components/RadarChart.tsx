'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import catDesc from '@/src/data/categoryDescriptions.json';
import presetsData from '@/src/data/presets.json';
import { CATEGORIES, CAT_KEYS } from '@/src/config/categories';
import IconCardReel from './IconCardReel';

// ── Design variables (edit these to restyle the chart) ─────────────────────────
const activeStrokeWidth  = 3;            // line weight of the active polygon
const ghostStrokeWidth   = 2;            // line weight of the ghost (history) polygons
const activeFillOpacity  = 0.04;         // white fill opacity inside the active polygon
const categoryTextSize   = 'text-base';  // Tailwind-style size token for category labels
const arrowColor         = 'white';      // color of the + / − buttons
const arrowOpacity       = 0.30;         // resting opacity of the + / − buttons (0–1)
const arrowFontSize      = 25;           // font size of the + / − buttons in viewBox units
// Circles behind + / − symbols (outline only — no fill)
const arrowCircleRadius  = 13;           // viewBox units
const arrowCircleColor   = 'white';
const arrowCircleOpacity = 0.3;         // resting opacity; full white on hover
const arrowCircleStroke  = 1;            // strokeWidth in viewBox units
// + / − symbol vertical positions — separate values for 1-line vs 2-line labels
const arrowUpOffsetY1      = -39;        // 1-line labels: negative = above label anchor (viewBox units)
const arrowUpOffsetY2      = -40;        // 2-line labels: negative = above label anchor (viewBox units)
const arrowDnPaddingBelow1 =  15;        // 1-line labels: gap below hit-rect bottom edge (viewBox units)
const arrowDnPaddingBelow2 =  23;        // 2-line labels: gap below hit-rect bottom edge (viewBox units)
// Circle micro-adjustment (fine-tune centering on top of dominantBaseline="mathematical")
const circleUpAdjY = 2.7;                  // extra cy offset for the + circle (viewBox units, + = down)
const circleDnAdjY = 1.7;                  // extra cy offset for the − circle (viewBox units, + = down)
// Arrow-up-right icon positioning (aligned to last line of label text)
const infoIconCharWidth = 0.65;         // estimated char width multiplier for Roboto Bold (× catFontSize)
const infoIconGap       =  8;          // gap between text right edge and icon left edge (viewBox units)
const infoIconYOffset   =  0;          // vertical fine-tune (viewBox units, + = down)
const popoutFadeDuration = 200;         // ms for popout fade in / out
const popoutBorderRadius = 0;            // px corner radius of the popout card
const popoutOpenScale    = 1.4;          // label scale factor while its popout is open
const labelHoverScale    = 1.2;          // label scale factor on mouse hover
const labelScaleDuration = 100;          // ms for label scale transition
const mobileLabelScale   = 1.25;         // extra scale applied to each label+arrow group on mobile

// ── Preset button styles ───────────────────────────────────────────────────────
// px to trim from the SVG's rendered bottom, compensating for the empty viewBox
// area below the lowest arrow buttons (~49 SVG units ≈ 30–40 px at typical widths).
// Increase this value to close the gap between the chart and the icon reel;
// pair with reelMarginTop in IconCardReel.tsx for fine control.
const svgBottomClip          = 30;                         // px
const downArrowMarginTop     = 20;                         // px — height of the connector shape (space between button row and arrow)
const downArrowFollowDuration = 300;                      // ms for down-arrow to slide under active preset
const presetTextSize         = 'text-[11px]';                 // Tailwind font-size class Default: 'text-xs'
// ── Preset button outline ─────────────────────────────────────────────────────
const presetBorderColorDefault = 'rgba(255,255,255,0.3)';  // border at rest
const presetBorderColorHover   = 'rgba(255,255,255,0.5)';  // border on hover
const presetBorderColorActive  = '#FFFFFF';                 // border when active
// IMPORTANT: fill colors must be opaque — the border trick works by placing a spinning
// gradient behind the button; the button's solid fill hides the gradient in the center,
// leaving it visible only through the border-width gap at the edges.
// For a "transparent" look on the dark background, use the page bg color: #1c1c1d.
const presetFillColor        = 'transparent';                 // fill when inactive (match page bg) '#1c1c1d'
const presetTextColor        = 'rgba(255,255,255,0.9)';   // text when inactive
const presetFillColorHover   = 'transparent';                 // fill on hover (slightly lighter)#2b2b2c
const presetTextColorHover   = '#FFFFFF';                 // text on hover
const presetFillColorPressed = '#FFFFFF';                 // fill when active (solid white)
const presetTextColorPressed = '#282829';                 // text when active
const presetBorderRadius     = 30;                         // px corner radius for buttons
const presetBorderWidth      = 1;                          // px border thickness
const presetButtonHeight     = 40;                         // px fixed height for all buttons
const presetButtonWidth      = 200;                        // px — fixed width for ALL desktop preset buttons (wide enough for longest label)
const presetButtonGap        = 10;                         // px gap between preset buttons
const presetContainerPadding = 24;                         // px minimum horizontal gap between buttons and parent edges
// ── Connector shape (desktop) — bridges active button to down arrow ────────────
const connectorFillColor     = 'rgba(255, 255, 255, 1)';
const connectorFillOpacity   = .1;
const connectorOutline       = false;
const connectorOutlineColor  = 'rgba(255, 255, 255, 0.3)';
const connectorOutlineWidth  = 1;                          // px
const connectorOutlineOpacity = 1;
const connectorTopWidth      = presetButtonWidth * 0.5;    // px — connector top width (centered over button); default: half button width
// Controls the radius of the concave curves between the shoulders (v3→v4, v9→v10)
// and the neck (v5→v6, v7→v8). Higher = smoother, rounder transition.
// Effective range depends on shoulder width and connector height.
const connectorChamferRadius = 15;
const connectorTopOverlap    = 0;                         // px — connector extends UP behind the button bottom edge
const connectorNeckExtension = 0;                         // px — static neck extension (kept at 0; dynamic extension handled by bounceExtension filler on hover)
const connectorBottomOverlap = 24 + connectorNeckExtension; // px — total overlap behind circle (arrowR); arrow stays at same absolute position
const bounceExtension        = 0;                          // px — matches radar-btn-bounce translateY peak; filler fades in on hover to track the bounce
// ── Connector reveal / retract animation ──────────────────────────────────────
const connectorRevealDuration  = 100;  // ms — top-to-bottom reveal animation (clip 100%→0%)
const connectorRetractDuration = 100;  // ms — bottom-to-top retract animation (clip 0%→100%)
const connectorRevealDelay     = 50;  // ms delay after arrow starts moving before connector reveals
// ── Down-arrow button (circle + icon) ─────────────────────────────────────────
const downArrowFillColor        = 'rgba(100,100,100,1)';   // circle background color at rest
const downArrowHoverColor       = 'rgba(80,80,80,1)';   // circle background color on hover
const downArrowFillOpacity      = 1;      // circle background opacity at rest
const downArrowFillHoverOpacity = 1;         // circle background opacity on hover
const downArrowBorderColor      = 'white';   // circle border color
const downArrowBorderOpacity    = 1;         // circle border opacity (0–1)
const downArrowBorderWidth      = 3;         // px — circle border thickness
const downArrowIconColor        = 'white';   // color of the ↓ icon inside the circle
const downArrowIconStroke       = 1.6;       // strokeWidth of the ↓ icon (SVG units)
const resetFillColor            = 'rgba(40,40,40,1)';   // reset button circle background color
const resetFillOpacity          = 1;      // reset button circle background opacity
const mobilePresetsBreakpoint = 750;                       // px — below this: mobile preset layout (vertical buttons + inline arrow)
const presetsBottomPadding   = 0;                         // px minimum space between arrow/presets and section bottom edge
const presetButtonHeightMobile = 45;                       // px button height in mobile layout (shorter than desktop's presetButtonHeight)
const mobileArrowSize        = presetButtonHeightMobile;   // px — diameter equals mobile button height (keep button + arrow the same height)
const mobileArrowGap         = 8;                          // px gap between button and inline arrow circle in mobile
const mobilePresetTransition = 200;                        // ms transition for button shrink / arrow slot appear (mobile)
const mobileButtonScale      = 0.85;                       // scale factor applied to the entire mobile button group container
const mobileReelScale        = 0.8;                        // scale factor applied to the icon card reel on mobile
const mobileReelOffsetY      = 20;                         // px — extra downward offset for the reel on mobile
const yourSelectionTransition = 300;                       // ms for "YOUR SELECTION" button grow/shrink on desktop

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


const DEFAULT_VALUES = [70, 70, 70, 70, 70];

// ── Presets — loaded from src/data/presets.json ────────────────────────────────
// Values converted from named-key objects to CAT_KEYS-ordered arrays.
// To add/edit presets, edit presets.json — no code changes needed.
const PRESETS = (presetsData as Array<{ name: string; isDefault?: boolean; values: Record<string, number> }>).map(p => ({
  name:      p.name,
  isDefault: p.isDefault ?? false,
  values:    CAT_KEYS.map(k => p.values[k] ?? 0),
}));
// Presets shown as buttons and used in auto-play (excludes the invisible Default reset target)
const NON_DEFAULT_PRESETS = PRESETS.filter(p => !p.isDefault);
const DEFAULT_PRESET      = PRESETS.find(p => p.isDefault)!;
// Autoplay order: non-default presets reversed (Systems Thinking → Spatial Experiences → Research), then Overview
const AUTOPLAY_SEQUENCE   = [...NON_DEFAULT_PRESETS.slice().reverse(), DEFAULT_PRESET];

const PRESET_ANIM_DURATION  = 650;  // ms for preset morph animation (initial auto-play + manual clicks)
const autoPlayPauseDuration = 150;  // ms to hold each preset during initial auto-play

// ── Reset auto-play timing (independent from initial auto-play) ────────────────
const resetAutoPlayPauseDuration = 100; // ms to hold each preset during reset auto-play
const resetPresetAnimDuration    = 400;  // ms for each chart morph during reset auto-play
// Total ms the reset sequence takes (initial delay + N steps + final morph):
const RESET_TOTAL_DURATION = 200 + (resetPresetAnimDuration + resetAutoPlayPauseDuration) * (AUTOPLAY_SEQUENCE.length - 1) + resetPresetAnimDuration;
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
const catData = catDesc as Record<string, { description: string; image: string }>;

// Popout width (px)
const POPOUT_W = 300;

// Returns one or two uppercase lines for a category label.
function getLabelLines(label: string): [string] | [string, string] {
  if (label === 'Computational Design')   return ['COMPUTATIONAL', 'DESIGN'];
  if (label === 'Artifacts & Interfaces') return ['ARTIFACTS', '& INTERFACES'];
  return [label.toUpperCase()];
}

// ── Connector SVG path ─────────────────────────────────────────────────────────
// Keyhole / mushroom-stem shape (upper body only — arc is a separate bouncing element).
//
// svgW      = SVG element width (presetButtonWidth)
// topW      = connector top width (connectorTopWidth)
// H         = total SVG height (= topOverlap + downArrowMarginTop + connectorBottomOverlap)
// arrowR    = circle radius (24) — neck half-width = arrowR
// r         = max cubic bezier handle length for shoulder corners
// topOverlap = connectorTopOverlap — how far shape extends up behind the button
//
// Vertex layout (10 vertices):
//
//   v1 ─────────────────────── v2        ← flat top (hidden behind button)
//   │                           │
//   v10 ─ v9             v4 ─ v3         ← shoulders (at button bottom edge, y = topOverlap)
//            \             /
//             \           /
//              v8       v5               ← end of concave bezier curves / neck top
//               │       │
//               └───────┘               ← flat bottom (hidden behind circle, y = H)
//
// The arc (v6→v7) lives in a separate SVG inside the bouncing arrow div so it
// moves with the circle during the bounce animation.
//
function connectorPath(
  svgW: number, topW: number, H: number,
  arrowR: number, r: number, topOverlap: number,
): string {
  const cx      = svgW / 2;
  const halfTop = topW / 2;
  const nH      = arrowR;                          // neck half-width = circle radius
  const step    = halfTop - nH;                    // horizontal inward step per side

  // Shoulders at button bottom edge (y = topOverlap in SVG = button bottom in absolute)
  const dropH   = topOverlap;                      // v3, v4, v9, v10 all at this Y
  const availH  = H - dropH;
  const cs      = Math.max(1, Math.min(r, step * 0.95, availH * 0.8)); // concave corner size

  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(cx - halfTop)},0`,                                                               // v1: top-left
    `L ${f(cx + halfTop)},0`,                                                               // v2: top-right
    `L ${f(cx + halfTop)},${f(dropH)}`,                                                     // v3: right shoulder outer (drop down from top)
    `L ${f(cx + nH + cs)},${f(dropH)}`,                                                     // v4: right shoulder inner (horizontal step inward)
    `C ${f(cx+nH+cs*0.5)},${f(dropH)} ${f(cx+nH)},${f(dropH+cs*0.5)} ${f(cx+nH)},${f(dropH+cs)}`, // v5: right neck top (end of concave curve)
    `L ${f(cx + nH)},${f(H)}`,                                                              // right neck bottom (flat bottom, hidden behind circle)
    `L ${f(cx - nH)},${f(H)}`,                                                              // flat bottom
    `L ${f(cx - nH)},${f(dropH + cs)}`,                                                    // v8: left neck top (start of concave curve)
    `C ${f(cx-nH)},${f(dropH+cs*0.5)} ${f(cx-nH-cs*0.5)},${f(dropH)} ${f(cx-nH-cs)},${f(dropH)}`, // v9: left shoulder inner (horizontal step inward)
    `L ${f(cx - halfTop)},${f(dropH)}`,                                                    // v10: left shoulder outer (rise up to top)
    'Z',                                                                                    // v10 → v1: left outer side (closes back to top-left)
  ].join(' ');
}

// ── Component ──────────────────────────────────────────────────────────────────
interface RadarChartProps {
  onPlay?:             (values: Record<string, number>, presetName: string | null) => void;
  onCategoryFilter?:   (catKey: string) => void;
  /** Fired once when the initial (or reset) autoplay sequence finishes returning to defaults. */
  onAutoPlayComplete?: () => void;
}

// Popout anchor positioning:
// `above = false`: wrapper top = label bottom edge, card first then − button below.
// `above = true`:  wrapper bottom = label top edge, + button first then card below.
// `bottom` (px from viewport bottom) is pre-computed so the wrapper can use CSS
// `bottom:` without needing window.innerHeight at render time.
interface PopoutPos { left: number; top: number; bottom: number; above: boolean; }

export default function RadarChart({ onPlay, onCategoryFilter, onAutoPlayComplete }: RadarChartProps) {
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
  const [hasPlayed,       setHasPlayed]       = useState(false);

  // true after the chart's autoplay sequence (initial or reset) returns to defaults.
  // Passed to IconCardReel as `chartReady` to gate its entrance animation.
  const [chartIntroComplete, setChartIntroComplete] = useState(false);

  const [openCat,          setOpenCat]          = useState<number | null>(null);
  const [popoutPos,        setPopoutPos]        = useState<PopoutPos | null>(null);
  const [popoutVisible,    setPopoutVisible]    = useState(false);
  const [hoveredDownArrow, setHoveredDownArrow] = useState(false);
  const [hoveredArrow,     setHoveredArrow]     = useState<{ cat: number; dir: 'up' | 'dn' } | null>(null);
  const [arrowTranslateX,    setArrowTranslateX]    = useState(0);
  const [isMobile,           setIsMobile]           = useState(false);
  const [showYourSelection,  setShowYourSelection]  = useState(false);
  // Connector clip-path animation: 100 = fully hidden (inset from bottom), 0 = fully revealed
  const [connectorClip,     setConnectorClip]     = useState(100);
  const [connectorTransDur, setConnectorTransDur] = useState(0);
  const [connectorEasing,   setConnectorEasing]   = useState<'ease-in' | 'ease-out'>('ease-out');

  const svgRef             = useRef<SVGSVGElement>(null);
  const containerRef       = useRef<HTMLDivElement>(null);
  const presetRowRef       = useRef<HTMLDivElement>(null);
  const presetButtonRefs   = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef       = useRef<number | null>(null);
  const downArrowBtnRef      = useRef<HTMLButtonElement>(null);
  const bounceDivRef         = useRef<HTMLDivElement>(null);
  const yourSelectionBtnRef      = useRef<HTMLButtonElement | null>(null);
  const prevShowYourSelectionRef = useRef(false);
  const prevConnectorVisibleRef  = useRef(false);
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
    AUTOPLAY_SEQUENCE.forEach((preset, i) => {
      schedule(500 + STEP * i, () => animateToPresetRef.current(preset.values, preset.name));
    });
    // Signal the reel after the last morph completes + a brief pause (200ms).
    const completionDelay = 500 + STEP * (AUTOPLAY_SEQUENCE.length - 1) + PRESET_ANIM_DURATION + 200;
    schedule(completionDelay, () => {
      setChartIntroComplete(true);
      onAutoPlayComplete?.();
    });
  }, [cancelAutoPlay, onAutoPlayComplete]);

  // Like runAutoPlaySequence but uses reset-specific timing, and drives the spin animation.
  const runResetAutoPlaySequence = useCallback(() => {
    cancelAutoPlay();
    setChartIntroComplete(false); // hide the reel immediately while chart re-animates
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
    AUTOPLAY_SEQUENCE.forEach((preset, i) => {
      schedule(500 + STEP * i, () => animateToPresetRef.current(preset.values, preset.name, resetPresetAnimDuration));
    });
    // Signal the reel to reappear after the last morph ends + brief pause.
    const completionDelay = 500 + STEP * (AUTOPLAY_SEQUENCE.length - 1) + resetPresetAnimDuration + 200;
    schedule(completionDelay, () => setChartIntroComplete(true));
  }, [cancelAutoPlay, stopResetSpin]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjust = (i: number, delta: number) => {
    setHasPlayed(false);
    cancelAutoPlay();
    stopResetSpin();
    // Cancel any in-progress preset animation and clear the selection.
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setIsAnimating(false);
    setActivePreset(null);
    setShowYourSelection(true);   // show "YOUR SELECTION" slot in mobile

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

  // ── Down-arrow bounce — set animation directly on the DOM node so React
  // re-renders (which happen every RAF frame during preset animation) never
  // interrupt it.  Only re-runs when the two meaningful state values change.
  useEffect(() => {
    if (isMobile) return; // no bounce animation in mobile (arrow is inline, not standalone)
    const div = bounceDivRef.current;
    if (!div) return;
    // Bounce the whole wrapper div (arc SVG + circle) so the arc follows the circle
    div.style.animation = (hasPlayed || !hoveredDownArrow)
      ? 'none'
      : 'radar-btn-bounce 0.45s ease-in-out infinite';
  }, [hasPlayed, hoveredDownArrow, isMobile]);

  // Switch to mobile layout below mobilePresetsBreakpoint
  useEffect(() => {
    const calc = () => setIsMobile(window.innerWidth < mobilePresetsBreakpoint);
    calc();
    window.addEventListener('resize', calc, { passive: true });
    return () => window.removeEventListener('resize', calc);
  }, []);

  // ── Unified arrow + connector sequencing (desktop only) ────────────────────
  // Correct sequence when switching positions:
  //   1. Retract connector upward (connectorRetractDuration ms)
  //   2. Arrow slides to new button (downArrowFollowDuration ms)
  //   3. Connector reveals downward (connectorRevealDuration ms, after connectorRevealDelay)
  //
  // On first activation (no previous connector): skip retract, just move + reveal.
  // On deactivation: retract only.
  useEffect(() => {
    if (isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setArrowTranslateX(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectorClip(100);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectorTransDur(0);
      return;
    }

    const nowVisible = activePreset !== null || showYourSelection;
    const wasVisible = prevConnectorVisibleRef.current;
    const prevShowYS = prevShowYourSelectionRef.current;
    prevConnectorVisibleRef.current  = nowVisible;
    prevShowYourSelectionRef.current = showYourSelection;

    // Whether YOUR SELECTION button is in mid-transition (growing or shrinking)
    const yourSelectionChanging  = showYourSelection !== prevShowYS;
    const yourSelectionAppearing = showYourSelection && !prevShowYS;

    // Measure the center-X offset of the target button relative to the preset row center.
    const measureTarget = (): number => {
      const r = presetRowRef.current;
      if (!r) return 0;
      let btn: HTMLButtonElement | null = null;
      if (showYourSelection) {
        btn = yourSelectionBtnRef.current;
      } else if (activePreset !== null) {
        const idx = PRESETS.findIndex(p => p.name === activePreset);
        btn = presetButtonRefs.current[idx];
      }
      if (!btn) return 0;
      const rowRect = r.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      return (btnRect.left + btnRect.width / 2) - (rowRect.left + rowRect.width / 2);
    };

    if (!nowVisible && !wasVisible) return;

    if (!nowVisible) {
      // Deactivation — retract connector, leave arrow where it is
      setConnectorClip(100);
      setConnectorTransDur(connectorRetractDuration);
      setConnectorEasing('ease-in');
      return;
    }

    if (!wasVisible) {
      // First activation — no retract; move arrow, then reveal connector
      setConnectorClip(100);
      setConnectorTransDur(0);
      // If YOUR SELECTION is growing, wait for it before measuring its position
      const measureDelay = yourSelectionAppearing ? yourSelectionTransition : 0;
      const t1 = setTimeout(() => setArrowTranslateX(measureTarget()), measureDelay);
      const t2 = setTimeout(() => {
        setConnectorClip(0);
        setConnectorTransDur(connectorRevealDuration);
        setConnectorEasing('ease-out');
      }, measureDelay + downArrowFollowDuration + connectorRevealDelay);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // Position change — retract → move arrow → reveal
    setConnectorClip(100);
    setConnectorTransDur(connectorRetractDuration);
    setConnectorEasing('ease-in');
    // If YOUR SELECTION is transitioning (growing or shrinking), delay measurement until
    // both the retract AND the button transition have finished.
    const moveDelay = yourSelectionChanging
      ? Math.max(connectorRetractDuration, yourSelectionTransition)
      : connectorRetractDuration;
    const t1 = setTimeout(() => setArrowTranslateX(measureTarget()), moveDelay);
    const t2 = setTimeout(() => {
      setConnectorClip(0);
      setConnectorTransDur(connectorRevealDuration);
      setConnectorEasing('ease-out');
    }, moveDelay + downArrowFollowDuration + connectorRevealDelay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activePreset, showYourSelection, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => {
    setHasPlayed(true);
    setGhosts(prev => [...prev.slice(-4), [...values]]);
    onPlay?.(Object.fromEntries(CAT_KEYS.map((key, i) => [key, values[i]])), activePreset);
  };

  const radarValuesObj = useMemo(
    () => Object.fromEntries(CAT_KEYS.map((key, i) => [key, values[i]])),
    [values],
  );

  const handleReset = () => {
    setHasPlayed(false);
    setShowYourSelection(false);
    runResetAutoPlaySequence(); // also sets chartIntroComplete=false → hides reel
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

  const activePts    = values.map((v, i) => spokePoint(i, v));
  const activePath   = smoothClosedPath(activePts);
  // Show connector on desktop when something is active (preset or custom selection)
  const showConnector = !isMobile && (activePreset !== null || showYourSelection);
  // Total connector SVG height: gap + topOverlap + arrowR (arc at resting circle) + neckExtension
  const connectorH = downArrowMarginTop + connectorTopOverlap + connectorBottomOverlap;

  // Shared inner content for the down-arrow / reset slot (desktop + mobile inline)
  const arrowInner = (
    <>
      {/* Reset button — fades IN when hasPlayed */}
      <button
        onClick={handleReset}
        aria-label="Restart auto-play sequence"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          borderRadius: '50%', background: `color-mix(in srgb, ${resetFillColor} ${resetFillOpacity * 100}%, transparent)`,
          border: '1px solid rgba(255,255,255,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', opacity: hasPlayed ? 1 : 0,
          transition: 'opacity 200ms ease', pointerEvents: hasPlayed ? 'auto' : 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          style={{ animation: resetSpinning ? `icon-spin-once ${RESET_TOTAL_DURATION / resetIconRotations}ms linear ${resetIconRotations}` : 'none' }}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M8 16H3v5"/>
        </svg>
      </button>
      {/* Down-arrow button — fades OUT when hasPlayed.
          Animation driven via downArrowBtnRef / useEffect (bypasses React renders). */}
      <button
        ref={downArrowBtnRef}
        onClick={handlePlay}
        onMouseEnter={() => setHoveredDownArrow(true)}
        onMouseLeave={() => setHoveredDownArrow(false)}
        aria-label="Save selection and load projects"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          borderRadius: '50%',
          background: hoveredDownArrow
            ? `color-mix(in srgb, ${downArrowHoverColor} ${downArrowFillHoverOpacity * 100}%, transparent)`
            : `color-mix(in srgb, ${downArrowFillColor} ${downArrowFillOpacity * 100}%, transparent)`,
          border: `${downArrowBorderWidth}px solid rgba(255,255,255,${downArrowBorderOpacity})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', opacity: hasPlayed ? 0 : 1,
          transition: 'opacity 200ms ease, background 200ms ease',
          pointerEvents: hasPlayed ? 'none' : 'auto',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <line x1="6.5" y1="1" x2="6.5" y2="9.5" stroke={downArrowIconColor} strokeWidth={downArrowIconStroke} strokeLinecap="round"/>
          <polyline points="2,7 6.5,12 11,7" fill="none" stroke={downArrowIconColor} strokeWidth={downArrowIconStroke} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full" style={isMobile ? {} : { flex: 1, minHeight: 0 }}>

      {/* ── Radar SVG ─────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 760"
        style={{
          width:        '100%',
          maxHeight:    isMobile ? '45vh' : '60vh',
          fontFamily:   'var(--font-roboto, Roboto, sans-serif)',
          marginBottom: -svgBottomClip,
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

          // Multi-line label support
          const lines   = getLabelLines(cat.label);
          const isMulti = lines.length > 1;
          const hitH    = isMulti ? 46 : 32;

          // For two-line labels, shift text down so the visual block is
          // centered between the + and − symbols.
          const textY   = isMulti ? y + 11 : y;

          // Arrow button vertical positions — use per-line-count variables
          const upSymY  = y + (isMulti ? arrowUpOffsetY2  : arrowUpOffsetY1);
          const dnSymY  = y + hitH / 2 + (isMulti ? arrowDnPaddingBelow2 : arrowDnPaddingBelow1);

          // dominantBaseline="mathematical" aligns glyph centre to y; fine-tune with adj vars
          const circleCyUp = upSymY + circleUpAdjY;
          const circleCyDn = dnSymY + circleDnAdjY;

          // Hover states for this category's arrow circles
          const upHovered = hoveredArrow?.cat === i && hoveredArrow.dir === 'up';
          const dnHovered = hoveredArrow?.cat === i && hoveredArrow.dir === 'dn';

          return (
            <g
              key={`label-${i}`}
              style={isMobile ? {
                transform: `scale(${mobileLabelScale})`,
                transformBox: 'view-box',
                transformOrigin: `${x}px ${y}px`,
              } : undefined}
            >

              {/* ▲ Increase — hidden while its popout covers it */}
              {!hideUp && (
                <g
                  onClick={() => adjust(i, 10)}
                  onMouseEnter={() => setHoveredArrow({ cat: i, dir: 'up' })}
                  onMouseLeave={() => setHoveredArrow(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outline circle behind + — full white on hover */}
                  <circle
                    cx={x} cy={circleCyUp} r={arrowCircleRadius}
                    fill="none"
                    stroke={arrowCircleColor}
                    strokeOpacity={upHovered ? 1 : arrowCircleOpacity}
                    strokeWidth={arrowCircleStroke}
                    style={{ transition: 'stroke-opacity 150ms ease' }}
                  />
                  <rect x={x - 28} y={upSymY - 16} width={56} height={26} fill="transparent" />
                  <text
                    key={`arrow-up-${i}-${arrowKeys[upKey] ?? 0}`}
                    x={x} y={upSymY}
                    textAnchor="middle"
                    dominantBaseline="mathematical"
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

              {/* Category label + info icon — scale together as one group */}
              <g
                onClick={() => handleLabelClick(i, x, y)}
                onMouseEnter={() => setHoveredCat(i)}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  cursor: 'pointer',
                  transform: `scale(${labelScale})`,
                  transformBox: 'view-box',
                  transformOrigin: `${x}px ${textY}px`,
                  transition: `transform ${labelScaleDuration}ms ease-out`,
                }}
              >
                {/* Transparent hit area — taller for two-line labels */}
                <rect x={x - 70} y={textY - hitH / 2} width={140} height={hitH} fill="transparent" />

                {/* Category text */}
                <text
                  key={`cat-text-${i}-${textKeys[i] ?? 0}`}
                  x={x} y={textY}
                  textAnchor="middle"
                  dominantBaseline={isMulti ? undefined : 'middle'}
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
                  {isMulti ? (
                    <>
                      <tspan x={x} dy={-(catFontSize * 0.65)}>{lines[0]}</tspan>
                      <tspan x={x} dy={catFontSize * 1.3}>{lines[1]}</tspan>
                    </>
                  ) : lines[0]}
                </text>

                {/* ↗ Arrow icon — inline after last line of text, scales with label group */}
                {(() => {
                  // X: align to right edge of last line using estimated text width
                  const lastLine     = lines[lines.length - 1];
                  const lastHalfW    = (lastLine.length * catFontSize * infoIconCharWidth) / 2;
                  const iconCX       = x + lastHalfW + infoIconGap + catFontSize / 2;
                  // Y: visual centre of last line
                  // - single-line: dominantBaseline="middle" makes textY the visual centre
                  // - multi-line: second tspan baseline = textY + 0.65×fs; visual centre ≈ baseline − 0.35×fs = textY + 0.30×fs
                  const iconCY = (isMulti ? textY + catFontSize * 0.30 : textY) + infoIconYOffset;
                  const s      = catFontSize;   // rendered size (viewBox units)
                  return (
                    <g
                      transform={`translate(${iconCX - s / 2}, ${iconCY - s / 2}) scale(${s / 24})`}
                      style={{
                        opacity: hoveredCat === i || isOpen ? 0.80 : 0.40,
                        transition: 'opacity 200ms ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <path d="M7 7h10v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M7 17 17 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                  );
                })()}
              </g>

              {/* ▼ Decrease — hidden while its popout covers it */}
              {!hideDown && (
                <g
                  onClick={() => adjust(i, -10)}
                  onMouseEnter={() => setHoveredArrow({ cat: i, dir: 'dn' })}
                  onMouseLeave={() => setHoveredArrow(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outline circle behind − — full white on hover */}
                  <circle
                    cx={x} cy={circleCyDn} r={arrowCircleRadius}
                    fill="none"
                    stroke={arrowCircleColor}
                    strokeOpacity={dnHovered ? 1 : arrowCircleOpacity}
                    strokeWidth={arrowCircleStroke}
                    style={{ transition: 'stroke-opacity 150ms ease' }}
                  />
                  <rect x={x - 28} y={dnSymY - 10} width={56} height={26} fill="transparent" />
                  <text
                    key={`arrow-down-${i}-${arrowKeys[downKey] ?? 0}`}
                    x={x} y={dnSymY}
                    textAnchor="middle"
                    dominantBaseline="mathematical"
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

      {isMobile ? (
        // ── MOBILE: natural document flow, no flex spacers ──────────────────
        // Elements stack top-to-bottom without any flex stretching.
        // The section grows to fit via globals.css media query.
        <>
          {/* ── Icon card reel (scaled down to save vertical space) ───── */}
          <div style={{
            width: '100%',
            padding: '8px 0',         // extra padding so outline/label aren't flush with edges
            transform: `scale(${mobileReelScale})`,
            transformOrigin: 'top center',
            marginTop: mobileReelOffsetY,
          }}>
            <IconCardReel
              radarValues={radarValuesObj}
              presetName={activePreset}
              confirmed={hasPlayed}
              chartReady={chartIntroComplete}
            />
          </div>

          {/* ── Preset buttons column (scaled as a unit) ──────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: presetButtonGap,
            width: '100%',
            paddingLeft: presetContainerPadding, paddingRight: presetContainerPadding,
            paddingTop: 16, paddingBottom: presetsBottomPadding,
            boxSizing: 'border-box',
            transform: `scale(${mobileButtonScale})`,
            transformOrigin: 'top center',
          }}>

            {/* 4 preset buttons with inline arrow slot */}
            {PRESETS.map((preset, i) => {
              const isActive      = activePreset === preset.name && !showYourSelection;
              const showArrowSlot = isActive; // slot stays open even after hasPlayed (reset button shows)
              const isHovered     = hoveredPreset === preset.name;
              const bg          = isActive ? presetFillColorPressed : (isHovered ? presetFillColorHover : presetFillColor);
              const color       = isActive ? presetTextColorPressed : (isHovered ? presetTextColorHover : presetTextColor);
              const borderColor = isActive ? presetBorderColorActive : (isHovered ? presetBorderColorHover : presetBorderColorDefault);
              return (
                <div key={preset.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: mobileArrowGap }}>
                  <button
                    ref={el => { presetButtonRefs.current[i] = el; }}
                    onClick={() => { setHasPlayed(false); setShowYourSelection(false); cancelAutoPlay(); stopResetSpin(); animateToPreset(preset.values, preset.name); }}
                    onMouseEnter={() => setHoveredPreset(preset.name)}
                    onMouseLeave={() => setHoveredPreset(null)}
                    className={`font-sans cursor-pointer ${presetTextSize}`}
                    style={{
                      flex: 1, height: presetButtonHeightMobile,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bg, color,
                      border: `${presetBorderWidth}px solid ${borderColor}`,
                      borderRadius: presetBorderRadius, padding: '0 10px',
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                      fontWeight: isActive ? 600 : 400,
                      transition: `background ${mobilePresetTransition}ms, color ${mobilePresetTransition}ms, border-color ${mobilePresetTransition}ms`,
                    }}
                  >{preset.name}</button>
                  {/* Arrow slot — width transitions 0 ↔ mobileArrowSize */}
                  <div style={{
                    width:      showArrowSlot ? mobileArrowSize : 0,
                    opacity:    showArrowSlot ? 1 : 0,
                    overflow:   'hidden',
                    flexShrink: 0,
                    transition: `width ${mobilePresetTransition}ms ease, opacity ${mobilePresetTransition}ms ease`,
                  }}>
                    <div style={{ position: 'relative', width: mobileArrowSize, height: mobileArrowSize }}>
                      {arrowInner}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 5th slot: YOUR SELECTION — always in the layout (reserves space), fades in/out */}
            <div style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: mobileArrowGap,
              opacity:       showYourSelection ? 1 : 0,
              pointerEvents: showYourSelection ? 'auto' : 'none',
              transition:    `opacity ${mobilePresetTransition}ms ease`,
            }}>
              <button
                className={`font-sans cursor-pointer ${presetTextSize}`}
                style={{
                  flex: 1, height: presetButtonHeightMobile,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: presetFillColorPressed, color: presetTextColorPressed,
                  border: `${presetBorderWidth}px solid ${presetBorderColorActive}`,
                  borderRadius: presetBorderRadius, padding: '0 10px',
                  letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                }}
              >Your Selection</button>
              <div style={{ position: 'relative', width: mobileArrowSize, height: mobileArrowSize, flexShrink: 0 }}>
                {arrowInner}
              </div>
            </div>

          </div>
        </>
      ) : (
        // ── DESKTOP: flex spacers + centered layout ──────────────────────────
        <>
          {/* Spacer: chart → reel (distributes space above the reel) */}
          <div style={{ flex: 1, minHeight: 0 }} />

          {/* ── Icon card reel ─────────────────────────────────────────── */}
          <IconCardReel
            radarValues={radarValuesObj}
            presetName={activePreset}
            confirmed={hasPlayed}
            chartReady={chartIntroComplete}
          />

          {/* Centering wrapper: fills space below reel, vertically + horizontally centers content */}
          {/* isolation:isolate creates a local stacking context — preset row (z-index:1) paints
              above the translateX div (z-index:auto/0 due to CSS transform), so the connector
              that extends upward behind the button is correctly hidden behind it */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', isolation: 'isolate' }}>
            {/* position:relative + zIndex:1 ensures this row paints above the connector SVG
                which lives inside the translateX stacking context (z-index:auto = 0) below */}
            <div ref={presetRowRef} style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', gap: presetButtonGap, width: '100%', paddingLeft: presetContainerPadding, paddingRight: presetContainerPadding, boxSizing: 'border-box' }}>
              {PRESETS.map((preset, i) => {
                const isActive    = activePreset === preset.name;
                const isHovered   = hoveredPreset === preset.name;
                const bg          = isActive ? presetFillColorPressed : (isHovered ? presetFillColorHover : presetFillColor);
                const color       = isActive ? presetTextColorPressed : (isHovered ? presetTextColorHover : presetTextColor);
                const borderColor = isActive ? presetBorderColorActive : (isHovered ? presetBorderColorHover : presetBorderColorDefault);
                return (
                  <React.Fragment key={preset.name}>
                    <button
                      ref={el => { presetButtonRefs.current[i] = el; }}
                      onClick={() => { setHasPlayed(false); setShowYourSelection(false); cancelAutoPlay(); stopResetSpin(); animateToPreset(preset.values, preset.name); }}
                      onMouseEnter={() => setHoveredPreset(preset.name)}
                      onMouseLeave={() => setHoveredPreset(null)}
                      className={`font-sans cursor-pointer ${presetTextSize}`}
                      style={{
                        width: presetButtonWidth, height: presetButtonHeight, whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: bg, color,
                        border: `${presetBorderWidth}px solid ${borderColor}`,
                        borderRadius: presetBorderRadius, padding: '0 10px',
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        fontWeight: isActive ? 600 : 400,
                        transition: 'background 200ms, color 200ms, border-color 200ms',
                      }}
                    >{preset.name}</button>

                    {/* YOUR SELECTION grows between Research (i=1) and Spatial Experiences */}
                    {i === 1 && (
                      <div style={{
                        overflow: 'hidden', flexShrink: 0,
                        width:      showYourSelection ? presetButtonWidth : 0,
                        marginLeft: showYourSelection ? 0 : -presetButtonGap,
                        opacity:    showYourSelection ? 1 : 0,
                        transition: `width ${yourSelectionTransition}ms ease-out, margin-left ${yourSelectionTransition}ms ease-out, opacity ${yourSelectionTransition}ms ease-out`,
                        display: 'flex', alignItems: 'center',
                      }}>
                        <button
                          ref={yourSelectionBtnRef}
                          className={`font-sans ${presetTextSize}`}
                          style={{
                            width: presetButtonWidth, height: presetButtonHeight,
                            flexShrink: 0, whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: presetFillColorPressed, color: presetTextColorPressed,
                            border: `${presetBorderWidth}px solid ${presetBorderColorActive}`,
                            borderRadius: presetBorderRadius, padding: '0 10px',
                            letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                            cursor: 'default',
                          }}
                        >Your Selection</button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {/* Connector + arrow — translate together as one unit.
                The CSS transform on this div creates a stacking context at z-index:auto (= 0),
                so the preset row above (z-index:1) correctly paints over the connector top. */}
            <div style={{ transform: `translateX(${arrowTranslateX}px)`, transition: `transform ${downArrowFollowDuration}ms ease-out`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Connector funnel — extends connectorTopOverlap px UP (hidden behind button)
                  and connectorBottomOverlap px DOWN (hidden behind circle).
                  Comes first in DOM so the arrow div (next) paints on top of it.
                  Bottom edge is an arc matching the circle's curvature exactly. */}
              <svg
                width={presetButtonWidth}
                height={connectorH}
                style={{
                  display: 'block', overflow: 'visible',
                  marginTop: -connectorTopOverlap,
                  clipPath: `inset(0 0 ${connectorClip}% 0)`,
                  transition: `clip-path ${connectorTransDur}ms ${connectorEasing}`,
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              >
                <path
                  d={connectorPath(presetButtonWidth, connectorTopWidth, connectorH, 24, connectorChamferRadius, connectorTopOverlap)}
                  fill={connectorFillColor}
                  fillOpacity={connectorFillOpacity}
                  stroke={connectorOutline ? connectorOutlineColor : 'none'}
                  strokeWidth={connectorOutline ? connectorOutlineWidth : 0}
                  strokeOpacity={connectorOutline ? connectorOutlineOpacity : 0}
                />
              </svg>
              {/* Neck extension filler — 7px strip between connector flat bottom and bounce wrapper.
                  Invisible at rest; fades in on hover so the gap fills during the bounce.
                  The bounce wrapper's marginTop accounts for this height so arrow never shifts. */}
              <div style={{
                width: 48, height: bounceExtension, flexShrink: 0,
                background: connectorFillColor,
                opacity: (showConnector && hoveredDownArrow && !hasPlayed) ? connectorFillOpacity : 0,
                transition: 'opacity 200ms ease',
                pointerEvents: 'none',
              }} />
              {/* Bounce wrapper — arc SVG + circle div bounce together as one unit.
                  marginTop pulls the wrapper up over the filler AND the connectorBottomOverlap. */}
              <div ref={bounceDivRef} style={{ position: 'relative', width: 48, height: 48, marginTop: -(connectorBottomOverlap + bounceExtension) }}>
                {/* Arc SVG — v6, arc, v7: positioned at wrapper top (= circle top edge).
                    Chord at y=24 (= circle center), arc curves upward to y=0 (= circle top).
                    Bounces with the wrapper so it always traces the circle's upper surface. */}
                <svg
                  width={48} height={24}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    display: 'block', overflow: 'visible', pointerEvents: 'none',
                    clipPath: `inset(0 0 ${connectorClip}% 0)`,
                    transition: `clip-path ${connectorTransDur}ms ${connectorEasing}`,
                  }}
                  aria-hidden="true"
                >
                  <path
                    d="M 0,24 A 24 24 0 0 0 48,24 Z"
                    fill={connectorFillColor}
                    fillOpacity={connectorFillOpacity}
                    stroke={connectorOutline ? connectorOutlineColor : 'none'}
                    strokeWidth={connectorOutline ? connectorOutlineWidth : 0}
                    strokeOpacity={connectorOutline ? connectorOutlineOpacity : 0}
                  />
                </svg>
                {arrowInner}
              </div>
            </div>
          </div>

          {/* Bottom clearance */}
          <div style={{ height: presetsBottomPadding, flexShrink: 0 }} />
        </>
      )}

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
                  aria-label={`Increase ${CATEGORIES[openCat].label}`}
                  style={arrowBtnStyle}
                >+</button>
              )}

              {/* Popout card */}
              <div
                role="dialog"
                aria-label={`${CATEGORIES[openCat].label} description`}
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
                    fontWeight: 700,
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

                {/* Show All button */}
                <div style={{ padding: '10px 18px 14px' }}>
                  <button
                    onClick={() => {
                      const key = CAT_KEYS[openCat];
                      closePopout();
                      setHasPlayed(true);
                      onCategoryFilter?.(key);
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#111'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333'; }}
                    style={{
                      width: '100%',
                      background: '#333',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: 10,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-roboto, Roboto, sans-serif)',
                      textAlign: 'center',
                      padding: '10px 0',
                      transition: 'background 200ms',
                    }}
                  >
                    Show {CATEGORIES[openCat].label} Projects
                  </button>
                </div>
              </div>

              {/* − button rendered below the card for `!above` labels */}
              {!above && (
                <button
                  onClick={() => adjust(openCat, -10)}
                  aria-label={`Decrease ${CATEGORIES[openCat].label}`}
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
