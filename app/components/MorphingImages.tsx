'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ============================================================
// MORPHING IMAGES — CONFIGURABLE PARAMETERS
// ============================================================
//
// ── Passed as props from page.tsx ───────────────────────────
//   morphTransitionDuration   Duration of the warp morph between two images (ms).
//   morphPauseDuration        How long each image stays fully visible before morphing (ms).
//   morphIntensity            Distortion strength passed to the shader as uIntensity.
//                             0.0 = plain crossfade, 1.0 = extreme warp.
//
// ── Per-transition randomisation ─────────────────────────────
//   Before each morph, two values are re-randomised automatically:
//   uAngle  — a random direction (0–2π) converted to a unit vec2 in the shader,
//             so the warp flows in a different direction every time (left-right,
//             top-bottom, diagonal, etc.).
//   uOffset — a random UV offset (0–1 in x and y) that shifts which region of
//             the noise texture is sampled, giving a different warp pattern each time.
//
// ── Displacement noise texture ───────────────────────────────
//   The noise is built from four sine-wave octaves summed together.
//   Each octave has a frequency (cycle count across the texture) and
//   an amplitude (contribution weight). Higher frequency = tighter,
//   more detailed displacement features.
const NOISE_SIZE  = 512;   // Texture resolution in px. Must be a power of 2 (64–512).
                            // Higher = finer grain detail; lower = blockier.
const NOISE_F1 = 20;  const NOISE_A1 = 0.500; // Octave 1 — broad, sweeping shapes
const NOISE_F2 = 25;  const NOISE_A2 = 0.250; // Octave 2 — medium features
const NOISE_F3 = 25;  const NOISE_A3 = 0.125; // Octave 3 — fine detail
const NOISE_F4 = 25;  const NOISE_A4 = 0.063; // Octave 4 — subtle micro-detail
//
// ── Renderer ─────────────────────────────────────────────────
const MAX_PIXEL_RATIO = 4; // Caps devicePixelRatio to avoid overdraw on Retina/4K screens.
//
// ── Easing ───────────────────────────────────────────────────
//   The raw 0→1 progress is run through a smoothstep curve:
//     eased = p² × (3 − 2p)
//   This gives a slow start, fast middle, slow end feel.
//   To use a linear transition instead, replace the easing line with:
//     uniforms.uProgress.value = p;
//
// ── Canvas size ───────────────────────────────────────────────
//   Set via the `style` prop on the component in page.tsx.
//   Current value: { width: '42vw', height: '42vw', maxHeight: '65vh' }
//   All six category images are square (1:1), so a square canvas is correct.
// ============================================================

// ── Vertex shader ─────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Fragment shader — displacement morph ──────────────────────────────────────
// A grayscale displacement map offsets the UV sampling of both textures in
// opposite directions as uProgress goes 0→1, creating a fluid warp-dissolve.
const FRAG = /* glsl */`
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform sampler2D uDisp;
  uniform float     uProgress;   // 0.0 = fully image A, 1.0 = fully image B
  uniform float     uIntensity;  // warp strength (morphIntensity prop)
  uniform float     uAngle;      // random warp direction for this transition (0–2π)
  uniform vec2      uOffset;     // random UV offset into the displacement texture

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Sample a random region of the noise texture so the pattern differs each time
    float disp = texture2D(uDisp, uv + uOffset).r - 0.5;

    // Convert the random angle into a unit direction vector, then scale by displacement
    vec2 dir  = vec2(cos(uAngle), sin(uAngle));
    vec2 warp = dir * disp * uIntensity;

    // A and B warp in opposite directions proportional to progress
    vec2 uv1 = uv + warp *        uProgress;
    vec2 uv2 = uv - warp * (1.0 - uProgress);

    vec4 c1 = texture2D(uTex1, uv1);
    vec4 c2 = texture2D(uTex2, uv2);

    gl_FragColor = mix(c1, c2, uProgress);
  }
`;

// ── Multi-octave sine noise texture ───────────────────────────────────────────
function makeNoiseTexture(): THREE.DataTexture {
  const TAU  = Math.PI * 2;
  const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE);

  for (let y = 0; y < NOISE_SIZE; y++) {
    for (let x = 0; x < NOISE_SIZE; x++) {
      const nx = x / NOISE_SIZE;
      const ny = y / NOISE_SIZE;
      const v =
        Math.sin(nx * TAU * NOISE_F1 + ny * TAU * (NOISE_F1 - 1)) * NOISE_A1 +
        Math.sin(nx * TAU * NOISE_F2 - ny * TAU * (NOISE_F2 - 2)) * NOISE_A2 +
        Math.sin(nx * TAU * NOISE_F3 + ny * TAU * (NOISE_F3 - 2)) * NOISE_A3 +
        Math.sin(nx * TAU * NOISE_F4 - ny * TAU * (NOISE_F4 - 4)) * NOISE_A4;
      // Normalise to [0, 255]
      const maxAmp = NOISE_A1 + NOISE_A2 + NOISE_A3 + NOISE_A4;
      data[y * NOISE_SIZE + x] = Math.round((v / maxAmp) * 127 + 127);
    }
  }

  const tex = new THREE.DataTexture(data, NOISE_SIZE, NOISE_SIZE, THREE.RedFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MorphingImagesProps {
  images: string[];
  morphTransitionDuration: number;
  morphPauseDuration: number;
  morphIntensity: number;
  className?: string;
  style?: React.CSSProperties;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MorphingImages({
  images,
  morphTransitionDuration,
  morphPauseDuration,
  morphIntensity,
  className,
  style,
}: MorphingImagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = images.length > 0 ? wrapRef.current : null;
    if (!wrap) return;

    // ── WebGL availability check ───────────────────────────────────────────────
    const probe  = document.createElement('canvas');
    const hasWebGL = !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));

    if (!hasWebGL) {
      const img = document.createElement('img');
      img.src   = images[0];
      img.alt   = '';
      img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;';
      wrap.appendChild(img);
      return () => { if (wrap.contains(img)) wrap.removeChild(img); };
    }

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    const canvas = renderer.domElement;
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
    wrap.appendChild(canvas);

    // ── Scene / camera / plane ────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
    const geo    = new THREE.PlaneGeometry(1, 1);
    const disp   = makeNoiseTexture();

    // ── Shader uniforms ───────────────────────────────────────────────────────
    const uniforms: Record<string, THREE.IUniform> = {
      uTex1:      { value: null as THREE.Texture | null },
      uTex2:      { value: null as THREE.Texture | null },
      uDisp:      { value: disp },
      uProgress:  { value: 0.0 },
      uIntensity: { value: morphIntensity },
      uAngle:     { value: 0.0 },                          // re-randomised before each morph
      uOffset:    { value: new THREE.Vector2(0.0, 0.0) },  // re-randomised before each morph
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
    });
    scene.add(new THREE.Mesh(geo, mat));

    // ── Resize observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
      renderer.render(scene, camera);
    });
    ro.observe(wrap);

    // ── Texture loading ───────────────────────────────────────────────────────
    const textures: (THREE.Texture | null)[] = new Array(images.length).fill(null);
    let loadedCount = 0;
    let rafId  = 0;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const loader = new THREE.TextureLoader();
    images.forEach((src, i) => {
      loader.load(src, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        textures[i]   = tex;
        if (++loadedCount === images.length) kickoff();
      });
    });

    // ── Animation state machine ───────────────────────────────────────────────
    // currentIdx is the ONLY place that tracks which image is "current".
    // It is advanced in exactly one place: inside the step() completion branch.
    let currentIdx = 0;

    const render = () => renderer.render(scene, camera);

    // Show the first image and start the pause before the first morph.
    const kickoff = () => {
      uniforms.uTex1.value     = textures[0];
      uniforms.uTex2.value     = textures[1 % images.length];
      uniforms.uProgress.value = 0.0;
      render();
      timerId = setTimeout(beginMorph, morphPauseDuration);
    };

    // Set up the next morph from currentIdx → nextIdx and start the RAF loop.
    const beginMorph = () => {
      const nextIdx = (currentIdx + 1) % images.length;

      // Randomise warp direction and noise region for every transition
      uniforms.uAngle.value  = Math.random() * Math.PI * 2;
      uniforms.uOffset.value = new THREE.Vector2(Math.random(), Math.random());

      uniforms.uTex1.value     = textures[currentIdx];
      uniforms.uTex2.value     = textures[nextIdx];
      uniforms.uProgress.value = 0.0;

      const t0 = performance.now();

      const step = (now: number) => {
        const raw = (now - t0) / morphTransitionDuration;
        const p   = Math.min(raw, 1.0);
        // Smoothstep easing: slow start → fast middle → slow end
        uniforms.uProgress.value = p * p * (3 - 2 * p);
        render();

        if (p < 1.0) {
          rafId = requestAnimationFrame(step);
        } else {
          // ── Transition complete ──────────────────────────────────────────
          // uProgress is now 1.0 → the shader already shows uTex2 at full
          // opacity. We advance currentIdx here (the only place), then wait
          // through the pause WITHOUT touching the uniforms or rendering —
          // the canvas holds the correct last frame automatically.
          // beginMorph will swap textures and reset uProgress at the start
          // of the next transition, preventing any flash.
          currentIdx = nextIdx;
          timerId = setTimeout(beginMorph, morphPauseDuration);
        }
      };

      rafId = requestAnimationFrame(step);
    };

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      disp.dispose();
      textures.forEach(t => t?.dispose());
      renderer.dispose();
      if (wrap.contains(canvas)) wrap.removeChild(canvas);
    };

  // Props are stable compile-time constants — safe to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={wrapRef} className={className} style={style} />;
}
