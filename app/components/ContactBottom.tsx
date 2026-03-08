'use client';

import type { ContactConfig } from './ContactTop';
import ContactIcons from './ContactIcons';

interface Props {
  config:         ContactConfig;
  onScrollToHero: () => void;
  onResetHero:    () => void;
}

export default function ContactBottom({ config, onScrollToHero, onResetHero }: Props) {
  const {
    notchHeight, notchLeft, notchRight, headingPadding,
    containerRadius, homeButtonEdgePadding, sectionEdge, whiteGrainOpacity,
  } = config;

  return (
    <section
      id="contact-bottom"
      className="relative z-2"
      style={{ paddingBottom: sectionEdge }}
    >
      {/* Outer wrapper — border-radius on bottom corners; overflow:hidden clips the inner container. */}
      <div
        className="mx-10"
        style={{
          borderBottomLeftRadius:  containerRadius,
          borderBottomRightRadius: containerRadius,
          overflow: 'hidden',
        }}
      >
        {/* White container — clip-path carves the notch at bottom-center */}
        <div
          className="relative bg-white"
          style={{
            clipPath: `polygon(0 0, 100% 0, 100% 100%, ${notchRight}% 100%, ${notchRight}% calc(100% - ${notchHeight}px), ${notchLeft}% calc(100% - ${notchHeight}px), ${notchLeft}% 100%, 0 100%)`,
          }}
        >
          {/* Grain overlay — reuses #white-grain filter defined in page.tsx */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: whiteGrainOpacity, pointerEvents: 'none', zIndex: 0 }}>
            <rect width="100%" height="100%" filter="url(#white-grain)" />
          </svg>

          {/* "Contact" heading */}
          <div className="relative flex justify-center" style={{ paddingTop: headingPadding, paddingBottom: 32, zIndex: 1 }}>
            <h2 className="font-serif font-bold text-[#282829] text-4xl">Contact</h2>
          </div>

          {/* Spacer matching the notch height */}
          <div style={{ height: notchHeight }} />
        </div>
      </div>{/* end outer radius wrapper */}

      {/* Icons — absolutely positioned inside the dark bottom notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 py-5 w-[28vw]" style={{ bottom: sectionEdge }}>
        <ContactIcons />
      </div>

      {/* HOME button — below the white container, anchored from the outer page edge */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none"
        style={{ bottom: homeButtonEdgePadding }}
      >
        <button
          onClick={() => { onScrollToHero(); onResetHero(); }}
          className="font-sans text-white/35 text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-1 hover:text-white/65 transition-colors cursor-pointer pointer-events-auto"
        >
          <span>▲</span>
          <span>Home</span>
        </button>
      </div>
    </section>
  );
}
