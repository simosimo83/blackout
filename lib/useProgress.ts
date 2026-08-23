"use client";

import { useSyncExternalStore } from "react";

import { progressSnapshot, subscribeProgress, type Progress } from "./progress";

/** Sul server (e alla prima idratazione) non esiste `localStorage`. */
const serverSnapshot = (): Progress | null => null;

/**
 * Progressi salvati sul dispositivo.
 * Restituisce `null` finché la pagina non è idratata: i componenti mostrano
 * uno stato neutro e poi si aggiornano, senza disallineamenti di idratazione.
 */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribeProgress, progressSnapshot, serverSnapshot);
}
