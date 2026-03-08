'use client';

// ── Shared contact config type (used by both ContactTop and ContactBottom) ────
export interface ContactConfig {
  notchHeight:           number;  // px — depth of the notch cut-out
  notchWidth:            number;  // %  — width of the notch (centered)
  headingPadding:        number;  // px — white space between heading and notch edge
  containerRadius:       number;  // px — outer corner radius of the white container
  homeButtonEdgePadding: number;  // px — gap: outer page edge → HOME button
  sectionEdge:           number;  // px — derived total dark band height
  notchLeft:             number;  // %  — derived left edge of notch
  notchRight:            number;  // %  — derived right edge of notch
  whiteGrainOpacity:     number;
}

interface Props {
  config:        ContactConfig;
  onScrollToHero: () => void;
  onResetHero:   () => void;
}

export default function ContactTop({ config, onScrollToHero, onResetHero }: Props) {
  const {
    notchHeight, notchLeft, notchRight, headingPadding,
    containerRadius, homeButtonEdgePadding, sectionEdge, whiteGrainOpacity,
  } = config;

  return (
    <section
      id="contact-top"
      className="relative z-2"
      style={{ paddingTop: sectionEdge }}
    >
      {/* Outer wrapper — border-radius on top corners; overflow:hidden clips the inner container.
          clip-path and border-radius cannot coexist on the same element, so the radius
          lives here and the notch clip-path lives on the inner div. */}
      <div
        className="mx-10"
        style={{
          borderTopLeftRadius:  containerRadius,
          borderTopRightRadius: containerRadius,
          overflow: 'hidden',
        }}
      >
        {/* White container — clip-path carves the notch at top-center */}
        <div
          className="relative bg-white"
          style={{
            clipPath: `polygon(0 0, ${notchLeft}% 0, ${notchLeft}% ${notchHeight}px, ${notchRight}% ${notchHeight}px, ${notchRight}% 0, 100% 0, 100% 100%, 0 100%)`,
          }}
        >
          {/* Grain overlay — reuses #white-grain filter defined in page.tsx */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none', zIndex: 0 }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>

          {/* Spacer matching the notch height */}
          <div style={{ height: notchHeight }} />

          {/* "Contact" heading */}
          <div className="relative flex justify-center" style={{ paddingTop: 32, paddingBottom: headingPadding, zIndex: 1 }}>
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Contact</h2>
          </div>
        </div>
      </div>{/* end outer radius wrapper */}

      {/* HOME button — above the white container, anchored from the outer page edge */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none"
        style={{ top: homeButtonEdgePadding }}
      >
        <button
          onClick={() => { onScrollToHero(); onResetHero(); }}
          className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer pointer-events-auto"
        >
          <span>Home</span>
          <span>▼</span>
        </button>
      </div>

      {/* Icons — absolutely positioned inside the dark notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]" style={{ top: sectionEdge }}>
        {/* Instagram */}
        <a href="https://www.instagram.com/enolvallina" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/70 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>

        {/* LinkedIn */}
        <a href="https://linkedin.com/in/enolvallina" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-white/70 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </a>

        {/* Separator */}
        <div className="w-4/5 h-0.75 bg-white" />

        {/* Email */}
        <a href="mailto:hello@enolvallina.com" aria-label="Email" className="text-white/70 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </a>
      </div>
    </section>
  );
}
