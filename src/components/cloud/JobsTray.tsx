"use client";

import { useCloud } from "@/context/CloudProvider";
import { ServiceMark } from "./ServiceMark";

/** Background activity, like an upload manager: exports keep running while you navigate. */
export function JobsTray() {
  const { jobs } = useCloud();
  if (!jobs.length) return null;
  const running = jobs.filter((j) => j.status === "running").length;
  return (
    <aside
      aria-label="Background exports"
      className="fixed bottom-4 left-4 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
    >
      <p className="border-b border-line bg-page px-4 py-2 text-xs font-semibold text-ink-secondary" aria-live="polite">
        {running ? `${running} export${running === 1 ? "" : "s"} in progress` : "Exports finished"}
      </p>
      <ul className="max-h-64 divide-y divide-line overflow-y-auto">
        {jobs.map((j) => (
          <li key={j.id} className="flex items-center gap-3 px-4 py-3">
            <ServiceMark id={j.destination} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{j.title}</p>
              <p className={`truncate text-xs ${j.status === "failed" ? "text-danger" : "text-ink-muted"}`}>{j.stage}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(j.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${j.status === "failed" ? "bg-danger" : j.status === "done" ? "bg-success" : "bg-accent"}`}
                  style={{ width: `${Math.max(j.progress * 100, 6)}%` }}
                />
              </div>
            </div>
            <span aria-hidden className="w-4 text-center text-sm">
              {j.status === "done" ? <span className="text-success">✓</span> : j.status === "failed" ? <span className="text-danger">!</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
