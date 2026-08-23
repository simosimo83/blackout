import { it, type Strings } from "./it";

/**
 * MVP monolingua: l'unico locale attivo è l'italiano.
 * Aggiungendo `en.ts` / `es.ts` basta registrarli qui e leggere il locale
 * dalla richiesta o dal path.
 */
export const LOCALES = ["it"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";

const dictionaries: Record<Locale, Strings> = { it };

export function getStrings(locale: Locale = DEFAULT_LOCALE): Strings {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Dizionario attivo. Import diretto per componenti e pagine. */
export const t = getStrings();

export type { Strings };
