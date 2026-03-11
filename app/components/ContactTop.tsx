'use client';

import ContactIcons from './ContactIcons';

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
        style={{
          marginLeft:           'var(--page-margin)',
          marginRight:          'var(--page-margin)',
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
        <ContactIcons />
      </div>
    </section>
  );
}
