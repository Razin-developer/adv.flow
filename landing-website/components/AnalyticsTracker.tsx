"use client";

import { useEffect } from "react";

type AnalyticsTrackerProps = {
  pathname: string;
};

export default function AnalyticsTracker({ pathname }: AnalyticsTrackerProps) {
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const referrer = typeof document !== "undefined" ? document.referrer : "";

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pathname,
        search,
        referrer,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
