'use client';

import { useState, useEffect } from 'react';

// ── Design variables ────────────────────────────────────────────────────────

// Page background — frosted white, like the header effect
const pageBgColor        = 'rgba(238, 236, 232, 0.95)';
const pageBlur           = '0px';
const pageGrainOpacity   = 0.60;

// Page fade-out on successful login
const successFadeDur     = 500;                            // ms — fade to white before redirect

// Title — "ENOL VALLINA" above the box
const titleText          = 'ENOL VALLINA';
const titleFont          = 'var(--font-roboto), Roboto, sans-serif';
const titleFontSize      = '1.6rem';
const titleFontSizeMobile = '2.4rem';
const titleFontWeight    = '900';
const titleColor         = '#1c1c1d';
const titleOpacity       = 0.95;
const titleLetterSpacing = '0.02em';
const titleGapBelow      = 5;                             // px

// Background image — centered in viewport, behind the form
const imageSrc               = '/images/psw/1_Public-Realm_01_dark.png';
const imageWidth             = 1200;                      // px — desktop
const imageWidthMobile       = 1000;                       // px — mobile (< 600px)
const imageOpacity           = 0.5;                       // desktop
const imageOpacityMobile     = 1;                         // mobile (< 600px)
const imageBorderRadius      = 0;                         // px
const imageOffsetX           = 18;                        // px — positive = right, negative = left
const imageOffsetY           = -30;                       // px — positive = down,  negative = up

// Mobile layout — title pinned top, form pinned bottom
const mobileTitlePaddingTop    = 120;                     // px — distance from top edge to title
const mobileFormPaddingBottom  = 60;                     // px — distance from form to bottom edge

// Mobile breakpoint
const mobileBreakpoint = 600;                             // px

// Password box wrapper (transparent — just controls layout)
const boxWidth          = 240;                            // px
const boxPaddingV       = 20;                             // px top/bottom
const boxPaddingH       = 5;                              // px left/right
const boxBorderRadius   = 6;                              // px
const boxBorder         = '1px solid rgba(255,255,255,0.07)';
const boxBg             = 'rgba(26, 26, 27, 0.0)';

// Input field
const inputBg           = 'rgba(22,22,23,0.98)';
const inputBgError      = 'rgba(110,18,18,0.95)';         // red background on wrong password
const inputBorderColor  = 'rgba(255,255,255,0.0)';
const inputBorderError  = 'rgba(255,80,80,0.0)';          // border on error (raise opacity to show)
const inputTextColor    = 'rgba(255,255,255,0.98)';
const inputFont         = 'var(--font-sans)';
const inputFontSize     = '0.9rem';
const inputBorderRadius = 0;                              // px
const errorShakeDist    = 5;                              // px — shake travel distance
const errorShakeDur     = 500;                            // ms — total shake duration
const errorHoldDur      = 2000;                           // ms — hold red before fading
const errorFadeDur      = 600;                            // ms — fade from red back to dark

// Key icon submit button — color is controlled inside the SVG file itself
const buttonIconFilter        = 'invert(1)';              // CSS filter (e.g. 'invert(1)' flips white→black)
const buttonIconOpacity       = 0.90;                     // resting opacity
const buttonIconHoverOpacity  = 1.0;                      // opacity on hover
const buttonIconSize          = 60;                       // px — rendered size
const buttonIconHoverScale    = 1.18;                     // inflate on hover
const buttonIconHoverRotation = 15;                       // degrees clockwise on hover
const buttonIconTransition    = 160;                      // ms for inflate / deflate
const buttonIconMarginTop     = 30;                       // px — gap between input field and icon

// ── Component ───────────────────────────────────────────────────────────────

export default function LoginForm({ initialError }: { initialError: boolean }) {
  const [hasError,  setHasError]  = useState(initialError);
  const [errorKey,  setErrorKey]  = useState(0);   // bump to re-trigger shake on repeated wrong attempts
  const [fading,    setFading]    = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch('/api/auth', { method: 'POST', body: formData });

    // fetch follows redirects; check final URL to determine success vs. error
    if (res.url.includes('error=1')) {
      setHasError(true);
      setErrorKey(k => k + 1);  // re-trigger animation on repeated attempts
    } else {
      // Correct password — fade out, then navigate
      setFading(true);
      setTimeout(() => { window.location.href = '/'; }, successFadeDur);
    }
  };

  return (
    <main style={{
      minHeight:            '100dvh',
      display:              'flex',
      flexDirection:        'column',
      alignItems:           'center',
      justifyContent:       'center',
      padding:              isMobile ? 0 : '2rem',
      background:           pageBgColor,
      backdropFilter:       `blur(${pageBlur})`,
      WebkitBackdropFilter: `blur(${pageBlur})`,
      position:             'relative',
      overflow:             'hidden',
      opacity:              fading ? 0 : 1,
      transition:           fading ? `opacity ${successFadeDur}ms ease` : 'none',
      pointerEvents:        fading ? 'none' : 'auto',
    }}>

      <style>{`
        .login-key-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: ${buttonIconOpacity};
          filter: ${buttonIconFilter};
          transition: transform ${buttonIconTransition}ms ease, opacity ${buttonIconTransition}ms ease;
          margin-top: ${buttonIconMarginTop}px;
        }
        .login-key-btn:hover {
          transform: scale(${buttonIconHoverScale}) rotate(${buttonIconHoverRotation}deg);
          opacity: ${buttonIconHoverOpacity};
        }
        @keyframes login-shake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-${errorShakeDist}px); }
          35%  { transform: translateX(${errorShakeDist}px); }
          55%  { transform: translateX(-${Math.round(errorShakeDist * 0.5)}px); }
          70%  { transform: translateX(${Math.round(errorShakeDist * 0.5)}px); }
          85%  { transform: translateX(-${Math.round(errorShakeDist * 0.2)}px); }
          100% { transform: translateX(0); }
        }
        @keyframes login-error-fade {
          0%, ${Math.round(errorHoldDur / (errorHoldDur + errorFadeDur) * 100)}% { background: ${inputBgError}; }
          100% { background: ${inputBg}; }
        }
        .login-input-error {
          animation:
            login-shake ${errorShakeDur}ms ease-out,
            login-error-fade ${errorHoldDur + errorFadeDur}ms ease-in forwards;
        }
      `}</style>

      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     `translate(calc(-50% + ${imageOffsetX}px), calc(-50% + ${imageOffsetY}px))`,
          width:         isMobile ? imageWidthMobile : imageWidth,
          opacity:       isMobile ? imageOpacityMobile : imageOpacity,
          borderRadius:  imageBorderRadius,
          pointerEvents: 'none',
          userSelect:    'none',
          zIndex:        0,
        }}
      />

      {/* Grain overlay */}
      <svg
        aria-hidden="true"
        style={{
          position:      'fixed',
          inset:         0,
          width:         '100%',
          height:        '100%',
          opacity:       pageGrainOpacity,
          pointerEvents: 'none',
          zIndex:        0,
        }}
      >
        <filter id="login-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#login-grain)" />
      </svg>

      {/* Content column */}
      <div style={{
        position:       'relative',
        zIndex:         1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        ...(isMobile && {
          minHeight:      '100dvh',
          justifyContent: 'space-between',
          width:          '100%',
        }),
      }}>

        {/* Title */}
        <p style={{
          fontFamily:    titleFont,
          fontSize:      isMobile ? titleFontSizeMobile : titleFontSize,
          fontWeight:    titleFontWeight,
          color:         titleColor,
          opacity:       titleOpacity,
          letterSpacing: titleLetterSpacing,
          margin:        0,
          marginBottom:  titleGapBelow,
          userSelect:    'none',
          ...(isMobile && { paddingTop: mobileTitlePaddingTop }),
        }}>
          {titleText}
        </p>

        {/* Form group */}
        <div style={{
          width:         boxWidth,
          boxSizing:     'border-box',
          background:    boxBg,
          border:        boxBorder,
          borderRadius:  boxBorderRadius,
          paddingTop:    boxPaddingV,
          paddingBottom: isMobile ? mobileFormPaddingBottom : boxPaddingV,
          paddingLeft:   boxPaddingH,
          paddingRight:  boxPaddingH,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <input
              key={errorKey}
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className={hasError ? 'login-input-error' : undefined}
              style={{
                width:         '100%',
                padding:       '0.65rem 0.85rem',
                background:    hasError ? inputBgError : inputBg,
                border:        `1px solid ${hasError ? inputBorderError : inputBorderColor}`,
                borderRadius:  inputBorderRadius,
                color:         inputTextColor,
                fontFamily:    inputFont,
                fontSize:      inputFontSize,
                letterSpacing: '0.05em',
                outline:       'none',
                textAlign:     'center',
                boxSizing:     'border-box',
              }}
            />

            {/* Key icon — submit button. Edit /public/images/ui/icons/ev_key.svg to change the icon. */}
            <button type="submit" className="login-key-btn" aria-label="Enter">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ui/icons/ev_key.svg"
                alt=""
                width={buttonIconSize}
                height={buttonIconSize}
                style={{ display: 'block' }}
              />
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
