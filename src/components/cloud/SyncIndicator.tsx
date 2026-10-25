"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCloud } from "@/context/CloudProvider";
import { timeAgo } from "@/lib/cloud/format";
import { SyncDot } from "./ServiceMark";

/** Header pill: at a glance, is my data backed up somewhere? */
export function SyncIndicator() {
  const { ready, connections, jobs } = useCloud();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  if (!ready) return null;

  const syncing = jobs.some((j) => j.status === "running");
  const last = connections
    .map((c) => c.lastSyncAt)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  const [state, label] = syncing
    ? (["syncing", "Syncing…"] as const)
    : connections.length === 0
      ? (["idle", "Local only"] as const)
      : last
        ? (["synced", `Synced ${timeAgo(last)}`] as const)
        : (["idle", `${connections.length} connected`] as const);

  return (
    <Link
      href="/exports"
      title="Cloud sync status"
      className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink md:inline-flex"
    >
      <SyncDot state={state} />
      {label}
    </Link>
  );
}
