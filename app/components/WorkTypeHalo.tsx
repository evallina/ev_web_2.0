'use client';

import { useEffect, useRef } from 'react';
import { WorkTypeGraphic } from '@/src/lib/workTypeGraphic';

// React wrapper around the vendored WorkTypeGraphic canvas engine
// (src/lib/workTypeGraphic.js). Designer-tuned defaults are baked into the
// engine; to tune a placement, edit WorkTypeGraphic.defaults there.

interface WorkTypeHaloProps {
  /** Sizing box for the graphic (the canvas fills it). */
  style?:     React.CSSProperties;
  className?: string;
}

export default function WorkTypeHalo({ style, className }: WorkTypeHaloProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const g = new WorkTypeGraphic(el, { background: 'transparent' });
    return () => g.destroy();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ position: 'relative', ...style }}
    />
  );
}
