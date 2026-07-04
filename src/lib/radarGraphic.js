/**
 * RadarGraphic — a value-driven sibling of WorkTypeGraphic.
 *
 * Renders the 5-point radar shape as the same blurry/grainy ring | blob | hybrid
 * (or the plain 'original' line). It does NOT morph randomly: each vertex is driven
 * by the radar value (setValues) and springs toward its target, so a change bounces.
 * Per-vertex ring width grows with the value.
 *
 * Geometry mirrors the SVG radar exactly (viewBox 800×760, centre 400,360, R 210,
 * preserveAspectRatio meet), so the blob lines up with the spokes/labels.
 *
 * Cross-browser blur: Blink honours ctx.filter; WebKit/Safari doesn't, so we blur
 * the canvas element via CSS instead (detected at runtime).
 *
 * Zero dependencies. Wrapped for React in app/components/RadarGraphic.tsx.
 */

// Radar spoke angles (deg) — must match src/config/categories.ts CATEGORIES order.
const RADAR_ANGLES = [-126, -54, 18, 90, 162];

class RadarGraphic {
  static defaults = {
    form: 'ring',        // 'original' | 'ring' | 'blob' | 'hybrid'
    roundness: 0.85,     // 0 sharp corners … 1 fully rounded
    ringWidth: 36,       // base ring thickness (viewBox units)
    widthFromValue: 1,   // 0 = uniform width, 1 = width scales strongly with value
    bounce: 2.2,         // bounce strength when values change
    blur: 7,             // core blur
    glow: 2,             // brightness multiplier
    grain: 0.45,         // film-grain intensity (0–1)
    color: '#FFFFFF',
    rMin: 0.12,          // radius floor so a 0-value vertex keeps a small ring
    // viewBox geometry (matches the SVG radar)
    vbW: 800, vbH: 760, vbCx: 400, vbCy: 360, vbR: 210,
    background: 'transparent',
  };

  constructor(container, options = {}) {
    this.opts = { ...RadarGraphic.defaults, ...options };
    this.container = container;

    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cv);
    this.cv = cv;

    // 5 vertices: radius spring (r,rv→rt) + width spring (w,wv→wt)
    this.verts = [];
    for (let i = 0; i < 5; i++) this.verts.push({ r: 0.5, rv: 0, rt: 0.5, w: 0.5, wv: 0, wt: 0.5 });
    this.ghosts = []; // [{ vals:[5], op:number }]

    const o = this.opts;
    this.off = document.createElement('canvas');
    this.off.width = o.vbW; this.off.height = o.vbH;

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
    this.pattern = null;

    // Does this 2D context honour ctx.filter blur? Blink yes; WebKit/Safari no.
    this.useCtxFilter = (() => {
      try {
        const tc = document.createElement('canvas'); tc.width = tc.height = 20;
        const tx = tc.getContext('2d');
        tx.filter = 'blur(4px)';
        tx.fillStyle = '#fff';
        tx.fillRect(9, 9, 2, 2);
        tx.filter = 'none';
        return tx.getImageData(10, 10, 1, 1).data[3] < 200;
      } catch { return false; }
    })();
    this._cssBlur = -1;

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
    this.cv.remove();
  }

  setOptions(patch) { Object.assign(this.opts, patch); }

  _widthMul(v) { return (1 - this.opts.widthFromValue) * 0.5 + this.opts.widthFromValue * (0.18 + 0.82 * v); }

  // vals: array of 5 numbers (0–100). Sets each vertex's radius + width target.
  setValues(vals) {
    if (!vals) return;
    const o = this.opts;
    for (let i = 0; i < 5; i++) {
      const v = Math.max(0, Math.min(100, vals[i] ?? 0)) / 100;
      this.verts[i].rt = o.rMin + (1 - o.rMin) * v;
      this.verts[i].wt = this._widthMul(v);
    }
  }

  // ghosts: array of value-arrays (each 5 numbers); opacities ramp oldest→newest.
  setGhosts(list, opacities) {
    this.ghosts = (list || []).map((vals, i) => ({ vals, op: (opacities && opacities[i]) ?? 0.15 }));
  }

  _smooth(path, pts, round) {
    const n = pts.length;
    const r = Math.min(1, Math.max(0, round));
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const cIn = lerp(p, mid(pts[(i - 1 + n) % n], p), r);
      const cOut = lerp(p, mid(p, pts[(i + 1) % n]), r);
      if (i === 0) path.moveTo(cIn[0], cIn[1]); else path.lineTo(cIn[0], cIn[1]);
      path.quadraticCurveTo(p[0], p[1], cOut[0], cOut[1]);
    }
    path.closePath();
  }

  // Draw one shape to the offscreen ctx (viewBox coords) at the given alpha.
  _drawShape(octx, radii, widths, alpha) {
    const o = this.opts, cx = o.vbCx, cy = o.vbCy, R = o.vbR;
    if (o.form === 'original') {
      const line = [];
      for (let i = 0; i < 5; i++) {
        const a = (RADAR_ANGLES[i] * Math.PI) / 180;
        const r = R * radii[i];
        line.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const p = new Path2D();
      this._smooth(p, line, 0.35);
      octx.globalAlpha = alpha;
      octx.strokeStyle = o.color;
      octx.lineWidth = 3;
      octx.stroke(p);
      octx.globalAlpha = 1;
      return;
    }
    const outer = [], inner = [];
    for (let i = 0; i < 5; i++) {
      const a = (RADAR_ANGLES[i] * Math.PI) / 180;
      const r = R * radii[i];
      const w = Math.max(2, o.ringWidth * widths[i]);
      outer.push([cx + Math.cos(a) * (r + w / 2), cy + Math.sin(a) * (r + w / 2)]);
      inner.push([cx + Math.cos(a) * Math.max(2, r - w / 2), cy + Math.sin(a) * Math.max(2, r - w / 2)]);
    }
    octx.globalAlpha = alpha;
    octx.fillStyle = o.color;
    if (o.form === 'blob') {
      const p = new Path2D();
      this._smooth(p, outer, o.roundness);
      octx.fill(p);
    } else {
      if (o.form === 'hybrid') {
        const pf = new Path2D();
        this._smooth(pf, outer, o.roundness);
        octx.globalAlpha = alpha * 0.3;
        octx.fill(pf);
        octx.globalAlpha = alpha;
      }
      const p = new Path2D();
      this._smooth(p, outer, o.roundness);
      this._smooth(p, inner, o.roundness);
      octx.fill(p, 'evenodd');
    }
    octx.globalAlpha = 1;
  }

  tick(t) {
    this.raf = requestAnimationFrame((tt) => this.tick(tt));
    const dt = Math.min(0.033, (t - this.last) / 1000);
    this.last = t;
    const o = this.opts;

    // spring each vertex toward its value-driven target (bounce on change)
    const k = 90;
    const ratio = Math.max(0.1, 1 - o.bounce * 0.32);   // higher bounce → less damping
    const c = 2 * Math.sqrt(k) * ratio;
    for (const v of this.verts) {
      v.rv += (-k * (v.r - v.rt) - c * v.rv) * dt; v.r += v.rv * dt;
      v.wv += (-k * (v.w - v.wt) - c * v.wv) * dt; v.w += v.wv * dt;
    }

    // ---- offscreen sharp shape (viewBox space) ----
    const octx = this.off.getContext('2d');
    octx.clearRect(0, 0, o.vbW, o.vbH);
    octx.lineJoin = 'round';
    for (const g of this.ghosts) {
      const radii = [], widths = [];
      for (let i = 0; i < 5; i++) {
        const gv = Math.max(0, Math.min(100, g.vals[i] ?? 0)) / 100;
        radii.push(o.rMin + (1 - o.rMin) * gv);
        widths.push(this._widthMul(gv));
      }
      this._drawShape(octx, radii, widths, g.op);
    }
    this._drawShape(octx, this.verts.map(v => v.r), this.verts.map(v => v.w), 1);

    // ---- composite to display canvas, meet-fit like the SVG ----
    const cv = this.cv;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const W = Math.round(this.cw * dpr), H = Math.round(this.ch * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; this.pattern = null; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);

    const fit = Math.min(W / o.vbW, H / o.vbH);
    const dw = o.vbW * fit, dh = o.vbH * fit;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    const gl = Math.min(1.6, o.glow);

    if (o.form === 'original') {
      if (this._cssBlur !== 0) { cv.style.filter = ''; this._cssBlur = 0; }
      ctx.globalAlpha = 1;
      ctx.drawImage(this.off, dx, dy, dw, dh);
      return;
    }

    const coreBlur = Math.max(0, o.blur * fit);
    const haloBlur = o.blur * fit * 2.6;
    if (this.useCtxFilter) {
      if (this._cssBlur !== 0) { cv.style.filter = ''; this._cssBlur = 0; }
      ctx.save(); ctx.filter = 'blur(' + haloBlur.toFixed(1) + 'px)'; ctx.globalAlpha = Math.min(1, 0.5 * gl); ctx.drawImage(this.off, dx, dy, dw, dh); ctx.restore();
      ctx.save(); ctx.filter = 'blur(' + coreBlur.toFixed(1) + 'px)'; ctx.globalAlpha = Math.min(1, 0.92 * gl); ctx.drawImage(this.off, dx, dy, dw, dh); ctx.restore();
    } else {
      // WebKit: draw sharp, blur the canvas element via CSS
      ctx.globalAlpha = Math.min(1, 0.5 * gl); ctx.drawImage(this.off, dx, dy, dw, dh);
      ctx.globalAlpha = Math.min(1, 0.92 * gl); ctx.drawImage(this.off, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
      const cssBlur = (o.blur * fit * 1.1) / dpr;
      if (Math.abs(cssBlur - this._cssBlur) > 0.25) { cv.style.filter = 'blur(' + cssBlur.toFixed(1) + 'px)'; this._cssBlur = cssBlur; }
    }

    // film grain — carved out of the glow
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

export { RadarGraphic };
