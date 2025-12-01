"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from "recharts";
import { FC, memo, useMemo } from "react";

const START_ISO = "2025-12-01T00:00:00";
const END_ISO = "2026-01-02T23:59:59";
const CUTOFF_ISO = "2025-12-31T23:59:59";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NowDot: FC<any> = ({ cx, cy, payload }) => {
  if (!payload?.isNow) return null;

  return (
    <g>
      {/* Pulsing ring */}
      <circle cx={cx} cy={cy} r={3} fill="#ffffff" opacity={0.4}>
        <animate
          attributeName="r"
          from="3"
          to="8"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="1"
          to="0"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Core dot */}
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill="#9dffa1"
        stroke="#ffffff"
        strokeWidth={1}
      />
    </g>
  );
};

type PredictionStats = {
  datetime: string;
  count: number;
};

type PredictionActivityGraphProps = {
  stats: PredictionStats[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
};

export const PredictionActivityGraph = memo(function PredictionActivityGraph({
  stats,
  totalCount,
  isLoading,
  error,
}: PredictionActivityGraphProps) {
  const startDate = useMemo(() => new Date(START_ISO), []);
  const endDate = useMemo(() => new Date(END_ISO), []);

  const startTs = startDate.getTime();
  const endTs = endDate.getTime();
  const cutoffTs = new Date(CUTOFF_ISO).getTime();

  const chartData = useMemo(() => {
    const secondBuckets = new Map<number, number>();

    for (const item of stats) {
      const d = new Date(item.datetime);
      const ts = Math.floor(d.getTime() / 1000) * 1000; // snap to second
      secondBuckets.set(ts, (secondBuckets.get(ts) ?? 0) + item.count);
    }

    const sortedSeconds = Array.from(secondBuckets.keys()).sort(
      (a, b) => a - b
    );

    type ChartPoint = {
      timestamp: number;
      datetime: string;
      date: string;
      count: number;
      isNow?: boolean;
    };

    const data: ChartPoint[] = [];

    // Anchor at startDate (count = 0)
    data.push({
      timestamp: startTs,
      datetime: new Date(startTs).toISOString(),
      date: new Date(startTs).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      count: 0,
    });

    // Cumulative series only at seconds we have data
    let runningTotal = 0;

    for (const ts of sortedSeconds) {
      if (ts < startTs || ts > endTs) continue;

      runningTotal += secondBuckets.get(ts)!;

      data.push({
        timestamp: ts,
        datetime: new Date(ts).toISOString(),
        date: new Date(ts).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
        count: runningTotal,
      });
    }

    // Mark the last point as "now" for the pulsing dot (if we have any data beyond the anchor)
    if (data.length > 0) {
      data[data.length - 1].isNow = true;
    }

    return data;
  }, [stats, startTs, endTs]);

  // Evenly spaced ticks across the full x-range
  const xTicks = useMemo(() => {
    const numTicks = 7; // adjust to taste
    const step = (endTs - startTs) / (numTicks - 1);
    return Array.from({ length: numTicks }, (_, i) => startTs + step * i);
  }, [startTs, endTs]);

  return (
    <aside className="w-full flex-shrink-0 lg:w-[35%]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Prediction activity
        </h2>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          Live
        </span>
      </div>
      {error && (
        <p className="mb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
      <div className="rounded-3xl border border-zinc-800 bg-black/70 p-4 backdrop-blur">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center text-zinc-400">
            Loading statistics...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center text-zinc-400">
            No predictions yet.
          </div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-2xl font-semibold text-zinc-50">
                {totalCount}
              </p>
              <p className="text-xs text-zinc-400">Total predictions</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
              >
                <defs>
                  {/* Green area under the cumulative line */}
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>

                  {/* 🔴 horizontal red gradient from cutoff -> end */}
                  <linearGradient id="redCutoff" x1="0" y1="0" x2="1" y2="0">
                    {/* darkest at the left (cutoff) */}
                    <stop offset="0%" stopColor="#ff0444" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#ff4444" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={[startTs, endTs]}
                  ticks={xTicks} // evenly spaced
                  tickFormatter={(ts: number) =>
                    new Date(ts).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="#9ca3af"
                  style={{ fontSize: "10px" }}
                  tick={{ fill: "#9ca3af" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />

                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: "11px" }}
                  tick={{ fill: "#9ca3af" }}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fafafa",
                  }}
                  labelStyle={{ color: "#9ca3af" }}
                  labelFormatter={(value) =>
                    new Date(value as number).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  }
                />

                {/* 🔴 red band from cutoff to end, always present */}
                <ReferenceArea
                  x1={cutoffTs}
                  x2={endTs}
                  fill="url(#redCutoff)"
                />

                {/* main cumulative area/line */}
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#aef3f3"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  connectNulls={false}
                  dot={<NowDot />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </aside>
  );
});
