"use client";

import { useEffect } from "react";

import { markSession } from "@/lib/progress";

/** Registra l'apertura della sessione e crea l'ID anonimo al primo accesso. */
export default function SessionInit() {
  useEffect(() => {
    markSession();
  }, []);
  return null;
}
