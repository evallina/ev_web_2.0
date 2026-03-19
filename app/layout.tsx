import type { Metadata } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: 'Enol Vallina | Design',
  description: 'Architect by training, researcher by habit. A cross-scale design practice spanning computational tools, built environments, and speculative visions.',
  metadataBase: new URL('https://enolvallina.com'),
  robots: { index: true, follow: true, noimageindex: true },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/images/ui/icons/ev_square.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/images/ui/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Enol Vallina | Design',
    description: 'Architect by training, researcher by habit. A cross-scale design practice spanning computational tools, built environments, and speculative visions.',
    url: 'https://enolvallina.com',
    siteName: 'Enol Vallina',
    images: [
      {
        url: '/images/og/Public_Realm_01 OG2.jpg',
        width: 1200,
        height: 630,
        alt: 'Enol Vallina | Design',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enol Vallina | Design',
    description: 'Architect by training, researcher by habit. A cross-scale design practice spanning computational tools, built environments, and speculative visions.',
    images: ['/images/og/Public_Realm_01 OG2.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${roboto.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Enol Vallina",
              "url": "https://enolvallina.com",
              "jobTitle": "Multidisciplinary Designer",
              "description": "Multidisciplinary designer with 13+ years of experience across architecture, urbanism, computational design, and interactive systems. Combines research-driven methods with cross-scale design thinking to shape outcomes that are technically rigorous, context-aware, and communicatively precise.",
              "email": "hello@enolvallina.com",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Seattle",
                "addressRegion": "WA",
                "addressCountry": "US"
              },
              "knowsAbout": [
                "Computational Design",
                "Parametric Geometry",
                "Algorithmic Workflows",
                "Data Visualization",
                "Tool Building",
                "Urban Analytics",
                "Architecture",
                "Urban Design",
                "Public Realm",
                "Civic Infrastructure",
                "Masterplanning",
                "Interactive Installations",
                "Prototyping",
                "Strategic Planning",
                "Speculative Design",
                "Grasshopper",
                "Python",
                "Rhino 3D",
                "Revit",
                "QGIS",
                "Next.js",
                "TypeScript",
                "Three.js",
                "WebGL",
                "Unity3D",
                "Figma",
                "Adobe Suite"
              ],
              "knowsLanguage": ["English", "Spanish"],
              "sameAs": [
                "https://www.instagram.com/enolvallina",
                "https://linkedin.com/in/enolvallina"
              ],
              "alumniOf": [
                {
                  "@type": "CollegeOrUniversity",
                  "name": "Harvard University Graduate School of Design",
                  "description": "Master in Design Studies, Technology (2015-2017)"
                },
                {
                  "@type": "CollegeOrUniversity",
                  "name": "University College London, Bartlett School of Architecture",
                  "description": "MArch Urban Design (2009-2010)"
                },
                {
                  "@type": "CollegeOrUniversity",
                  "name": "Universitat Ramon Llull, ETSALS Barcelona",
                  "description": "BA + MArch Architecture (2003-2009)"
                }
              ],
              "hasOccupation": [
                {
                  "@type": "Occupation",
                  "name": "Architect, Urban Designer & Researcher",
                  "skills": "Architecture, Urban Design, Computational Design, Parametric Tools, Data Visualization, Research"
                }
              ],
              "worksFor": {
                "@type": "Organization",
                "name": "Independent Practice"
              },
              "memberOf": [
                {
                  "@type": "Organization",
                  "name": "COAA (Spain) - Architect License #1481"
                },
                {
                  "@type": "Organization",
                  "name": "ARB (UK) - Architect License #078907K"
                }
              ],
              "award": [
                "Amsterdam Light Festival Installation - Selected (2020)",
                "Real Colegio Complutense in Harvard Fellow - Graduate Scholarship (2016)",
                "AIA Award for Regional & Urban Design - Son Tra Peninsula (2014)"
              ]
            })
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
