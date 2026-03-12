'use client';

import { useEffect, useRef } from 'react';

// ── Configurable variables ─────────────────────────────────────────────────────
const SNAP_DEBOUNCE = 120;         // ms after last scroll event before snap check
const SNAP_STRENGTH = 0.30;        // 0-1: fraction of viewport height as snap zone
const HEADER_HEIGHT = 0;           // px — sticky header offset (0: sections designed with header overlay)
const SNAP_ENABLED  = true;        // master toggle

export function useGentleSnap(sectionIds: string[]) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!SNAP_ENABLED) return;

    const cancelPendingSnap = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };

    const handleScrollEnd = () => {
      const vh        = window.innerHeight;
      const threshold = vh * SNAP_STRENGTH;
      let bestSection: HTMLElement | null = null;
      let bestDistance = Infinity;

      for (const id of sectionIds) {
        // Fresh DOM lookup every time — catches sections that appear after mount
        const el = document.getElementById(id);
        if (!el) continue;
        const rect     = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - HEADER_HEIGHT);
        if (distance < threshold && distance < bestDistance) {
          bestDistance = distance;
          bestSection  = el;
        }
      }

      if (bestSection && bestDistance > 3) {
        const targetY = window.scrollY + bestSection.getBoundingClientRect().top - HEADER_HEIGHT;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    };

    const onScroll = () => {
      // Every new scroll event cancels any pending snap — user is in control
      cancelPendingSnap();
      // Only snap after user fully stops scrolling
      debounceTimer.current = setTimeout(handleScrollEnd, SNAP_DEBOUNCE);
    };

    // Wheel and touch provide immediate cancellation before scroll events fire
    const onWheel      = () => cancelPendingSnap();
    const onTouchStart = () => cancelPendingSnap();

    window.addEventListener('scroll',     onScroll,     { passive: true });
    window.addEventListener('wheel',      onWheel,      { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('scroll',     onScroll);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      cancelPendingSnap();
    };
  }, [sectionIds]);
}
