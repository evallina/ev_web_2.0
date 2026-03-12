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
  homeIconColor:         string;  // color of the house icon and arrow
  homeIconOpacity:       number;  // opacity at rest (0–1)
  homeIconHoverOpacity:  number;  // opacity on hover (0–1)
  homeIconSize:          number;  // px — width & height of the house icon
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
    homeIconColor, homeIconOpacity, homeIconHoverOpacity, homeIconSize,
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
          className="flex flex-col items-center gap-1 cursor-pointer pointer-events-auto transition-opacity"
          style={{ background: 'none', border: 'none', padding: 0, color: homeIconColor, opacity: homeIconOpacity }}
          onMouseEnter={e => (e.currentTarget.style.opacity = String(homeIconHoverOpacity))}
          onMouseLeave={e => (e.currentTarget.style.opacity = String(homeIconOpacity))}
        >
          {/* House icon — rotated 180° so it points downward */}
          <svg width={homeIconSize} height={homeIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
        </button>
      </div>

      {/* Icons — absolutely positioned inside the dark notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]" style={{ top: sectionEdge }}>
        <ContactIcons />
      </div>
    </section>
  );
}
