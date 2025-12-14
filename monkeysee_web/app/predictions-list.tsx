"use client";

import { useEffect, useState } from "react";

interface Prediction {
  id: number;
  content: string;
}

export default function PredictionsList({ refreshInterval = 1000 }: { refreshInterval?: number }) {
  const [items, setItems] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await fetch("/backend/predictions", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch predictions");
        const data = (await res.json()) as Prediction[];
        if (mounted) setItems(data);
      } catch (err: unknown) {
        if ((err as Error & { name?: string })?.name === "AbortError") return;
        console.error(err);
        if (mounted) setError("Unable to load predictions.");
      }
    };

    fetchData();
    const id = setInterval(fetchData, refreshInterval);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, [refreshInterval]);

  return (
    <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-3">
      <h3 className="text-sm font-medium text-zinc-200 mb-2">All predictions</h3>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-400">No predictions yet.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-auto pr-2 text-sm text-zinc-100">
          {items.map((p) => (
            <li key={p.id} className="break-words rounded-md bg-zinc-800/30 p-2">
              {p.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
