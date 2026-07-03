/**
 * WorkTypeGraphic — framework-agnostic canvas animation.
 * A blurred, grainy 5-point radar silhouette rendered as a glowing ring
 * that slowly morphs between random value sets, and reacts to hover/click
 * like a living organism.
 *
 * Vendored 1:1 from design_handoff_work_type_graphic/work-type-graphic.js
 * (designer-tuned constants — do not change). Only the export was adapted to ESM.
 * Zero dependencies. Wrapped for React in app/components/WorkTypeHalo.tsx.
 */
class WorkTypeGraphic {
  static defaults = {
    form: 'ring',          // 'ring' | 'blob' | 'hybrid'
    roundness: 0.85,       // 0 = sharp polygon corners, 1 = fully rounded
    aspect: 1.35,          // width:height stretch (1 = square)
    scale: 0.67,           // shape diameter relative to min(container w,h)
    amplitude: 0.7,        // how far vertices travel (0–1)
    ringWidth: 49,         // base ring thickness (offscreen-canvas px)
    widthVariation: 1,     // per-vertex thickness variation (0–1)
    speed: 1.65,           // passive morph speed
    pokeStrength: 130,     // hover reaction
    clickStrength: 130,    // click reaction
    blur: 14,              // core blur
    glow: 1.45,            // brightness multiplier
    grain: 0.6,            // film-grain intensity (0–1)
    color: '#FFFFFF',
    offsetX: 0,            // x position of the graphic, fraction of half-canvas (−1 left … 1 right)
    offsetY: 0,            // y position of the graphic, fraction of half-canvas (−1 up … 1 down)
    background: 'transparent' // 'transparent' | any CSS color
  };

  constructor(container, options = {}) {
    this.opts = { ...WorkTypeGraphic.defaults, ...options };
    this.container = container;
    if (this.opts.background !== 'transparent') {
      container.style.background = this.opts.background;
    }

    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;cursor:pointer;touch-action:none';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cv);
    this.cv = cv;

    // 5 vertices, each with a radius morph, a width morph, and spring state
    this.verts = [];
    for (let i = 0; i < 5; i++) {
      this.verts.push({
        r: { val: 0.8, from: 0.8, to: 0.8, t: 1, dur: 0.01 },
        w: { val: 1, from: 1, to: 1, t: 1, dur: 0.01 },
        p: 0, pv: 0, wp: 0, wpv: 0
      });
    }
    this.pulse = { val: 1, from: 1, to: 1, t: 1, dur: 0.01 };
    this.flash = 0;
    this.inside = false;
    this.dispR = 100;
    this.dispCx = null;   // shape centre on the display canvas (CSS px) — set each frame
    this.dispCy = null;
    this.pattern = null;

    this.off = document.createElement('canvas');
    this.off.width = this.off.height = 640;

    // Does this 2D context actually honour ctx.filter blur? Blink (Chrome/Android): yes;
    // WebKit (Safari desktop + iOS, and iOS Chrome): no. Detected by blurring a test rect
    // and checking whether it bled. When unsupported we blur the canvas element via CSS.
    this.useCtxFilter = (() => {
      try {
        const tc = document.createElement('canvas'); tc.width = tc.height = 20;
        const tx = tc.getContext('2d');
        tx.filter = 'blur(4px)';
        tx.fillStyle = '#fff';
        tx.fillRect(9, 9, 2, 2);        // tiny opaque dot
        tx.filter = 'none';
        // if the blur was honoured the dot spreads out → centre alpha drops far below 255
        return tx.getImageData(10, 10, 1, 1).data[3] < 200;
      } catch { return false; }
    })();
    this._cssBlur = -1; // cached CSS-blur px (WebKit path) to avoid redundant style writes

    // static film-grain tile
    const nz = document.createElement('canvas');
    nz.width = nz.height = 256;
    const nctx = nz.getContext('2d');
    const id = nctx.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
      id.data[i + 3] = Math.random() * 255;
    }
    nctx.putImageData(id, 0, 0);
    this.noise = nz;

    this._onMove = (e) => this.onMove(e);
    this._onLeave = () => { this.inside = false; };
    this._onDown = (e) => this.pokeAt(e, this.opts.clickStrength);
    cv.addEventListener('pointermove', this._onMove);
    cv.addEventListener('pointerleave', this._onLeave);
    cv.addEventListener('pointerdown', this._onDown);

    this.cw = 300; this.ch = 300;
    this.ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      this.cw = Math.max(1, r.width);
      this.ch = Math.max(1, r.height);
    });
    this.ro.observe(container);

    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.cv.removeEventListener('pointermove', this._onMove);
    this.cv.removeEventListener('pointerleave', this._onLeave);
    this.cv.removeEventListener('pointerdown', this._onDown);
    this.cv.remove();
  }

  onMove(e) {
    const rect = this.cv.getBoundingClientRect();
    const dx = e.clientX - (rect.left + (this.dispCx ?? rect.width / 2));
    const dy = e.clientY - (rect.top + (this.dispCy ?? rect.height / 2));
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < this.dispR * 1.15) {
      if (!this.inside) {
        this.poke(this.opts.pokeStrength);
        this.inside = true;
      }
    } else if (d > this.dispR * 1.4) {
      this.inside = false;
    }
  }

  poke(s) {
    for (const v of this.verts) {
      v.pv += (Math.random() - 0.5) * 2 * s * 2.2;
      v.wpv += (Math.random() - 0.5) * s * 3;
    }
    this.flash = Math.min(1.6, this.flash + s / 90);
  }

  // Directed poke — pushes the vertex nearest the pointer OUTWARD (neighbours less),
  // mimicking the radar chart's poke-out. Used on click/press.
  pokeAt(e, s) {
    const rect = this.cv.getBoundingClientRect();
    const ang = Math.atan2(e.clientY - (rect.top + (this.dispCy ?? rect.height / 2)), e.clientX - (rect.left + (this.dispCx ?? rect.width / 2)));
    let nearest = 0, best = Infinity;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      let da = Math.abs(ang - a) % (Math.PI * 2);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < best) { best = da; nearest = i; }
    }
    for (let i = 0; i < 5; i++) {
      let ring = Math.abs(i - nearest);
      ring = Math.min(ring, 5 - ring);
      const falloff = ring === 0 ? 1 : ring === 1 ? 0.3 : 0.08;
      this.verts[i].pv += s * 2.2 * falloff;                     // outward radius kick
      this.verts[i].wpv += (Math.random() - 0.5) * s * falloff;  // subtle width jitter
    }
    this.flash = Math.min(1.6, this.flash + s / 90);
  }

  // Live-update options (used by the debug panel).
  setOptions(patch) {
    Object.assign(this.opts, patch);
    if (patch.background !== undefined && patch.background !== 'transparent') {
      this.container.style.background = patch.background;
    }
  }

  newDur(speed) {
    return (5 + Math.random() * 5) / Math.max(0.05, speed);
  }

  stepMorph(m, dt, speed, pick) {
    m.t += dt / m.dur;
    if (m.t >= 1) {
      m.from = m.to;
      m.to = pick();
      m.t = 0;
      m.dur = this.newDur(speed);
    }
    const x = Math.min(1, Math.max(0, m.t));
    const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // ease-in-out cubic
    m.val = m.from + (m.to - m.from) * e;
  }

  smoothPath(path, pts, round) {
    const n = pts.length;
    const r = Math.min(1, Math.max(0, round));
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const mPrev = mid(pts[(i - 1 + n) % n], p);
      const mNext = mid(p, pts[(i + 1) % n]);
      const cIn = lerp(p, mPrev, r);
      const cOut = lerp(p, mNext, r);
      if (i === 0) path.moveTo(cIn[0], cIn[1]);
      else path.lineTo(cIn[0], cIn[1]);
      path.quadraticCurveTo(p[0], p[1], cOut[0], cOut[1]);
    }
    path.closePath();
  }

  tick(t) {
    this.raf = requestAnimationFrame((tt) => this.tick(tt));
    const dt = Math.min(0.033, (t - this.last) / 1000);
    this.last = t;
    const o = this.opts;

    // passive morphing (ease-in-out between random targets) + poke springs
    const rMin = Math.max(0.2, 1 - o.amplitude * 0.75);
    for (const v of this.verts) {
      this.stepMorph(v.r, dt, o.speed, () => rMin + (1.05 - rMin) * Math.random());
      this.stepMorph(v.w, dt, o.speed * 1.4, () => Math.max(0.12, 1 - o.widthVariation) + o.widthVariation * 2 * Math.random());
      const k = 26, c = 4.6; // spring stiffness / damping
      v.pv += (-k * v.p - c * v.pv) * dt;
      v.p += v.pv * dt;
      v.wpv += (-k * v.wp - c * v.wpv) * dt;
      v.wp += v.wpv * dt;
    }
    this.stepMorph(this.pulse, dt, o.speed, () => 0.72 + Math.random() * 0.4);
    this.flash *= Math.exp(-dt * 3);

    // ---- draw sharp shape to offscreen canvas ----
    const S = 640, C = S / 2, R = S * 0.3;
    const octx = this.off.getContext('2d');
    octx.clearRect(0, 0, S, S);
    const outer = [], inner = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const v = this.verts[i];
      const r = Math.max(20, R * v.r.val + v.p);
      const w = Math.max(2, o.ringWidth * v.w.val + v.wp);
      outer.push([C + Math.cos(a) * (r + w / 2), C + Math.sin(a) * (r + w / 2)]);
      inner.push([C + Math.cos(a) * Math.max(6, r - w / 2), C + Math.sin(a) * Math.max(6, r - w / 2)]);
    }
    octx.fillStyle = o.color;
    if (o.form === 'blob') {
      const p = new Path2D();
      this.smoothPath(p, outer, o.roundness);
      octx.fill(p);
    } else {
      if (o.form === 'hybrid') {
        const pf = new Path2D();
        this.smoothPath(pf, outer, o.roundness);
        octx.globalAlpha = 0.3;
        octx.fill(pf);
        octx.globalAlpha = 1;
      }
      const p = new Path2D();
      this.smoothPath(p, outer, o.roundness);
      this.smoothPath(p, inner, o.roundness);
      octx.fill(p, 'evenodd');
    }

    // ---- composite blurred passes to the display canvas ----
    const cv = this.cv;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const W = Math.round(this.cw * dpr), H = Math.round(this.ch * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; this.pattern = null; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);

    const m = Math.min(W, H);
    const ax = o.aspect >= 1 ? o.aspect : 1;
    const ay = o.aspect >= 1 ? 1 : 1 / o.aspect;
    const D = m * o.scale * (S / (2 * R));
    const Dw = D * ax, Dh = D * ay;
    this.dispR = (m * o.scale * Math.max(ax, ay)) / 2 / dpr;
    const offX = (o.offsetX || 0) * (W / 2);
    const offY = (o.offsetY || 0) * (H / 2);
    const x = (W - Dw) / 2 + offX, y = (H - Dh) / 2 + offY;
    this.dispCx = (W / 2 + offX) / dpr;   // keep hover/click detection aligned to the offset shape
    this.dispCy = (H / 2 + offY) / dpr;
    const bscale = D / S;
    const alphaMul = Math.min(1.6, this.pulse.val * (1 + this.flash * 0.55));
    const coreBlur = Math.max(0, o.blur * bscale * (1 - Math.min(0.5, this.flash * 0.35)));
    const haloBlur = o.blur * bscale * 2.6;

    if (this.useCtxFilter) {
      // Blink: blur inside the canvas — halo pass (wide soft glow) + core pass (sharper body)
      if (this._cssBlur !== 0) { cv.style.filter = ''; this._cssBlur = 0; }
      ctx.save();
      ctx.filter = 'blur(' + haloBlur.toFixed(1) + 'px)';
      ctx.globalAlpha = Math.min(1, 0.5 * o.glow * alphaMul);
      ctx.drawImage(this.off, x, y, Dw, Dh);
      ctx.restore();
      ctx.save();
      ctx.filter = 'blur(' + coreBlur.toFixed(1) + 'px)';
      ctx.globalAlpha = Math.min(1, 0.92 * o.glow * alphaMul);
      ctx.drawImage(this.off, x, y, Dw, Dh);
      ctx.restore();
    } else {
      // WebKit/Safari: ctx.filter is ignored — draw the shape sharp, then blur the whole
      // canvas element via CSS (which WebKit does support). Single-radius, but the halo +
      // core opacities still build the glow.
      ctx.globalAlpha = Math.min(1, 0.5 * o.glow * alphaMul);
      ctx.drawImage(this.off, x, y, Dw, Dh);
      ctx.globalAlpha = Math.min(1, 0.92 * o.glow * alphaMul);
      ctx.drawImage(this.off, x, y, Dw, Dh);
      ctx.globalAlpha = 1;
      const cssBlur = (o.blur * bscale * 1.1) / dpr; // ≈ match the in-canvas core blur, in CSS px
      if (Math.abs(cssBlur - this._cssBlur) > 0.25) {
        cv.style.filter = 'blur(' + cssBlur.toFixed(1) + 'px)';
        this._cssBlur = cssBlur;
      }
    }

    // film grain — carved out of the glow so it works on transparent backgrounds
    if (o.grain > 0.01) {
      if (!this.pattern) this.pattern = ctx.createPattern(this.noise, 'repeat');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = o.grain * 0.5;
      ctx.fillStyle = this.pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }
}

export { WorkTypeGraphic };
