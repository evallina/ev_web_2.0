'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── Configurable timing ────────────────────────────────────────────────
const HERO_PAUSE         = 3000;   // ms — time on hero before scrolling starts
const PHILOSOPHY_PAUSE   = 3000;   // ms — stay at philosophy for 3 seconds
const WORKS_PAUSE        = 2000;   // ms — pause at works while animation plays
const SCROLL_DURATION    = 1200;   // ms — smooth scroll travel time
const CARDS_SETTLE       = 500;    // ms — settle time after reaching cards
const SKIP_PILL_DELAY    = 1000;   // ms — delay before showing the skip pill

interface AutoScrollConfig {
  enabled: boolean;
  onReachWorks?: () => void;
  onReachCards?: () => void;
  onComplete?: () => void;
  onCancelled?: () => void;
}

export function useAutoScrollTour(config: AutoScrollConfig) {
  const [touring, setTouring] = useState(false);
  const [showSkipPill, setShowSkipPill] = useState(false);
  const cancelledRef = useRef(false);
  const tourActiveRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const cancelTour = useCallback(() => {
    if (!tourActiveRef.current) return;
    cancelledRef.current = true;
    tourActiveRef.current = false;
    setTouring(false);
    setShowSkipPill(false);
    configRef.current.onCancelled?.();
  }, []);

  const skipToEnd = useCallback(() => {
    cancelledRef.current = true;
    tourActiveRef.current = false;
    setTouring(false);
    setShowSkipPill(false);
    configRef.current.onReachWorks?.();
    setTimeout(() => {
      configRef.current.onReachCards?.();
      const cards = document.getElementById('project-cards');
      if (cards) window.scrollTo({ top: cards.offsetTop, behavior: 'smooth' });
      configRef.current.onComplete?.();
    }, 300);
  }, []);

  const runTour = useCallback(async () => {
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const scrollTo = (id: string) => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    };
    const check = () => !cancelledRef.current;

    // 1. Pause at hero (typewriter running in turbo mode)
    await wait(HERO_PAUSE);
    if (!check()) return;

    // 2. Scroll to philosophy
    scrollTo('design-philosophy');
    await wait(SCROLL_DURATION + PHILOSOPHY_PAUSE);
    if (!check()) return;

    // 3. Scroll to works
    scrollTo('project-selection');
    await wait(SCROLL_DURATION);
    if (!check()) return;

    // 4. Trigger custom preset at works
    configRef.current.onReachWorks?.();
    await wait(WORKS_PAUSE);
    if (!check()) return;

    // 5. Trigger card selection + scroll to cards
    configRef.current.onReachCards?.();
    await wait(300); // let cards render
    scrollTo('project-cards');
    await wait(SCROLL_DURATION + CARDS_SETTLE);

    // Tour complete
    tourActiveRef.current = false;
    setTouring(false);
    setShowSkipPill(false);
    configRef.current.onComplete?.();
  }, []);

  const startTour = useCallback(() => {
    if (!configRef.current.enabled) return;
    cancelledRef.current = false;
    tourActiveRef.current = true;
    setTouring(true);
    // Show skip pill after delay
    setTimeout(() => {
      if (!cancelledRef.current) setShowSkipPill(true);
    }, SKIP_PILL_DELAY);
    runTour();
  }, [runTour]);

  // Detect user scroll/touch/key during tour — cancel immediately
  useEffect(() => {
    if (!touring) return;

    const onWheel = () => cancelTour();
    const onTouchStart = () => cancelTour();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') cancelTour();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [touring, cancelTour]);

  return { startTour, cancelTour, skipToEnd, touring, showSkipPill };
}
