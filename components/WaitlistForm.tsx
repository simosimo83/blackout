"use client";

import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import { loadProgress, updateProgress } from "@/lib/progress";

type Status = "idle" | "sending" | "done" | "error";

export interface WaitlistFormProps {
  /** Da dove arriva l'iscrizione: usato negli analytics e nello storage. */
  source: string;
  compact?: boolean;
}

export default function WaitlistForm({ source, compact = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("email_capture_view", { source });
  }, [source]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
      setStatus("error");
      setMessage(t.waitlist.errorInvalid);
      return;
    }
    setStatus("sending");
    setMessage(null);
    let attribution: { utm_source?: string | null; utm_campaign?: string | null; referrer?: string | null } = {};
    try {
      attribution = JSON.parse(window.sessionStorage.getItem("blackout.attribution.v1") ?? "{}");
    } catch {
      /* nessuna attribuzione disponibile */
    }
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          source,
          anonId: loadProgress().anonId,
          utmSource: attribution.utm_source ?? undefined,
          utmCampaign: attribution.utm_campaign ?? undefined,
          referrer: attribution.referrer ?? undefined,
        }),
      });
      if (!response.ok) throw new Error("request failed");
      setStatus("done");
      setMessage(t.waitlist.success);
      updateProgress((progress) => ({ ...progress, waitlistSubmitted: true }));
      track("email_submitted", { source });
    } catch {
      setStatus("error");
      setMessage(t.waitlist.errorGeneric);
    }
  };

  if (status === "done") {
    return (
      <p className="waitlist-done" role="status">
        {message}
      </p>
    );
  }

  return (
    <form className={`waitlist${compact ? " is-compact" : ""}`} onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={`waitlist-${source}`}>
        {t.waitlist.placeholder}
      </label>
      <input
        id={`waitlist-${source}`}
        className="waitlist-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={t.waitlist.placeholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "sending"}
      />
      <button className="btn btn-solid" type="submit" disabled={status === "sending"}>
        {status === "sending" ? t.waitlist.submitting : t.waitlist.submit}
      </button>
      {message && (
        <p className="waitlist-message" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
