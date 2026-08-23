import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Script from "next/script";

import SessionInit from "@/components/SessionInit";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { t } from "@/lib/i18n";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  applicationName: t.meta.siteName,
  openGraph: {
    title: t.meta.siteName,
    description: t.meta.description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Script del provider analytics esterno, se configurato via env. */
function AnalyticsScript() {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL;
  if (!src) return null;
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  return <Script src={src} data-domain={domain} strategy="afterInteractive" />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={t.locale}>
      <body className={`${display.variable} ${sans.variable}`}>
        <SessionInit />
        <div className="shell">
          <SiteHeader />
          <main className="main">{children}</main>
          <SiteFooter />
        </div>
        <AnalyticsScript />
      </body>
    </html>
  );
}
