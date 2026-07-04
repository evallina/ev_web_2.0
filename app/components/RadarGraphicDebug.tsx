'use client';

import { useEffect, useState } from 'react';

// Floating, draggable debug panel (right side) for tuning the radar RadarGraphic.
// Appears in debug mode. 'type' (form) is owned by RadarChart (also hides the SVG
// shape); the rest live-update the engine via setOptions. Styled like AlgorithmExplainer.

type EngineHandle = { setOptions: (patch: Record<string, unknown>) => void };

interface RangeSpec { key: string; min: number; max: number; step: number; label?: string; kind?: 'range' }
interface EnumSpec  { key: string; kind: 'enum' | 'color'; options: string[]; labels?: string[] }
type ParamSpec = RangeSpec | EnumSpec;

const GROUPS: { title: string; params: ParamSpec[] }[] = [
  { title: 'Form', params: [
    { key: 'form', kind: 'enum', options: ['original', 'ring', 'blob', 'hybrid'] },
    { key: 'roundness', min: 0, max: 1,   step: 0.05 },
    { key: 'ringWidth', min: 6, max: 140, step: 1 },
  ] },
  { title: 'Motion', params: [
    { key: 'bounce', label: 'bouncing', min: 0, max: 2.5, step: 0.05 },
  ] },
  { title: 'Light', params: [
    { key: 'blur',  min: 0,   max: 80, step: 1 },
    { key: 'glow',  min: 0.2, max: 2,  step: 0.05 },
    { key: 'grain', min: 0,   max: 1,  step: 0.05 },
    { key: 'color', kind: 'color', options: ['#FFFFFF', '#F5F1E8', '#EAF0F6'] },
  ] },
];

const DEFAULTS: Record<string, number | string> = {
  roundness: 0.85, ringWidth: 36, bounce: 2.2, blur: 7, glow: 2, grain: 0.45, color: '#FFFFFF',
};

const label: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
  color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 600,
};
const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.08)', margin: '10px 0' };

interface Props {
  engineRef:    React.RefObject<EngineHandle | null>;
  visible:      boolean;
  form:         string;
  onFormChange: (f: string) => void;
}

export default function RadarGraphicDebug({ engineRef, visible, form, onFormChange }: Props) {
  const [params, setParams] = useState<Record<string, number | string>>(DEFAULTS);
  const [pos,    setPos]    = useState({ x: 900, y: 90 });

  // Place on the right on mount (function-wrapped so it isn't a bare setState-in-effect).
  useEffect(() => {
    const place = () => setPos({ x: Math.max(20, window.innerWidth - 300), y: 90 });
    place();
  }, []);

  // Only show while the radar (project-selection) section is on screen.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById('project-selection');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const show = visible && inView;

  const update = (key: string, value: number | string) => {
    if (key === 'form') { onFormChange(value as string); return; }
    setParams(p => ({ ...p, [key]: value }));
    engineRef.current?.setOptions({ [key]: value });
  };

  const startDrag = (e: React.PointerEvent) => {
    const sx = e.clientX, sy = e.clientY, px = pos.x, py = pos.y;
    const move = (ev: PointerEvent) => setPos({ x: px + (ev.clientX - sx), y: py + (ev.clientY - sy) });
    const up   = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const getVal    = (key: string) => (key === 'form' ? form : params[key]);
  const jsonBlock = JSON.stringify({ form, ...params });

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y, width: 260, maxHeight: '85vh',
        overflowY: 'auto', zIndex: 60, background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, color: 'white',
        opacity: show ? 1 : 0, pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity 200ms ease',
      }}
    >
      <div
        onPointerDown={startDrag}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px 10px', cursor: 'move', userSelect: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ ...label, marginBottom: 0 }}>Radar Shape</span>
        <span style={{ ...mono, color: 'rgba(255,255,255,0.3)' }}>⠿ drag</span>
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {GROUPS.map((group, gi) => (
          <div key={group.title}>
            {gi > 0 && <div style={divider} />}
            <div style={label}>{group.title}</div>
            {group.params.map(spec => {
              const val = getVal(spec.key);
              if ('kind' in spec && (spec.kind === 'enum' || spec.kind === 'color')) {
                return (
                  <div key={spec.key} style={{ marginBottom: 10 }}>
                    <div style={{ ...mono, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{spec.key}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {spec.options.map(opt => {
                        const active  = val === opt;
                        const isColor = spec.kind === 'color';
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => update(spec.key, opt)}
                            title={opt}
                            style={{
                              cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
                              padding: isColor ? 0 : '3px 8px',
                              width: isColor ? 22 : undefined, height: isColor ? 22 : undefined,
                              borderRadius: 4,
                              border: active ? '1px solid rgba(255,220,120,0.9)' : '1px solid rgba(255,255,255,0.15)',
                              background: isColor ? opt : (active ? 'rgba(217,169,56,0.35)' : 'rgba(255,255,255,0.06)'),
                              color: active ? 'rgba(255,220,120,0.95)' : 'rgba(255,255,255,0.7)',
                            }}
                          >
                            {isColor ? '' : opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              const r = spec as RangeSpec;
              return (
                <div key={spec.key} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, marginBottom: 2 }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>{r.label ?? r.key}</span>
                    <span style={{ color: 'rgba(255,220,120,0.95)' }}>{val}</span>
                  </div>
                  <input
                    type="range"
                    min={r.min} max={r.max} step={r.step}
                    value={val as number}
                    onChange={e => update(spec.key, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#D9A938', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        ))}

        <div style={divider} />
        <div style={label}>Values</div>
        <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {jsonBlock}
        </div>
      </div>
    </div>
  );
}
