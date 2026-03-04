"use client";

import { useEffect, useState } from "react";
import RadarChart from "./components/RadarChart";
import ProjectCards from "./components/ProjectCards";
import DesignPhilosophy from "./components/DesignPhilosophy";
import projectsData from "@/src/data/projects.json";

export default function Home() {
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) {
      window.scrollTo({ top: hero.offsetTop, behavior: "instant" });
    }
  }, []);

  // Global Design parameters
  const grainOpacity        = 0.20;        // change here to adjust grain intensity everywhere (background + cards)
  
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  // ── Project selection — driven by RadarChart play button ─────────────────
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const handleRadarPlay = (radarValues: Record<string, number>) => {
    // Projects whose composite fit score ≥ threshold are shown, sorted best-fit first.
    // Fit score = sum over categories of (radarValue × projectScore / 100).
    // Since each project typically has one dominant category at 80, a radarValue of
    // 25 or more for that category produces a score ≥ 20 (the threshold).
    const MATCH_THRESHOLD = 20;

    const projectScore = (p: typeof projectsData.projects[number]) =>
      Object.entries(p.categoryScores as Record<string, number>).reduce(
        (sum, [key, val]) => sum + (radarValues[key] ?? 0) * val / 100, 0
      );

    const matched = projectsData.projects
      .filter(p => projectScore(p) >= MATCH_THRESHOLD)
      .sort((a, b) => projectScore(b) - projectScore(a))
      .map(p => p.id);

    setSelectedProjectIds(matched);
    scrollToSection('project-cards');
  };

  const scrollToSectionBottom = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Fixed grain overlay — visible through all transparent dark sections ── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ opacity: grainOpacity, zIndex: 1 }}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="page-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#page-noise)" />
      </svg>

      {/* ── Fixed Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#1e1e1f] border-b border-white/10 shadow-md flex items-center justify-between px-6">
        <span className="font-sans text-white text-sm font-medium tracking-wide">
          ENOL VALLINA
        </span>
        <button
          className="w-6 h-6 bg-white/15 rounded-sm flex items-center justify-center"
          aria-label="Menu"
        >
          <div className="flex flex-col gap-0.75">
            <span className="block w-3 h-px bg-white/70" />
            <span className="block w-3 h-px bg-white/70" />
            <span className="block w-3 h-px bg-white/70" />
          </div>
        </button>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
          <rect width="100%" height="100%" filter="url(#page-noise)" />
        </svg>
      </header>

      {/* ── Section 1: Contact (top) ── */}
      <section
        id="contact-top"
        className="relative z-2 pt-24"
      >
        {/* White container — clip-path carves the notch at top-center.
            The section background is transparent, so the dark gradient
            + grain shows through the notch naturally. */}
        <div
          className="relative mx-10 bg-white"
          style={{
            clipPath:
              "polygon(0 0, 34% 0, 34% 180px, 66% 180px, 66% 0, 100% 0, 100% 100%, 0 100%)",
          }}
        >
          {/* Spacer matching the notch height */}
          <div className="h-45" />

          {/* "Contact" heading on the white area */}
          <div className="flex justify-center pt-8 pb-70">
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Contact</h2>
          </div>
        </div>

        {/* Icons — absolutely positioned inside the dark notch */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://linkedin.com/in/enolvallina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>

          {/* Separator */}
          <div className="w-4/5 h-0.75 bg-white" />

          {/* Email */}
          <a
            href="mailto:hello@enolvallina.com"
            aria-label="Email"
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Section 2: My Trajectory ── */}
      <section
        id="trajectory"
        className="min-h-screen flex flex-col items-center justify-center py-20"
      >
        <h2 className="font-serif font-bold text-white text-4xl mb-12"> {/* Trajectory */}</h2>

        <div className="w-full px-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/trajectory/2026-01-20_Timeline.jpg"
            alt="My Trajectory — Timeline"
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ── Section 3: Hero / Welcome — landing point ── */}
      <section
        id="hero"
        className="h-screen flex flex-col"
      >
        {/* Top nav hint — scroll up to Trajectory */}
        <div className="flex justify-center pt-16">
          <button
            onClick={() => scrollToSectionBottom("trajectory")}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
          >
            <span>▲</span>
            <span>My Trajectory</span>
          </button>
        </div>

        {/* Main content — two columns */}
        <div className="flex-1 flex items-center">
          {/* Left column: intro text */}
          <div className="w-1/2 pl-16 pr-12">
            <h1 className="font-serif text-[2.75rem] leading-tight">
              <span className="text-[#E0E0E0]">Hello, this is </span>
              <span className="text-white font-bold">Enol Vallina</span>
              <span className="text-[#E0E0E0]">
                , I am multidisciplinary Designer focusing on the intersection
                between Urban Realm, Architecture Experiences and Technology.
              </span>
            </h1>
          </div>

          {/* Right column: animated GIF */}
          <div className="w-1/2 flex items-center justify-center pr-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero/All_Animation_1.5s.gif"
              alt="Animated portfolio visual"
              className="w-[45vw] max-h-[70vh] object-contain"
            />
          </div>
        </div>

        {/* Bottom nav hint — scroll down to Projects */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => scrollToSection("design-philosophy")}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
          >
            <span>Projects</span>
            <span>▼</span>
          </button>
        </div>

      </section>

      {/* ── Section 4: Design Philosophy ── */}
      <DesignPhilosophy onScrollDown={() => scrollToSection('project-selection')} />

      {/* ── Section 5: Project Selection by Type ── */}
      <section
        id="project-selection"
        className="relative h-screen flex flex-col items-center px-10 pt-20 pb-10"
      >
        {/* White side strips — full section height, same width as px-10 margins */}
        <div className="absolute inset-y-0 left-0 w-10 bg-white z-2 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-10 bg-white z-2 pointer-events-none" />

        {/* White bottom panels — leave ~40% dark gap in the center */}
        <div className="absolute bottom-0 left-0 bg-white z-2 pointer-events-none" style={{ right: '80%', height: '160px' }} />
        <div className="absolute bottom-0 right-0 bg-white z-2 pointer-events-none" style={{ left: '80%', height: '60px' }} />

        {/* Content — above white panels */}
        <h2 className="relative z-10 font-serif font-bold text-white text-4xl text-center mb-3">
          Project Selection by Type
        </h2>
        <p
          className="relative z-10 font-sans text-white/40 text-sm leading-relaxed text-center mx-auto"
          style={{ maxWidth: "65%" }}
        >
          Please configure a custom project showcase based on the design solution categories
        </p>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full min-h-0">
          <RadarChart onPlay={handleRadarPlay} />
        </div>
      </section>

      {/* ── Section 6: Project Cards ── */}
      <ProjectCards selectedProjectIds={selectedProjectIds} />

      {/* ── Section 7: Contact (bottom) ── */}
      <section
        id="contact-bottom"
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <p className="font-sans text-white/30 text-xs uppercase tracking-[0.2em]">
            Section 7
          </p>
          <h2 className="font-serif font-bold text-white text-4xl">Contact</h2>
          <p className="font-sans text-white/40 text-sm mt-2">
            Placeholder — bottom contact section
          </p>
        </div>
      </section>
    </>
  );
}
