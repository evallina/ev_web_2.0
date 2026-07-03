'use client';

import { useState } from 'react';
import type { HaloOffsets } from './WorkTypeHalo';

// Floating, draggable debug panel for tuning the WorkTypeGraphic halo.
// Appears in debug mode (type "debug"). Live-updates the engine via setOptions.
// Position (X/Y) is stored per mode (desktop / mobile) and owned by WorkTypeHalo.
// Styled to match AlgorithmExplainer. Read the values off the panel (or the JSON
// block at the bottom) to lock in final defaults.

type EngineHandle = { setOptions: (patch: Record<string, unknown>) => void };

interface RangeSpec { key: string; min: number; max: number; step: number; label?: string; kind?: 'range' }
interface EnumSpec  { key: string; kind: 'enum' | 'color'; options: string[]; label?: string }
type ParamSpec = RangeSpec | EnumSpec;

const OFFSET_KEYS = new Set(['offsetXDesktop', 'offsetYDesktop', 'offsetXMobile', 'offsetYMobile']);

const GROUPS: { title: string; mode?: 'desktop' | 'mobile'; params: ParamSpec[] }[] = [
  { title: 'Form', params: [
    { key: 'form',           kind: 'enum', options: ['ring', 'blob', 'hybrid'] },
    { key: 'roundness',      min: 0,    max: 1,   step: 0.05 },
    { key: 'aspect',         min: 0.4,  max: 2.5, step: 0.05 },
    { key: 'scale',          min: 0.2,  max: 1,   step: 0.01 },
    { key: 'amplitude',      min: 0.05, max: 1,   step: 0.05 },
    { key: 'ringWidth',      min: 6,    max: 140, step: 1 },
    { key: 'widthVariation', min: 0,    max: 1,   step: 0.05 },
  ] },
  { title: 'Position — Desktop', mode: 'desktop', params: [
    { key: 'offsetXDesktop', label: 'offsetX', min: -1, max: 1, step: 0.02 },
    { key: 'offsetYDesktop', label: 'offsetY', min: -1, max: 1, step: 0.02 },
  ] },
  { title: 'Position — Mobile', mode: 'mobile', params: [
    { key: 'offsetXMobile', label: 'offsetX', min: -1, max: 1, step: 0.02 },
    { key: 'offsetYMobile', label: 'offsetY', min: -1, max: 1, step: 0.02 },
  ] },
  { title: 'Motion', params: [
    { key: 'speed',         min: 0.05, max: 5,   step: 0.05 },
    { key: 'pokeStrength',  min: 0,    max: 150, step: 5 },
    { key: 'clickStrength', min: 0,    max: 300, step: 10 },
  ] },
  { title: 'Light', params: [
    { key: 'blur',  min: 0,   max: 80, step: 1 },
    { key: 'glow',  min: 0.2, max: 2,  step: 0.05 },
    { key: 'grain', min: 0,   max: 1,  step: 0.05 },
    { key: 'color', kind: 'color', options: ['#FFFFFF', '#F5F1E8', '#EAF0F6'] },
  ] },
];

// Designer defaults (from the handoff) — panel's non-offset params start here.
const DEFAULTS: Record<string, number | string> = {
  form: 'ring', roundness: 0.85, aspect: 1.35, scale: 0.67, amplitude: 0.7,
  ringWidth: 49, widthVariation: 1, speed: 1.65, pokeStrength: 130,
  clickStrength: 130, blur: 14, glow: 1.45, grain: 0.6, color: '#FFFFFF',
};

const label: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
  color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 600,
};
const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.08)', margin: '10px 0' };

interface Props {
  engineRef:      React.RefObject<EngineHandle | null>;
  visible:        boolean;
  offsets:        HaloOffsets;
  onOffsetChange: (key: keyof HaloOffsets, value: number) => void;
  isMobile:       boolean;
}

export default function WorkTypeHaloDebug({ engineRef, visible, offsets, onOffsetChange, isMobile }: Props) {
  const [params, setParams] = useState<Record<string, number | string>>(DEFAULTS);
  const [pos,    setPos]    = useState({ x: 20, y: 90 });

  const update = (key: string, value: number | string) => {
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

  const getVal    = (key: string) => OFFSET_KEYS.has(key) ? offsets[key as keyof HaloOffsets] : params[key];
  const setVal    = (key: string, v: number | string) =>
    OFFSET_KEYS.has(key) ? onOffsetChange(key as keyof HaloOffsets, v as number) : update(key, v);
  const jsonBlock = JSON.stringify({ ...params, ...offsets });

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y, width: 260, maxHeight: '85vh',
        overflowY: 'auto', zIndex: 60, background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, color: 'white',
        opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Draggable header */}
      <div
        onPointerDown={startDrag}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px 10px', cursor: 'move', userSelect: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ ...label, marginBottom: 0 }}>Work Type Graphic</span>
        <span style={{ ...mono, color: 'rgba(255,255,255,0.3)' }}>⠿ drag</span>
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {GROUPS.map((group, gi) => {
          const activeMode = group.mode ? (group.mode === 'mobile') === isMobile : false;
          return (
            <div key={group.title}>
              {gi > 0 && <div style={divider} />}
              <div style={{ ...label, display: 'flex', gap: 6, alignItems: 'center' }}>
                {group.title}
                {group.mode && activeMode && (
                  <span style={{ color: 'rgba(255,220,120,0.95)', letterSpacing: 0 }}>● active</span>
                )}
              </div>
              {group.params.map(spec => {
                const val = getVal(spec.key);
                if ('kind' in spec && (spec.kind === 'enum' || spec.kind === 'color')) {
                  return (
                    <div key={spec.key} style={{ marginBottom: 10 }}>
                      <div style={{ ...mono, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{spec.label ?? spec.key}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {spec.options.map(opt => {
                          const active  = val === opt;
                          const isColor = spec.kind === 'color';
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setVal(spec.key, opt)}
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
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{spec.label ?? spec.key}</span>
                      <span style={{ color: 'rgba(255,220,120,0.95)' }}>{val}</span>
                    </div>
                    <input
                      type="range"
                      min={r.min} max={r.max} step={r.step}
                      value={val as number}
                      onChange={e => setVal(spec.key, parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#D9A938', cursor: 'pointer' }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={divider} />
        <div style={label}>Values</div>
        <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {jsonBlock}
        </div>
      </div>
    </div>
  );
}
