import type { Metadata } from "next";

import TutorialClient from "@/components/TutorialClient";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.tutorial.title} — ${t.meta.siteName}`,
  description: t.tutorial.subtitle,
};

export default function TutorialPage() {
  return (
    <section className="tutorial-page">
      <p className="page-sub">{t.tutorial.subtitle}</p>
      <TutorialClient />
    </section>
  );
}
