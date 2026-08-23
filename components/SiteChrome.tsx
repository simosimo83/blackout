import Link from "next/link";

import { t } from "@/lib/i18n";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-name">{t.nav.brand}</span>
      </Link>
      <nav className="site-nav" aria-label={t.nav.brand}>
        <Link href="/casi">{t.nav.cases}</Link>
        <Link href="/tutorial">{t.nav.tutorial}</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="footer-tagline">{t.footer.tagline}</p>
      <p className="footer-note">
        {t.nav.brand} — {t.footer.rights}
      </p>
    </footer>
  );
}
