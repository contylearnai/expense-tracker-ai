"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { computeNextRun } from "@/lib/cloud/schedule";
import { EMPTY_CLOUD, loadCloud, saveCloud, type CloudData } from "@/lib/cloud/storage";
import { defaultParams, describeParams, TEMPLATES } from "@/lib/cloud/templates";
import type {
  Connection,
  DestinationId,
  HistoryEntry,
  Job,
  Schedule,
  ShareLink,
  TemplateId,
  TemplateParams,
  Trigger,
} from "@/lib/cloud/types";
import { createId } from "@/lib/storage";
import { useExpenses } from "./ExpensesProvider";
import { useToast } from "./ToastProvider";

export interface ExportRequest {
  templateId: TemplateId;
  params: TemplateParams;
  destination: DestinationId;
  target: string;
  trigger?: Trigger;
}

interface CloudContextValue extends CloudData {
  ready: boolean;
  jobs: Job[];
  connection: (id: DestinationId) => Connection | undefined;
  connect: (id: DestinationId, account: string) => void;
  disconnect: (id: DestinationId) => void;
  setLiveSync: (id: DestinationId, on: boolean) => void;
  runExport: (req: ExportRequest) => Promise<HistoryEntry>;
  saveSchedule: (s: Omit<Schedule, "id" | "createdAt" | "lastRunAt" | "nextRunAt"> & { id?: string }) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  addShare: (share: Omit<ShareLink, "id" | "createdAt">) => ShareLink;
  removeShare: (id: string) => void;
  clearHistory: () => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SCHEDULER_TICK_MS = 30_000;
const LIVE_SYNC_DEBOUNCE_MS = 1500;

function saveBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([mimeType.startsWith("text/csv") ? "﻿" + content : content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses, status } = useExpenses();
  const { showToast } = useToast();
  const [data, setData] = useState<CloudData>(EMPTY_CLOUD);
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Refs let long-running async jobs read the latest state without stale closures.
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    setData(loadCloud());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCloud(data);
  }, [data, ready]);

  const update = useCallback((fn: (d: CloudData) => CloudData) => setData((d) => fn(d)), []);

  const patchJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const runExport = useCallback(
    async ({ templateId, params, destination, target, trigger = "manual" }: ExportRequest) => {
      const template = TEMPLATES[templateId];
      const dest = DESTINATIONS[destination];
      const jobId = createId();
      const title = `${template.name} → ${dest.name}`;
      setJobs((list) => [...list, { id: jobId, title, destination, stage: "Queued", progress: 0, status: "running" }]);

      const artifact = template.build(expensesRef.current, params, new Date());
      const stages = dest.stages;
      for (let i = 0; i < stages.length; i++) {
        const label = stages[i] === "Writing cells" ? `Writing ${artifact.table.rows.length} rows` : stages[i];
        patchJob(jobId, { stage: label, progress: i / stages.length });
        await sleep(450 + Math.random() * 450);
      }

      const ok = artifact.records > 0;
      const entry: HistoryEntry = {
        id: createId(),
        createdAt: new Date().toISOString(),
        templateId,
        params,
        destination,
        target: target || dest.defaultTarget,
        filename: artifact.filename,
        records: artifact.records,
        bytes: new Blob([artifact.content]).size,
        status: ok ? "completed" : "failed",
        trigger,
      };

      if (ok && destination === "device") saveBlob(artifact.content, artifact.mimeType, artifact.filename);

      patchJob(jobId, {
        stage: ok ? "Done" : `No expenses for ${describeParams(templateId, params)}`,
        progress: 1,
        status: ok ? "done" : "failed",
      });
      setTimeout(() => setJobs((list) => list.filter((j) => j.id !== jobId)), ok ? 4000 : 8000);

      update((d) => ({
        ...d,
        history: [entry, ...d.history],
        connections: ok
          ? d.connections.map((c) => (c.id === destination ? { ...c, lastSyncAt: entry.createdAt } : c))
          : d.connections,
      }));

      if (trigger === "manual") {
        showToast(
          ok
            ? { tone: "success", message: `${template.name} delivered to ${dest.name}${destination === "device" ? "" : " (simulated)"}.` }
            : { tone: "error", message: `Nothing to export for ${describeParams(templateId, params)}.` },
        );
      }
      return entry;
    },
    [patchJob, showToast, update],
  );

  // Jobs live in this tab only, so warn before a reload or close would cut one off.
  const running = jobs.some((j) => j.status === "running");
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  // Scheduler: runs due backups while the app is open and catches up on missed ones.
  // `fired` dedupes by schedule+slot so overlapping ticks (or StrictMode) never double-run.
  const fired = useRef(new Set<string>());
  useEffect(() => {
    if (!ready || status !== "ready") return;
    const tick = () => {
      const now = new Date();
      for (const s of dataRef.current.schedules) {
        if (!s.enabled || new Date(s.nextRunAt) > now) continue;
        const slot = `${s.id}@${s.nextRunAt}`;
        if (fired.current.has(slot)) continue;
        fired.current.add(slot);
        const next = computeNextRun(s, now).toISOString();
        update((d) => ({
          ...d,
          schedules: d.schedules.map((x) => (x.id === s.id ? { ...x, lastRunAt: now.toISOString(), nextRunAt: next } : x)),
        }));
        void runExport({
          templateId: s.templateId,
          params: defaultParams(s.templateId, now),
          destination: s.destination,
          target: "",
          trigger: "schedule",
        }).then((entry) =>
          showToast({
            tone: entry.status === "completed" ? "info" : "error",
            message: `Scheduled ${TEMPLATES[s.templateId].name} ${entry.status === "completed" ? "ran" : "had nothing to export"} → ${DESTINATIONS[s.destination].name}.`,
          }),
        );
      }
    };
    tick();
    const timer = window.setInterval(tick, SCHEDULER_TICK_MS);
    return () => window.clearInterval(timer);
  }, [ready, status, runExport, update, showToast]);

  // Live sync: debounce expense edits into a background push for live-synced connections.
  const lastSyncedExpenses = useRef<typeof expenses | null>(null);
  useEffect(() => {
    if (!ready || status !== "ready") return;
    if (lastSyncedExpenses.current === null) {
      lastSyncedExpenses.current = expenses;
      return;
    }
    if (lastSyncedExpenses.current === expenses) return;
    const live = dataRef.current.connections.filter((c) => c.liveSync);
    if (!live.length) {
      lastSyncedExpenses.current = expenses;
      return;
    }
    const timer = window.setTimeout(() => {
      lastSyncedExpenses.current = expenses;
      for (const c of live) {
        void runExport({
          templateId: "full-backup",
          params: {},
          destination: c.id,
          target: DESTINATIONS[c.id].defaultTarget,
          trigger: "live-sync",
        });
      }
    }, LIVE_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [expenses, ready, status, runExport]);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...data,
      ready,
      jobs,
      connection: (id) => data.connections.find((c) => c.id === id),
      connect: (id, account) =>
        update((d) => ({
          ...d,
          connections: [
            ...d.connections.filter((c) => c.id !== id),
            { id, account, connectedAt: new Date().toISOString(), lastSyncAt: null, liveSync: false },
          ],
        })),
      disconnect: (id) =>
        update((d) => ({
          ...d,
          connections: d.connections.filter((c) => c.id !== id),
          // Schedules can't deliver to a disconnected service; pause rather than delete them.
          schedules: d.schedules.map((s) => (s.destination === id ? { ...s, enabled: false } : s)),
        })),
      setLiveSync: (id, on) =>
        update((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? { ...c, liveSync: on } : c)) })),
      runExport,
      saveSchedule: (input) =>
        update((d) => {
          const now = new Date();
          const existing = input.id ? d.schedules.find((s) => s.id === input.id) : undefined;
          const schedule: Schedule = {
            ...input,
            id: existing?.id ?? createId(),
            createdAt: existing?.createdAt ?? now.toISOString(),
            lastRunAt: existing?.lastRunAt ?? null,
            nextRunAt: computeNextRun(input, now).toISOString(),
          };
          return {
            ...d,
            schedules: existing ? d.schedules.map((s) => (s.id === schedule.id ? schedule : s)) : [...d.schedules, schedule],
          };
        }),
      toggleSchedule: (id) =>
        update((d) => ({
          ...d,
          schedules: d.schedules.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled, nextRunAt: computeNextRun(s, new Date()).toISOString() } : s,
          ),
        })),
      deleteSchedule: (id) => update((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) })),
      addShare: (input) => {
        const share: ShareLink = { ...input, id: createId(), createdAt: new Date().toISOString() };
        update((d) => ({ ...d, shares: [share, ...d.shares] }));
        return share;
      },
      removeShare: (id) => update((d) => ({ ...d, shares: d.shares.filter((s) => s.id !== id) })),
      clearHistory: () => update((d) => ({ ...d, history: [] })),
    }),
    [data, ready, jobs, update, runExport],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used inside <CloudProvider>");
  return ctx;
}
