"use client";

import { useEffect, useState } from "react";
import Header from "./components/Header";
import ContactTop, { type ContactConfig } from "./components/ContactTop";
import Trajectory from "./components/Trajectory";
import Hero from "./components/Hero";
import DesignPhilosophy from "./components/DesignPhilosophy";
import RadarChart from "./components/RadarChart";
import ProjectCards from "./components/ProjectCards";
import { selectProjects } from "@/src/lib/selectProjects";
import type { DebugMeta } from "@/src/types";
import { CAT_KEYS } from "@/src/config/categories";
import ContactBottom from "./components/ContactBottom";
import projectsData from "@/src/data/projects.json";

// ── Shared design variables ───────────────────────────────────────────────────
const grainOpacity      = 0.20; // grain intensity for dark sections (background + header)
const whiteGrainOpacity = 0.70; // grain intensity for white areas (contact + Works framing)

// ── Works section dark-shape controls ────────────────────────────────────────
const darkShapeTopPadding         = 65;    // px — white band above the dark chart area
const darkShapeBottomCornerRadius = 20;    // px — inner top corner radius of bottom white panels
const darkShapeBottomCornerWidth  = '20%'; // width of each bottom white corner panel
const darkShapeBottomPanelHeight  = 60;    // px — height of the bottom white panels

// ── Contact section design variables (shared by ContactTop + ContactBottom) ──
const contactNotchHeight                = 200; // px — depth of the notch cut-out
const contactNotchWidth                 = 30;  // %  — width of the notch (centered)
const contactHeadingPadding             = 500; // px — white space between heading and notch edge
const contactContainerRadius            = 25;  // px — outer corner radius of the white container
const contactHomeButtonEdgePadding      = 80;  // px — gap: outer page edge → HOME button
const contactHomeButtonContainerPadding = 50;  // px — gap: HOME button → white container edge
// Derived values
const contactSectionEdge = contactHomeButtonEdgePadding + 30 + contactHomeButtonContainerPadding;
const contactNotchLeft   = (100 - contactNotchWidth) / 2;
const contactNotchRight  = 100 - contactNotchLeft;

const contactConfig: ContactConfig = {
  notchHeight:           contactNotchHeight,
  notchWidth:            contactNotchWidth,
  headingPadding:        contactHeadingPadding,
  containerRadius:       contactContainerRadius,
  homeButtonEdgePadding: contactHomeButtonEdgePadding,
  sectionEdge:           contactSectionEdge,
  notchLeft:             contactNotchLeft,
  notchRight:            contactNotchRight,
  whiteGrainOpacity,
};

// ── Page orchestrator ─────────────────────────────────────────────────────────
export default function Home() {
  // Scroll to hero on mount
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) window.scrollTo({ top: hero.offsetTop, behavior: "instant" });
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
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

  // ── Effects ────────────────────────────────────────────────────────────────
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

      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        scrolled={scrolled}
        grainOpacity={grainOpacity}
        onNavigate={navigateTo}
        onResetHero={resetHero}
      />

      <ContactTop
        config={contactConfig}
        onScrollToHero={() => scrollToSection('hero')}
        onResetHero={resetHero}
      />

      <Trajectory />

      <Hero
        resetKey={heroResetKey}
        onNavigateUp={() => scrollToSectionBottom('trajectory')}
        onNavigateDown={() => scrollToSection('design-philosophy')}
      />

      <DesignPhilosophy onScrollDown={() => scrollToSection('project-selection')} />

      {/* ── Section 5: Project Selection (Works) ── */}
      <section id="project-selection" className="relative h-screen flex flex-col items-center px-10 pt-20 pb-10">
        {/* White side strips */}
        <div className="absolute inset-y-0 left-0 w-10 bg-white z-2 pointer-events-none">
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute inset-y-0 right-0 w-10 bg-white z-2 pointer-events-none">
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* White top strip */}
        <div className="absolute top-0 left-0 right-0 bg-white z-2 pointer-events-none" style={{ height: darkShapeTopPadding }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* White bottom panels */}
        <div className="absolute bottom-0 left-0 bg-white z-2 pointer-events-none" style={{ width: darkShapeBottomCornerWidth, height: darkShapeBottomPanelHeight, borderTopRightRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 bg-white z-2 pointer-events-none" style={{ width: darkShapeBottomCornerWidth, height: darkShapeBottomPanelHeight, borderTopLeftRadius: darkShapeBottomCornerRadius, overflow: 'hidden' }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none' }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>
        </div>
        {/* Content */}
        <div className="h-2" />
        <h2 className="relative z-10 font-serif font-bold text-white text-4xl text-center mb-3">Work Selection</h2>
        <p className="relative z-10 font-sans text-white/40 text-sm leading-relaxed text-center mx-auto" style={{ maxWidth: "65%" }}>
          Select a preset or tune the chart. Use the arrow below to see the projects.
        </p>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start w-full min-h-0 -mt-6">
          <RadarChart onPlay={handleRadarPlay} onCategoryFilter={handleCategoryFilter} />
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

      <ContactBottom
        config={contactConfig}
        onScrollToHero={() => scrollToSection('hero')}
        onResetHero={resetHero}
      />
    </>
  );
}
