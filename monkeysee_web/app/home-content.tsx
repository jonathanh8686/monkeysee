"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession, signIn, signOut } from "next-auth/react"; // 👈 NEW
import { PredictionActivityGraph } from "./prediction-activity-graph";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const CUTOFF_ISO = "2025-12-31T23:59:59";

type PredictionStats = {
  datetime: string;
  count: number;
};

const Countdown = dynamic(() => import("./countdown").then((m) => m.Countdown), {
  ssr: false,
});

export function HomeContent() {
  const { data: session, status } = useSession(); // 👈 auth state
  const isAuthLoading = status === "loading";
  const user = session?.user;
  const isSignedIn = !!user;

  const [prediction, setPrediction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<PredictionStats[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const statsRef = useRef<PredictionStats[]>([]);
  const totalCountRef = useRef<number>(0);

  const trimmedPrediction = useMemo(() => prediction.trim(), [prediction]);

  const statsChanged = useCallback((next: PredictionStats[], nextTotal: number) => {
    const current = statsRef.current;
    const currentTotal = totalCountRef.current;

    if (current.length !== next.length || currentTotal !== nextTotal) {
      return true;
    }

    for (let i = 0; i < current.length; i += 1) {
      const prevItem = current[i];
      const nextItem = next[i];
      if (
        !prevItem ||
        !nextItem ||
        prevItem.datetime !== nextItem.datetime ||
        prevItem.count !== nextItem.count
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const loadStats = useCallback(async () => {
    setFetchError(null);
    try {
      const [statsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/predictions/stats`),
        fetch(`${API_BASE_URL}/predictions/summary`),
      ]);

      if (!statsRes.ok || !summaryRes.ok) {
        throw new Error("Failed to load prediction statistics");
      }

      const statsData = (await statsRes.json()) as PredictionStats[];
      const summaryData = (await summaryRes.json()) as { total: number };

      if (statsChanged(statsData, summaryData.total)) {
        statsRef.current = statsData;
        totalCountRef.current = summaryData.total;
        setStats(statsData);
        setTotalCount(summaryData.total);
      }
    } catch (error) {
      console.error(error);
      setFetchError("Unable to load prediction statistics.");
    } finally {
      setIsLoadingStats(false);
    }
  }, [statsChanged]);

  useEffect(() => {
    setIsLoadingStats(true);
    loadStats();
    const interval = setInterval(loadStats, 1000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cutoff = useMemo(() => new Date(CUTOFF_ISO), []);
  const isClosed = now >= cutoff;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedPrediction || isClosed) return;

    if (!isSignedIn) {
      setFormError("Please sign in with Google before submitting a prediction.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setFormError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedPrediction,
          author_name: user?.name ?? user?.email ?? "anonymous",
          author_email: user?.email,
        }),
      });

      if (!res.ok) {
        let errorDetail = "Request failed";
        try {
          const payload = await res.json();
          if (Array.isArray(payload?.detail) && payload.detail[0]?.msg) {
            errorDetail = payload.detail[0].msg;
          }
        } catch {
          // Ignore JSON parse errors and fall back to generic message.
        }
        throw new Error(errorDetail);
      }

      setPrediction("");
      setMessage("Prediction submitted!");
      loadStats();
    } catch (error) {
      console.error(error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong submitting your prediction."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled =
    !trimmedPrediction || isSubmitting || isClosed || !isSignedIn || isAuthLoading;

  const textareaDisabled = isSubmitting || isClosed || !isSignedIn || isAuthLoading;

  return (
    <div className="flex w-full flex-col gap-10 lg:flex-row lg:gap-12">
      <div className="w-full flex-1 space-y-8 lg:w-[65%] lg:flex lg:flex-col">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[11px] font-medium text-zinc-200">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isClosed ? "bg-red-500" : "bg-emerald-500"
                }`}
              />
              {isClosed ? "Predictions closed" : "Accepting predictions"}
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Make a prediction
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
              {isClosed
                ? "Submissions are closed. You can still browse the final set of predictions."
                : "What's happening in 2026? Make a call before the clock runs out."}
            </p>
            {!isClosed && (
              <p className="text-[11px] font-mono text-zinc-400">
                Closes on Dec 31 2025, 11:59pm · <Countdown target={cutoff} />
              </p>
            )}
          </div>

          {/* 👇 Auth UI */}
          <div className="flex flex-col items-end gap-2 text-xs">
            {isAuthLoading ? (
              <span className="text-zinc-400">Checking sign-in…</span>
            ) : isSignedIn ? (
              <>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="max-w-[160px] truncate">
                    {user?.name ?? user?.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google")}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-100 hover:bg-zinc-800"
              >
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </header>

        <section className="space-y-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/60 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Submit a prediction
            </h2>
            {!isSignedIn && !isAuthLoading && (
              <span className="text-[11px] text-zinc-400">
                Sign in with Google to submit.
              </span>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Your prediction
              </span>
              <textarea
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                className="w-full min-h-[96px] resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800 disabled:bg-zinc-100/60 dark:disabled:bg-zinc-800/40"
                disabled={textareaDisabled}
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={submitDisabled}
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-700/70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700/70"
              >
                {isClosed
                  ? "Submissions closed"
                  : !isSignedIn
                    ? "Sign in to submit"
                    : isSubmitting
                      ? "Submitting..."
                      : "Submit prediction"}
              </button>
            </div>

            {(message || formError) && (
              <p
                className={`text-xs ${
                  formError
                    ? "text-red-500 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formError ?? message}
              </p>
            )}
          </form>
        </section>
        {/* <section className="w-full">
            <Rankings/>
        </section> */}
      </div>

      <PredictionActivityGraph
        stats={stats}
        totalCount={totalCount}
        isLoading={isLoadingStats}
        error={fetchError}
      />
    </div>
  );
}
