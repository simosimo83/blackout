"use client";

import { useEffect, useRef } from "react";

import { track, type EventName, type EventProps } from "@/lib/analytics";

export interface TrackViewProps {
  event: EventName;
  props?: EventProps;
}

/** Invia un evento una sola volta quando la pagina viene montata. */
export default function TrackView({ event, props }: TrackViewProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
  }, [event, props]);
  return null;
}
