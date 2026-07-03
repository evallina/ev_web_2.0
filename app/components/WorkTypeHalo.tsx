'use client';

import { useEffect, useRef, useState } from 'react';
import { WorkTypeGraphic } from '@/src/lib/workTypeGraphic';
import WorkTypeHaloDebug from './WorkTypeHaloDebug';

// React wrapper around the vendored WorkTypeGraphic canvas engine
// (src/lib/workTypeGraphic.js). Designer-tuned defaults are baked into the
// engine. When showDebug is on, a floating panel live-tunes the engine.

type EngineHandle = { setOptions: (patch: Record<string, unknown>) => void };

export interface HaloOffsets {
  offsetXDesktop: number;
  offsetYDesktop: number;
  offsetXMobile:  number;
  offsetYMobile:  number;
}

// Default graphic position per mode — fraction of half-canvas (−1 … 1; 0 = centred).
// Tune with the debug panel, then set the final values here.
const DEFAULT_OFFSETS: HaloOffsets = {
  offsetXDesktop: 0.26, offsetYDesktop: 0.04,
  offsetXMobile:  0,    offsetYMobile:  0.3,
};
const HALO_MOBILE_BP = 750; // px — matches the site's mobile breakpoint

interface WorkTypeHaloProps {
  /** Sizing box for the graphic (the canvas fills it). */
  style?:     React.CSSProperties;
  className?: string;
  /** Show the floating parameter-tuning panel (debug mode). */
  showDebug?: boolean;
}

export default function WorkTypeHalo({ style, className, showDebug = false }: WorkTypeHaloProps) {
  const ref       = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [offsets,  setOffsets]  = useState<HaloOffsets>(DEFAULT_OFFSETS);
  const [isMobile, setIsMobile] = useState(false);

  // Create / destroy the engine (declared first so it runs before the apply effect).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const g = new WorkTypeGraphic(el, { background: 'transparent' });
    engineRef.current = g;
    return () => { g.destroy(); engineRef.current = null; };
  }, []);

  // Track viewport mode.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < HALO_MOBILE_BP);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Feed the active mode's offset to the engine (re-applies on mode / value change).
  useEffect(() => {
    engineRef.current?.setOptions({
      offsetX: isMobile ? offsets.offsetXMobile : offsets.offsetXDesktop,
      offsetY: isMobile ? offsets.offsetYMobile : offsets.offsetYDesktop,
    });
  }, [isMobile, offsets]);

  const onOffsetChange = (key: keyof HaloOffsets, value: number) =>
    setOffsets(o => ({ ...o, [key]: value }));

  return (
    <>
      <div
        ref={ref}
        className={className}
        aria-hidden="true"
        style={{ position: 'relative', width: '100%', height: '100%', ...style }}
      />
      <WorkTypeHaloDebug
        engineRef={engineRef}
        visible={showDebug}
        offsets={offsets}
        onOffsetChange={onOffsetChange}
        isMobile={isMobile}
      />
    </>
  );
}
