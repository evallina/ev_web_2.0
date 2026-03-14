'use client';

import { useEffect } from 'react';

// ── Master toggle ───────────────────────────────────────────────────────────
const PARALLAX_ENABLED = true;   // set false to disable ALL parallax instantly

// ── Per-section configuration ───────────────────────────────────────────────
// speed: element translation relative to scroll
//   0   = no effect
//   0.5 = moves at half scroll speed (same direction)
//  -0.2 = moves slightly opposite to scroll (feels like depth / background)
// enabled: per-section toggle
const PARALLAX_CONFIG: Record<string, { speed: number; enabled: boolean }> = {
  'trajectory':       { speed: -0.02, enabled: false  }, // image drifts slightly (depth)
  'hero':             { speed: -0.12, enabled: true  }, // subtle depth on text
  'design-philosophy':{ speed: -0.18, enabled: true  }, // photo stack drifts
  'project-selection':{ speed:  -0.2,    enabled: false }, // disabled — radar chart interaction
  'project-cards':    { speed:  0,    enabled: false }, // disabled — horizontal scroll conflict
  'contact-bottom':   { speed: -0.10, enabled: true  }, // subtle depth on white container
};

export function useParallax() {
  useEffect(() => {
    if (!PARALLAX_ENABLED) return;
    if (window.innerWidth < 768) return;  // skip on mobile — prevents RAF drain + GPU contention

    let rafId: number;

    const update = () => {
      const vh = window.innerHeight;

      for (const [sectionId, config] of Object.entries(PARALLAX_CONFIG)) {
        if (!config.enabled) continue;

        const section = document.getElementById(sectionId);
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        // Skip sections far outside the viewport
        if (rect.bottom < -vh || rect.top > vh * 2) continue;

        // Target: element with data-parallax attribute, or fall back to first child
        const target =
          (section.querySelector('[data-parallax]') as HTMLElement | null) ??
          (section.firstElementChild as HTMLElement | null);
        if (!target) continue;

        const offset = (rect.top + rect.height / 2 - vh / 2) * config.speed;
        target.style.transform = `translateY(${offset}px)`;
        target.style.willChange = 'transform';
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
