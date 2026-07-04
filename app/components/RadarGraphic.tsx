'use client';

import { useEffect, useRef } from 'react';
import { RadarGraphic as Engine } from '@/src/lib/radarGraphic';
import RadarGraphicDebug from './RadarGraphicDebug';

// Canvas overlay that renders the radar shape as a blurry/grainy ring|blob|hybrid
// (or 'original' line), driven by the current radar `values` + `ghosts`. Positioned
// absolutely over the SVG; geometry (viewBox 800×760) matches the SVG so it lines up.

type EngineHandle = {
  setOptions: (patch: Record<string, unknown>) => void;
  setValues:  (vals: number[]) => void;
  setGhosts:  (list: number[][], opacities?: number[]) => void;
};

// Mirrors GHOST_OPACITIES in RadarChart (oldest → newest).
const GHOST_OPACITIES = [0.08, 0.14, 0.20, 0.28, 0.40];

interface Props {
  values:       number[];
  ghosts:       number[][];
  form:         string;
  onFormChange: (f: string) => void;
  showDebug?:   boolean;
}

export default function RadarGraphic({ values, ghosts, form, onFormChange, showDebug = false }: Props) {
  const ref       = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const g = new Engine(el, { background: 'transparent' });
    engineRef.current = g;
    return () => { g.destroy(); engineRef.current = null; };
  }, []);

  useEffect(() => { engineRef.current?.setValues(values); }, [values]);

  useEffect(() => {
    const ops = ghosts.map((_, i) => GHOST_OPACITIES[i + 5 - ghosts.length] ?? 0.15);
    engineRef.current?.setGhosts(ghosts, ops);
  }, [ghosts]);

  useEffect(() => { engineRef.current?.setOptions({ form }); }, [form]);

  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          display:       form === 'original' ? 'none' : 'block',
          pointerEvents: 'none',
        }}
      />
      <RadarGraphicDebug engineRef={engineRef} visible={showDebug} form={form} onFormChange={onFormChange} />
    </>
  );
}
