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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
