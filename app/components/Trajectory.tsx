'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Design variables ──────────────────────────────────────────────────────────
const MOBILE_BREAKPOINT = 700;   // px — below this width, image becomes tappable
const INITIAL_ZOOM      = 2.0;   // multiplier on top of fit-to-screen when popout opens
const MIN_SCALE         = 0.2;   // lower bound for zoom
const MAX_SCALE         = 10;    // upper bound for zoom
const ZOOM_SPEED        = 1.15;  // multiplier per wheel tick
const KEY_SCROLL_STEP   = 160;   // px — distance scrolled per arrow key press while in section

export default function Trajectory() {
  const [isMobile,      setIsMobile]      = useState(false);
  const [popoutOpen,    setPopoutOpen]    = useState(false);
  const [popoutVisible, setPopoutVisible] = useState(false);
  const [inView,        setInView]        = useState(false);

  const sectionRef   = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);  // the pan/zoom hit area
  const imgWrapRef   = useRef<HTMLDivElement>(null);  // the element we transform
  const scaleRef     = useRef(1);
  const offsetRef    = useRef({ x: 0, y: 0 });

  // Write scale+offset straight to the DOM — no React re-render during drag
  const applyTransform = useCallback(() => {
    if (!imgWrapRef.current) return;
    imgWrapRef.current.style.transform =
      `translate(${offsetRef.current.x}px, ${offsetRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // Fit image to viewport and centre it
  const initTransform = useCallback(() => {
    const img = imgWrapRef.current?.querySelector('img') as HTMLImageElement | null;
    if (!img) return;
    const nw = img.naturalWidth  || 800;
    const nh = img.naturalHeight || 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit   = Math.min(vw / nw, vh / nh) * 0.95;
    const open  = Math.min(fit * INITIAL_ZOOM, MAX_SCALE);
    scaleRef.current  = open;
    offsetRef.current = { x: (vw - nw * open) / 2, y: (vh - nh * open) / 2 };
    applyTransform();
  }, [applyTransform]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Track section visibility
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Arrow key smooth scroll — capture phase fires before page.tsx bubble-phase handler
  useEffect(() => {
    if (!inView || popoutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      e.stopPropagation();
      window.scrollBy({ top: e.key === 'ArrowDown' ? KEY_SCROLL_STEP : -KEY_SCROLL_STEP, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [inView, popoutOpen]);

  // Open popout
  const openPopout = useCallback(() => {
    scaleRef.current  = 1;
    offsetRef.current = { x: 0, y: 0 };
    setPopoutOpen(true);
    // Two rAFs: first to mount DOM, second to trigger CSS transition + init transform
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setPopoutVisible(true);
      initTransform();
    }));
  }, [initTransform]);

  // Close popout
  const closePopout = useCallback(() => {
    setPopoutVisible(false);
    setTimeout(() => setPopoutOpen(false), 200);
  }, []);

  // Escape key
  useEffect(() => {
    if (!popoutOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopout(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popoutOpen, closePopout]);

  // ── Wheel zoom ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!popoutOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;
      const factor   = e.deltaY < 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor));
      const ptX = (cx - offsetRef.current.x) / scaleRef.current;
      const ptY = (cy - offsetRef.current.y) / scaleRef.current;
      offsetRef.current = { x: cx - ptX * newScale, y: cy - ptY * newScale };
      scaleRef.current  = newScale;
      applyTransform();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [popoutOpen, applyTransform]);

  // ── Mouse drag (pan) ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!popoutOpen) return;
    const el = containerRef.current;
    if (!el) return;
    let active = false;
    let sx = 0, sy = 0, sox = 0, soy = 0;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      active = true;
      sx = e.clientX; sy = e.clientY;
      sox = offsetRef.current.x; soy = offsetRef.current.y;
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!active) return;
      offsetRef.current = { x: sox + e.clientX - sx, y: soy + e.clientY - sy };
      applyTransform();
    };
    const onUp = () => { active = false; el.style.cursor = 'grab'; };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [popoutOpen, applyTransform]);

  // ── Touch: single-finger pan + two-finger pinch zoom ────────────────────────
  useEffect(() => {
    if (!popoutOpen) return;
    const el = containerRef.current;
    if (!el) return;

    type Pt = { x: number; y: number };
    const snap = (tl: TouchList): Pt[] =>
      Array.from(tl).map(t => ({ x: t.clientX, y: t.clientY }));
    const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid  = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    let prev: Pt[] = [];

    const onStart = (e: TouchEvent) => { e.preventDefault(); prev = snap(e.touches); };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const cur = snap(e.touches);
      const rect = el.getBoundingClientRect();

      if (cur.length === 1 && prev.length >= 1) {
        // Pan
        offsetRef.current = {
          x: offsetRef.current.x + cur[0].x - prev[0].x,
          y: offsetRef.current.y + cur[0].y - prev[0].y,
        };
        applyTransform();
      } else if (cur.length === 2 && prev.length === 2) {
        // Pinch zoom + pan simultaneously
        const prevDist = dist(prev[0], prev[1]);
        const curDist  = dist(cur[0],  cur[1]);
        const factor   = prevDist > 0 ? curDist / prevDist : 1;
        const center   = mid(cur[0], cur[1]);
        const prevCenter = mid(prev[0], prev[1]);
        const dx = center.x - prevCenter.x;
        const dy = center.y - prevCenter.y;
        const cx = center.x - rect.left;
        const cy = center.y - rect.top;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor));
        // Zoom towards pinch midpoint, then apply pan delta
        const ptX = (cx - offsetRef.current.x - dx) / scaleRef.current;
        const ptY = (cy - offsetRef.current.y - dy) / scaleRef.current;
        offsetRef.current = { x: cx - ptX * newScale, y: cy - ptY * newScale };
        scaleRef.current  = newScale;
        applyTransform();
      }
      prev = cur;
    };

    const onEnd = (e: TouchEvent) => { prev = snap(e.touches); };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [popoutOpen, applyTransform]);


  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <section
        ref={sectionRef}
        id="trajectory"
        className="min-h-screen flex flex-col items-center justify-center py-20 overflow-hidden"
      >
        <h2 className="font-serif font-bold text-white text-4xl mb-12">{/* Trajectory */}</h2>

        <div
          className="w-full"
          style={{ paddingLeft: 'var(--page-margin)', paddingRight: 'var(--page-margin)' }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Wrap image in a div so click works even though img has pointer-events:none */}
          <div
            data-parallax
            onClick={isMobile ? openPopout : undefined}
            style={isMobile ? { cursor: 'zoom-in' } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/trajectory/2026-01-20_Timeline.png"
              alt="My Trajectory — Timeline"
              className="w-full h-auto img-protected"
            />
          </div>

          {isMobile && (
            <p style={{
              textAlign:     'center',
              marginTop:     8,
              fontSize:      10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.35)',
              userSelect:    'none',
              fontFamily:    'var(--font-sans)',
            }}>
              Tap to explore
            </p>
          )}
        </div>
      </section>

      {/* ── Pan / zoom popout ─────────────────────────────────────────────────── */}
      {popoutOpen && (
        <div
          style={{
            position:   'fixed',
            inset:       0,
            zIndex:      500,
            background: 'rgba(10,10,11,0.97)',
            opacity:     popoutVisible ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
        >
          {/* Hit area: captures all pointer & touch events for pan/zoom */}
          <div
            ref={containerRef}
            style={{
              position:    'absolute',
              inset:        0,
              overflow:    'hidden',
              cursor:      'grab',
              touchAction: 'none',   // prevent browser scroll/zoom interference
            }}
          >
            {/* Transformed layer */}
            <div
              ref={imgWrapRef}
              style={{
                position:        'absolute',
                top:              0,
                left:             0,
                transformOrigin: '0 0',
                willChange:      'transform',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/trajectory/2026-01-20_Timeline.png"
                alt="My Trajectory — Timeline (zoom view)"
                className="img-protected"
                style={{ display: 'block', maxWidth: 'none' }}
                onLoad={initTransform}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            </div>
          </div>

          {/* × Close */}
          <button
            onClick={closePopout}
            aria-label="Close zoom view"
            style={{
              position:       'fixed',
              top:             14,
              right:           14,
              zIndex:          501,
              width:           36,
              height:          36,
              background:     'rgba(0,0,0,0.55)',
              border:         '1px solid rgba(255,255,255,0.18)',
              borderRadius:   '50%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              color:          'white',
            }}
          >
            <svg
              width={13} height={13} viewBox="0 0 13 13"
              fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1={1} y1={1} x2={12} y2={12} />
              <line x1={12} y1={1} x2={1} y2={12} />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
