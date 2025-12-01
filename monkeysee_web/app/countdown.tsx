"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return "0d 0h 0m 0s remaining";
  }

  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);           // 24 * 60 * 60
  const hours = Math.floor((totalSeconds % 86400) / 3600); // leftover hours
  const minutes = Math.floor((totalSeconds % 3600) / 60);  // leftover minutes
  const seconds = totalSeconds % 60;                       // leftover seconds

  return `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
}


export function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // what shows before the first client render
    return <span>&nbsp;</span>;
  }

  const remaining = target.getTime() - now.getTime();
  return <span>{formatRemaining(remaining)}</span>;
}
