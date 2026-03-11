import type { Metadata } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Enol Vallina | Design",
  description: "Portfolio of Enol Vallina",
  robots: { index: true, follow: true, noimageindex: true },
  icons: {
    icon: [{ url: '/images/ui/icons/ev_square.svg', type: 'image/svg+xml' }],
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
      </body>
    </html>
  );
}
