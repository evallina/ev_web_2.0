"use client";

import { useEffect } from "react";
import RadarChart from "./components/RadarChart";

export default function Home() {
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) {
      window.scrollTo({ top: hero.offsetTop, behavior: "instant" });
    }
  }, []);

  // Global Design parameters
  const grainOpacity        = 0.15;        // change here to adjust grain intensity everywhere (background + cards)
  
  // Design Solutions Cards Design parameters
  const cardTitleSize       = "text-xl";  // change here to resize all 6 card titles
  const cardDescSize        = "text-base"; // change here to resize all 6 card descriptions
  const cardDescStripHeight = 120;         // px — change here to adjust all 6 description strip heights
  const cardHeight          = 360;         // px — change here to adjust the height of all 6 cards
  const cardGap             = 30;          // px — change here to adjust the spacing between all 6 cards

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
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
            onClick={() => scrollToSection("design-solutions")}
            className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer"
          >
            <span>Projects</span>
            <span>▼</span>
          </button>
        </div>

      </section>

      {/* ── Section 4: Design Solutions ── */}
      <section
        id="design-solutions"
        className="relative z-2 bg-white h-screen flex flex-col px-10 py-18"
      >
        {/* Heading */}
        <h2 className="font-serif font-bold text-[#282829] text-5xl text-center mb-8">
          Design Solutions
        </h2>

        {/* Intro paragraph */}
        <p
          className="font-sans text-[#444444] text-sm leading-relaxed text-center mx-auto mb-14"
          style={{ maxWidth: "65%" }}
        >
          When understanding Design as a way to approach a problem, the nature
          of the solution can take different forms and not being uniquely
          constrained by one form of practice. This portfolio is organized by
          the solutions that each work aims to achieve.
        </p>

        {/* 3×2 category card grid — fills remaining section height */}
        <div className="flex-1 grid grid-cols-3 grid-rows-2 min-h-0" style={{ gap: cardGap, minHeight: cardHeight * 2 + cardGap }}>

          {/* Card 1 — Interactivity: square cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 40, height: 40 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>Interactivity</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/Interactivity_01.png" alt="Interactivity" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>Projects and Studies that explore design solutions that bridge between the digital and the tangible</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

          {/* Card 2 — Public Realm: triangular cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 60, height: 30 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>Public Realm</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/Public-Realm_01.png" alt="Public Realm" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>Work that ambitions to improve the public environment through interventions in different design scales.</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

          {/* Card 3 — User-Oriented: quarter-circle cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 30, height: 60 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>User-Oriented</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/User-Oriented_01.png" alt="User-Oriented" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>A project that results on a taxonomy exercise of the user in order to create an environment that would represent them.</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

          {/* Card 4 — Data-Driven: staircase cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 50, height: 50 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>Data-Driven</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/Data-Driven_01.png" alt="Data-Driven" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>Solutions that ambition to unveil insights that help to make design-driven decisions, as well as storytelling pieces.</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

          {/* Card 5 — Strategy: thin horizontal bar cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 80, height: 20 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>Strategy</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/Strategy_01.png" alt="Strategy" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>Ideas and Conceptualization of the solutions to a problem in predetermined range of time, and that would create an exciting and hopeful future.</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

          {/* Card 6 — Places: parallelogram cutout */}
          <div className="relative bg-[#282829] flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-white" style={{ width: 55, height: 40 }} />
            <div className="p-4 pb-0">
              <span className={`font-sans font-bold text-white uppercase tracking-widest ${cardTitleSize}`}>Places</span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/categories/Place_01.png" alt="Places" className="w-full h-full object-contain" />
            </div>
            <div className="bg-[#1a1a1b] px-4 py-3 overflow-hidden" style={{ height: cardDescStripHeight }}>
              <p className={`font-sans text-white/60 leading-relaxed ${cardDescSize}`}>Projects and studies which ultimate goal is to improve and engage the user experience.</p>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: grainOpacity }} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#page-noise)" />
            </svg>
          </div>

        </div>

        {/* Bottom nav hint — scroll down to Project Showcase */}
        <div className="flex justify-center mt-auto pt-6 pb-2">
          <button
            onClick={() => scrollToSection("project-selection")}
            className="font-sans text-[#282829]/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-[#282829]/65 transition-colors cursor-pointer"
          >
            <span>Project Showcase</span>
            <span>▼</span>
          </button>
        </div>
      </section>

      {/* ── Section 5: Project Selection by Type ── */}
      <section
        id="project-selection"
        className="relative h-screen flex flex-col items-center px-10 pt-20 pb-10"
      >
        {/* White side strips — full section height, same width as px-10 margins */}
        <div className="absolute inset-y-0 left-0 w-10 bg-white z-2 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-10 bg-white z-2 pointer-events-none" />

        {/* White bottom panels — leave ~40% dark gap in the center */}
        <div className="absolute bottom-0 left-0 bg-white z-2 pointer-events-none" style={{ right: '70%', height: '80px' }} />
        <div className="absolute bottom-0 right-0 bg-white z-2 pointer-events-none" style={{ left: '70%', height: '80px' }} />

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
          <RadarChart />
        </div>
      </section>

      {/* ── Section 6: Project Cards (alternating backgrounds) ── */}
      <section id="project-cards">
        {/* Card slot A — dark */}
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="font-sans text-white/30 text-xs uppercase tracking-[0.2em]">
              Section 6 · Card A — Dark
            </p>
            <h2 className="font-serif font-bold text-white text-4xl">Project Card</h2>
            <p className="font-sans text-white/40 text-sm mt-2">
              Placeholder — project card (dark background)
            </p>
          </div>
        </div>

        {/* Card slot B — light */}
        <div className="relative z-2 min-h-screen bg-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="font-sans text-black/30 text-xs uppercase tracking-[0.2em]">
              Section 6 · Card B — Light
            </p>
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Project Card</h2>
            <p className="font-sans text-black/40 text-sm mt-2">
              Placeholder — project card (light background)
            </p>
          </div>
        </div>
      </section>

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
