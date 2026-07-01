"use client";

import { useEffect, useRef, useState } from "react";
import { useGentleSnap } from "./hooks/useGentleSnap";
import { useParallax } from "./hooks/useParallax";
import Header from "./components/Header";
import ContactTop, { type ContactConfig } from "./components/ContactTop";
import Trajectory from "./components/Trajectory";
import Hero from "./components/Hero";
import ErrorBoundary from "./components/ErrorBoundary";
import DesignPhilosophy from "./components/DesignPhilosophy";
import RadarChart from "./components/RadarChart";
import ProjectCards from "./components/ProjectCards";
import Doorways from "./components/Doorways";
import { selectProjects } from "@/src/lib/selectProjects";
import type { DebugMeta } from "@/src/types";
import { CAT_KEYS } from "@/src/config/categories";
import ContactBottom from "./components/ContactBottom";
import LoadingScreen from "./components/LoadingScreen";
import AlgorithmExplainer from "./components/AlgorithmExplainer";
import { useAutoScrollTour } from "./hooks/useAutoScrollTour";
import projectsData from "@/src/data/projects.json";
import presetsData from "@/src/data/presets.json";

// ── Gentle snap — sections the hook will nudge toward after scroll settles ────
const SNAP_SECTION_IDS = ['hero', 'design-philosophy', 'doorways', 'project-selection', 'project-cards', 'contact-bottom'];

// ── Keyboard arrow navigation ─────────────────────────────────────────────────
// 'trajectory' is first so ↑ from hero lands at the bottom of trajectory.
const KB_NAV_IDS = ['trajectory', 'hero', 'design-philosophy', 'doorways', 'project-selection', 'project-cards', 'contact-bottom'];
// Sections scrolled to their bottom edge instead of their top
const KB_SCROLL_TO_BOTTOM = new Set(['trajectory']);

// ── Shared design variables ───────────────────────────────────────────────────
const grainOpacity      = 0.20; // grain intensity for dark sections (background + header)
const whiteGrainOpacity = 0.70; // grain intensity for white areas (contact + Works framing)

// ── Works section dark-shape controls ────────────────────────────────────────
const darkShapeTopPadding         = 65;    // px — white band above the dark chart area
const darkShapeBottomCornerRadius = 20;    // px — inner top corner radius of bottom white panels
const darkShapeBottomCornerWidth  = '20%'; // width of each bottom white corner panel
const darkShapeBottomPanelHeight  = 60;    // px — height of the bottom white panels

// ── Works section mobile overrides (< WORKS_MOBILE_BP px) ───────────────────
const WORKS_MOBILE_BP            = 750;  // px
const mobileSectionPaddingTop    = 60;   // px — top white strip height and section top padding on mobile
const mobileSectionPaddingBottom = 120;  // px — bottom white panel height + buffer (must be > darkShapeBottomPanelHeight)
const mobileTitleToChartGap      = 0;    // px — gap between "Work Selection" title and chart on mobile
const mobileBottomCornerWidth    = '12%'; // width of each bottom white corner panel on mobile (0% = no corners, full-width dark shape bottom)
const mobileBottomPanelHeight    = 100;    // px — height of the bottom white corner panels on mobile (independent of section bottom padding)

// ── Contact section design variables (shared by ContactTop + ContactBottom) ──
const contactNotchHeight                = 200; // px — depth of the notch cut-out
const contactNotchWidth                 = 30;  // %  — width of the notch (centered)
const contactHeadingPadding             = 500; // px — white space between heading and notch edge
const contactContainerRadius            = 30;  // px — outer corner radius of the white container
const contactHomeButtonEdgePadding      = 80;  // px — gap: outer page edge → HOME button
const contactHomeButtonContainerPadding = 50;  // px — gap: HOME button → white container edge
const contactHomeIconColor              = 'black'; // color of the house icon and arrow
const contactHomeIconOpacity            = 0.5; // opacity at rest (0–1)
const contactHomeIconHoverOpacity       = 0.95; // opacity on hover (0–1)
const contactHomeIconSize               = 22;   // px — width & height of the house icon
// Derived values
const contactSectionEdge = contactHomeButtonEdgePadding + 30 + contactHomeButtonContainerPadding;
const contactNotchLeft   = (100 - contactNotchWidth) / 2;
const contactNotchRight  = 100 - contactNotchLeft;

const contactConfig: ContactConfig = {
  notchHeight:              contactNotchHeight,
  notchWidth:               contactNotchWidth,
  headingPadding:           contactHeadingPadding,
  containerRadius:          contactContainerRadius,
  homeButtonEdgePadding:    contactHomeButtonEdgePadding,
  sectionEdge:              contactSectionEdge,
  notchLeft:                contactNotchLeft,
  notchRight:               contactNotchRight,
  whiteGrainOpacity,
  homeIconColor:            contactHomeIconColor,
  homeIconOpacity:          contactHomeIconOpacity,
  homeIconHoverOpacity:     contactHomeIconHoverOpacity,
  homeIconSize:             contactHomeIconSize,
};

// ── Page orchestrator ─────────────────────────────────────────────────────────
export default function Home() {
  // Scroll to hero on mount
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) window.scrollTo({ top: hero.offsetTop, behavior: "instant" });
  }, []);

  // Auto-scroll state (declared early — needed by useGentleSnap below)
  const [autoScrolling, setAutoScrolling] = useState(false);

  // Gentle JS-based snap — nudges toward nearest section after scroll settles
  useGentleSnap(SNAP_SECTION_IDS, autoScrolling);
  useParallax();

  // ── Refs ───────────────────────────────────────────────────────────────────
  const currentSectionRef = useRef<string>('hero');

  // ── Custom URL selection (?select=EV-03,EV-16&label=MIT+Application&directScroll) ────
  const [customSelectIds,      setCustomSelectIds]      = useState<string[] | null>(null);
  const [customSelectLabel,    setCustomSelectLabel]    = useState<string | null>(null);
  const [isCustomSelectActive, setIsCustomSelectActive] = useState(false);
  const [directScrollMode,     setDirectScrollMode]     = useState(false);
  const [labelSelectionParked, setLabelSelectionParked] = useState(false);

  useEffect(() => {
    // Read URL params once on mount (window.location is client-only, so this can't run during SSR).
    // Grouped in a function — same handler pattern as the resize/scroll effects below.
    const applyUrlSelection = () => {
      const params = new URLSearchParams(window.location.search);
      const selectParam = params.get('select');
      const labelParam = params.get('label');
      const directScroll = params.has('directScroll');

      if (selectParam) {
        // Full custom selection mode (with optional label)
        const ids = selectParam.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          setCustomSelectIds(ids);
          setCustomSelectLabel(labelParam || 'Your Selection');
          setIsCustomSelectActive(true);
          setDirectScrollMode(directScroll);
        }
      } else if (labelParam) {
        // Label-only mode: normal site, just the header label
        setCustomSelectLabel(labelParam);
        // isCustomSelectActive stays false — no tour, no custom preset, no card selection
      }
    };
    applyUrlSelection();
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true);
  const [worksIsMobile, setWorksIsMobile] = useState(false);
  const [menuOpen,              setMenuOpen]              = useState(false);
  const [scrolled,              setScrolled]              = useState(false);
  const [heroResetKey,          setHeroResetKey]          = useState(0);
  const [selectedProjectIds,    setSelectedProjectIds]    = useState<string[]>([]);
  const [selectedProjectScores, setSelectedProjectScores] = useState<Record<string, number>>({});
  const [lastRadarValues,       setLastRadarValues]       = useState<Record<string, number>>({});
  const [lastPresetName,        setLastPresetName]        = useState<string | null>(null);
  const [lastDebugMeta,         setLastDebugMeta]         = useState<DebugMeta | null>(null);
  const [showDebug,             setShowDebug]             = useState(false);
  const [debugFlash,            setDebugFlash]            = useState<string | null>(null);
  const [lastMatchedCount,      setLastMatchedCount]      = useState(0);

  // ── Auto-scroll tour (for ?select= URL) ──────────────────────────────────
  const { startTour, skipToEnd, showSkipPill } = useAutoScrollTour({
    enabled: isCustomSelectActive,
    onReachWorks: () => {
      if (customSelectIds) {
        // Compute averaged radar values from the custom selection
        const projects = projectsData.projects as { id: string; categoryScores: Record<string, number> }[];
        const selected = projects.filter(p => customSelectIds.includes(p.id));
        if (selected.length > 0) {
          const avgRadar: Record<string, number> = {};
          const keys = Object.keys(selected[0]?.categoryScores || {});
          keys.forEach(key => {
            avgRadar[key] = Math.round(
              selected.reduce((sum, p) => sum + (p.categoryScores[key] || 0), 0) / selected.length,
            );
          });
          setLastRadarValues(avgRadar);
          setLastPresetName(customSelectLabel || 'Your Selection');
        }
      }
    },
    onReachCards: () => {
      if (customSelectIds) {
        setSelectedProjectIds(customSelectIds);
        setSelectedProjectScores({});
        setLastPresetName(customSelectLabel);
      }
    },
    onComplete: () => { setAutoScrolling(false); },
    onCancelled: () => { setAutoScrolling(false); },
  });

  const handleLoadingComplete = () => {
    setLoading(false);
    if (isCustomSelectActive) {
      if (directScrollMode) {
        // Direct scroll mode: land on hero, wait 1s, then smooth scroll to cards
        setTimeout(() => {
          if (customSelectIds) {
            setSelectedProjectIds(customSelectIds);
            setSelectedProjectScores({});
            setLastPresetName(customSelectLabel);

            // Compute averaged radar values for the custom preset display
            const projects = projectsData.projects as { id: string; categoryScores: Record<string, number> }[];
            const selected = projects.filter(p => customSelectIds.includes(p.id));
            if (selected.length > 0) {
              const avgRadar: Record<string, number> = {};
              const keys = Object.keys(selected[0]?.categoryScores || {});
              keys.forEach(key => {
                avgRadar[key] = Math.round(
                  selected.reduce((sum, p) => sum + (p.categoryScores[key] || 0), 0) / selected.length,
                );
              });
              setLastRadarValues(avgRadar);
            }
          }
          const cards = document.getElementById('project-cards');
          if (cards) window.scrollTo({ top: cards.offsetTop, behavior: 'smooth' });
        }, 1000);
      } else {
        // Normal tour mode
        setTimeout(() => {
          setAutoScrolling(true);
          startTour();
        }, 500);
      }
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Lock scroll completely during loading (belt-and-suspenders for iOS Safari)
  useEffect(() => {
    if (loading) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';

      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        // Restore scroll position to hero after unlocking
        const hero = document.getElementById('hero');
        if (hero) {
          window.scrollTo({ top: hero.offsetTop, behavior: 'instant' });
        }
      };
    }
  }, [loading]);

  useEffect(() => {
    const check = () => setWorksIsMobile(window.innerWidth < WORKS_MOBILE_BP);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!debugFlash) return;
    const t = setTimeout(() => setDebugFlash(null), 1000);
    return () => clearTimeout(t);
  }, [debugFlash]);

  // Secret "debug" key sequence toggle
  useEffect(() => {
    const SEQ = 'debug';
    const TIMEOUT = 2000;
    let buffer = '';
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      buffer += e.key.toLowerCase();
      if (buffer.length > SEQ.length) buffer = buffer.slice(-SEQ.length);
      clearTimeout(timerId);
      if (buffer === SEQ) {
        buffer = '';
        setShowDebug(prev => {
          const next = !prev;
          setDebugFlash(next ? '🔧 Debug ON' : '🔧 Debug OFF');
          return next;
        });
      } else {
        timerId = setTimeout(() => { buffer = ''; }, TIMEOUT);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); clearTimeout(timerId); };
  }, []);

  // ── Keyboard up/down arrow → jump to prev/next section ────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();

      // Find the section with the most viewport coverage
      const vh = window.innerHeight;
      let bestId: string | null = null;
      let bestFraction = 0;
      for (const id of KB_NAV_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect     = el.getBoundingClientRect();
        const visibleH = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
        const fraction = visibleH / Math.min(el.offsetHeight, vh);
        if (fraction > bestFraction) { bestFraction = fraction; bestId = id; }
      }

      if (!bestId) return;
      const ids  = KB_NAV_IDS.filter(id => !!document.getElementById(id));
      const idx  = ids.indexOf(bestId);
      const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      if (next < 0 || next >= ids.length) return;

      const targetId = ids[next];
      const target   = document.getElementById(targetId);
      if (!target) return;
      const scrollTop = KB_SCROLL_TO_BOTTOM.has(targetId)
        ? target.offsetTop + target.offsetHeight - window.innerHeight
        : target.offsetTop;
      window.scrollTo({ top: scrollTop, behavior: 'smooth' });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Track which section is currently most visible (updated on every scroll)
  useEffect(() => {
    if (loading) return;

    const updateCurrentSection = () => {
      const vh = window.innerHeight;
      let bestId: string | null = null;
      let bestFraction = 0;

      for (const id of KB_NAV_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const visibleH = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
        const fraction = visibleH / Math.min(el.offsetHeight, vh);
        if (fraction > bestFraction) {
          bestFraction = fraction;
          bestId = id;
        }
      }

      if (bestId) currentSectionRef.current = bestId;
    };

    updateCurrentSection();

    window.addEventListener('scroll', updateCurrentSection, { passive: true });
    return () => window.removeEventListener('scroll', updateCurrentSection);
  }, [loading]);

  // Re-align to tracked section on window resize (prevents misalignment after reflow)
  useEffect(() => {
    if (loading) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const targetId = currentSectionRef.current;
        const el = document.getElementById(targetId);
        if (el) {
          if (KB_SCROLL_TO_BOTTOM.has(targetId)) {
            window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: 'instant' });
          } else {
            window.scrollTo({ top: el.offsetTop, behavior: 'instant' });
          }
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [loading]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  const scrollToSectionBottom = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: "smooth" });
  };

  const navigateTo = (id: string) => {
    if (id === 'trajectory') scrollToSectionBottom(id); else scrollToSection(id);
  };

  const resetHero = () => setHeroResetKey(k => k + 1);

  // ── Project selection algorithm ────────────────────────────────────────────
  const handleCategoryFilter = (catKey: string) => {
    const radarValues = Object.fromEntries(CAT_KEYS.map(k => [k, k === catKey ? 100 : 0]));
    const allProjects = projectsData.projects as Parameters<typeof selectProjects>[1];
    const filteredProjects = allProjects.filter(p => (p.categoryScores[catKey] ?? 0) >= 80);
    const result = selectProjects(radarValues, filteredProjects, null);

    console.group('[RadarChart → ProjectCards] Category filter triggered');
    console.log('Category key:', catKey, '| Matched:', filteredProjects.length, 'projects');
    console.log('Selected:', result.ids.join(', ') || '— none —');
    console.groupEnd();

    setSelectedProjectIds(result.ids);
    setSelectedProjectScores(result.scores);
    setLastRadarValues(radarValues);
    setLastPresetName(null);
    setLastDebugMeta(result.debugMeta);
    setLastMatchedCount(result._scoredRows.filter(r => r.finalScore >= 20).length);
    // Park label selection if user filtered by category in label mode
    if (isCustomSelectActive) setLabelSelectionParked(true);
    scrollToSection('project-cards');
  };

  const handleRadarPlay = (radarValues: Record<string, number>, presetName: string | null = null) => {
    const result = selectProjects(radarValues, projectsData.projects as Parameters<typeof selectProjects>[1], presetName);

    // Debug logging
    console.group('[RadarChart → ProjectCards] Play triggered');
    console.log('Radar values:', radarValues);
    console.log('Dominant keys (≥' + result.debugMeta.dominanceThreshold + '%):', result.debugMeta.dominantCategoryKeys, '| Single dominant:', result.debugMeta.singleDominantKey);
    console.log('Preset boosted:', result.debugMeta.presetBoostedIds);
    console.table(result._scoredRows);
    console.log('Matched & sorted:', result.ids.join(', ') || '— none —');
    console.groupEnd();

    setSelectedProjectIds(result.ids);
    setSelectedProjectScores(result.scores);
    setLastRadarValues(radarValues);
    setLastPresetName(presetName);
    setLastDebugMeta(result.debugMeta);
    setLastMatchedCount(result._scoredRows.filter(r => r.finalScore >= 20).length);
    // In label mode: park if a different preset was played; un-park if the custom preset was played.
    // The chart's activePreset can be either the original label or the parked alias "Custom Selection".
    if (isCustomSelectActive) {
      const matchesCustom = presetName === customSelectLabel || presetName === 'Custom Selection';
      setLabelSelectionParked(!matchesCustom);
    }
    scrollToSection('project-cards');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Fixed grain overlay — defines SVG filters referenced by all sections */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity, zIndex: 1 }} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="page-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <filter id="white-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#page-noise)" />
      </svg>

      {/* Loading screen — shown until fonts + images ready */}
      {loading && (
        <LoadingScreen
          visible={loading}
          onComplete={handleLoadingComplete}
          customLabel={isCustomSelectActive ? (customSelectLabel || 'Curated Selection') : null}
          extraPreloadIds={customSelectIds ?? undefined}
        />
      )}

      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        scrolled={scrolled}
        grainOpacity={grainOpacity}
        onNavigate={navigateTo}
        onResetHero={resetHero}
        customLabel={customSelectLabel}
      />

      <ContactTop
        config={contactConfig}
        onScrollToHero={() => scrollToSection('hero')}
        onResetHero={resetHero}
      />

      <Trajectory />

      <ErrorBoundary>
        <Hero
          resetKey={heroResetKey}
          onNavigateUp={() => scrollToSectionBottom('trajectory')}
          onNavigateDown={() => scrollToSection('design-philosophy')}
          siteReady={!loading}
          turboMode={isCustomSelectActive && autoScrolling}
        />
      </ErrorBoundary>

      <DesignPhilosophy onScrollDown={() => scrollToSection('doorways')} siteReady={!loading} />

      <Doorways
        onPresetSelect={(presetName) => {
          const preset = (presetsData as Array<{ name: string; values: Record<string, number> }>)
            .find(p => p.name === presetName);
          if (preset) handleRadarPlay(preset.values, presetName);
        }}
        onScrollUp={() => scrollToSection('design-philosophy')}
        onScrollDown={() => scrollToSection('project-selection')}
      />

      {/* ── Section 5: Project Selection (Works) ── */}
      <section id="project-selection" className="relative min-h-screen flex flex-col items-center" style={{ paddingLeft: 'var(--page-margin)', paddingRight: 'var(--page-margin)', paddingTop: worksIsMobile ? mobileSectionPaddingTop : 80, paddingBottom: worksIsMobile ? mobileSectionPaddingBottom : darkShapeBottomPanelHeight }}>
        {/* White side strips */}
        <div className="absolute inset-y-0 left-0 bg-white z-2 pointer-events-none" style={{ width: 'var(--page-margin)' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute inset-y-0 right-0 bg-white z-2 pointer-events-none" style={{ width: 'var(--page-margin)' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* White top strip */}
        <div className="absolute top-0 left-0 right-0 bg-white z-2 pointer-events-none" style={{ height: worksIsMobile ? mobileSectionPaddingTop : darkShapeTopPadding }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* White bottom panels */}
        <div className="absolute bottom-0 left-0 bg-white z-2 pointer-events-none" style={{ width: worksIsMobile ? mobileBottomCornerWidth : darkShapeBottomCornerWidth, height: worksIsMobile ? mobileBottomPanelHeight : darkShapeBottomPanelHeight, borderTopRightRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 bg-white z-2 pointer-events-none" style={{ width: worksIsMobile ? mobileBottomCornerWidth : darkShapeBottomCornerWidth, height: worksIsMobile ? mobileBottomPanelHeight : darkShapeBottomPanelHeight, borderTopLeftRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* Content */}
        <div className="h-3" />
        <h2 className="relative z-10 font-serif font-bold text-white text-4xl text-center mb-3">Work Selection</h2>
        <p className="relative z-10 font-sans text-white/40 text-sm leading-relaxed text-center mx-auto" style={{ maxWidth: "65%" }}>
          {/*Select a preset or tune the chart. Use the arrow below to see the projects.*/}
        </p>
        <div className="works-chart-wrapper relative z-10 flex-1 flex flex-col items-center justify-start w-full min-h-0" style={{ marginTop: worksIsMobile ? mobileTitleToChartGap : -24 }}>
          <RadarChart
            onPlay={handleRadarPlay}
            onCategoryFilter={handleCategoryFilter}
            customPreset={isCustomSelectActive && customSelectIds ? {
              name: labelSelectionParked ? 'Custom Selection' : (customSelectLabel || 'Your Selection'),
              ids: customSelectIds,
            } : null}
            onCustomPresetClick={() => {
              if (customSelectIds) {
                setSelectedProjectIds(customSelectIds);
                setSelectedProjectScores({});
                setLastPresetName(customSelectLabel);
                setLabelSelectionParked(false);
                scrollToSection('project-cards');
              }
            }}
            activePresetOverride={autoScrolling ? lastPresetName : null}
            onChartInteraction={() => {
              if (isCustomSelectActive && !autoScrolling) setLabelSelectionParked(true);
            }}
          />
        </div>
      </section>

      <ProjectCards
        selectedProjectIds={selectedProjectIds}
        selectedProjectScores={selectedProjectScores}
        radarValues={lastRadarValues}
        activePresetName={lastPresetName}
        debugMeta={lastDebugMeta ?? undefined}
        showDebug={showDebug}
      />

      <AlgorithmExplainer
        visible={showDebug}
        radarValues={lastRadarValues}
        presetName={lastPresetName}
        debugMeta={lastDebugMeta}
        selectedCount={selectedProjectIds.length}
        totalProjects={44}
        matchedCount={lastMatchedCount}
      />

      {/* Debug flash notification */}
      {debugFlash && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(0,0,0,0.75)', color: '#fff',
          fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em',
          padding: '6px 16px', borderRadius: 6, pointerEvents: 'none',
          backdropFilter: 'blur(6px)', animation: 'philosophy-cursor-blink 500ms step-end 2',
        }}>
          {debugFlash}
        </div>
      )}

      {/* Skip-to-selection pill during auto-scroll tour */}
      {showSkipPill && (
        <button
          onClick={skipToEnd}
          style={{
            position: 'fixed',
            bottom: 32,
            right: worksIsMobile ? '50%' : 32,
            transform: worksIsMobile ? 'translateX(50%)' : 'none',
            zIndex: 200,
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1c1c1d',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 24,
            padding: '8px 20px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = worksIsMobile ? 'translateX(50%) scale(1.05)' : 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = worksIsMobile ? 'translateX(50%)' : 'none'; }}
        >
          Skip to selection →
        </button>
      )}

      {/* Return-to-label pill — appears when user has parked the custom selection */}
      {isCustomSelectActive && labelSelectionParked && !autoScrolling && (
        <button
          onClick={() => {
            if (customSelectIds) {
              setSelectedProjectIds(customSelectIds);
              setSelectedProjectScores({});
              setLastPresetName(customSelectLabel);
              setLabelSelectionParked(false);

              // Compute averaged radar for the custom preset
              const projects = projectsData.projects as { id: string; categoryScores: Record<string, number> }[];
              const selected = projects.filter(p => customSelectIds.includes(p.id));
              if (selected.length > 0) {
                const avgRadar: Record<string, number> = {};
                const keys = Object.keys(selected[0]?.categoryScores || {});
                keys.forEach(key => {
                  avgRadar[key] = Math.round(
                    selected.reduce((sum, p) => sum + (p.categoryScores[key] || 0), 0) / selected.length,
                  );
                });
                setLastRadarValues(avgRadar);
              }

              scrollToSection('project-cards');
            }
          }}
          style={{
            position: 'fixed',
            bottom: 32,
            right: worksIsMobile ? '50%' : 32,
            transform: worksIsMobile ? 'translateX(50%)' : 'none',
            zIndex: 200,
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1c1c1d',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 24,
            padding: '8px 20px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = worksIsMobile ? 'translateX(50%) scale(1.05)' : 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = worksIsMobile ? 'translateX(50%)' : 'none'; }}
        >
          {customSelectLabel} Selection →
        </button>
      )}

      <ContactBottom
        config={contactConfig}
        onScrollToHero={() => scrollToSection('hero')}
        onResetHero={resetHero}
      />
    </>
  );
}
