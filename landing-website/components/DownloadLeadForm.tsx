"use client";

import { useState } from "react";

type DownloadLeadFormProps = {
  platform: string;
  releaseUrl: string;
  buttonLabel: string;
};

export default function DownloadLeadForm({
  platform,
  releaseUrl,
  buttonLabel,
}: DownloadLeadFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/download-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          platform,
          pathname: "/download",
          search: window.location.search,
          referrer: document.referrer,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save email");
      }

      setStatus("idle");
      setEmail("");
      window.location.href = releaseUrl;
    } catch {
      setStatus("error");
      setMessage("Could not save the email right now. Please try again.");
    }
  }

  return (
    <form className="download-form" onSubmit={handleSubmit}>
      <label className="download-form-label" htmlFor={`email-${platform}`}>
        Email address
      </label>
      <input
        id={`email-${platform}`}
        className="download-form-input"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button className="button primary download-submit" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving..." : buttonLabel}
      </button>
      {message ? <p className="form-message error">{message}</p> : null}
      <p className="form-message">Only an email is required before download.</p>
    </form>
  );
}
