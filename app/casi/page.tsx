import type { Metadata } from "next";

import CaseGrid from "@/components/CaseGrid";
import { getCaseMetas } from "@/lib/cases.server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.cases.title} — ${t.meta.siteName}`,
  description: t.cases.subtitle,
};

export default function CasesPage() {
  return (
    <section className="archive">
      <h1 className="page-title">{t.cases.title}</h1>
      <p className="page-sub">{t.cases.subtitle}</p>
      <CaseGrid cases={getCaseMetas()} />
    </section>
  );
}
