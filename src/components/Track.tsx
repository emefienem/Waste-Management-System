"use client";

import { useEffect } from "react";

export const Track = () => {
  useEffect(() => {
    const trackVisit = async (url: string) => {
      await fetch("/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          timestamp: new Date().toISOString(),
        }),
      });
    };

    const handleRouteChange = () => {
      trackVisit(window.location.href);
    };

    trackVisit(window.location.href);

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return null;
};
