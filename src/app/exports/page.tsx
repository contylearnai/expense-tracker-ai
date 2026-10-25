"use client";

import { useState } from "react";
import { ConnectDialog } from "@/components/cloud/ConnectDialog";
import { ExportComposer } from "@/components/cloud/ExportComposer";
import { ScheduleDialog } from "@/components/cloud/ScheduleDialog";
import { DemoBadge, ServiceMark, SyncDot } from "@/components/cloud/ServiceMark";
import { ShareDialog } from "@/components/cloud/ShareDialog";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { useCloud } from "@/context/CloudProvider";
import { useExpenses } from "@/context/ExpensesProvider";
import { useToast } from "@/context/ToastProvider";
import { DESTINATION_ORDER, DESTINATIONS } from "@/lib/cloud/destinations";
import { formatBytes, formatDateTime, timeAgo, timeUntil } from "@/lib/cloud/format";
import { describeTiming } from "@/lib/cloud/schedule";
import { describeParams, TEMPLATE_ORDER, TEMPLATES } from "@/lib/cloud/templates";
import type { DestinationId, HistoryEntry, Schedule, TemplateId } from "@/lib/cloud/types";

type Tab = "overview" | "schedules" | "history" | "shared";

export default function ExportsPage() {
  const { status, expenses } = useExpenses();
  const cloud = useCloud();
  const [tab, setTab] = useState<Tab>("overview");
  const [composer, setComposer] = useState<{ template: TemplateId; destination: DestinationId } | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<{ editing: Schedule | null; template: TemplateId } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [connecting, setConnecting] = useState<DestinationId | null>(null);

  if (status === "loading" || !cloud.ready) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading exports…" />
      </div>
    );
  }

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const exportsThisMonth = cloud.history.filter((h) => h.createdAt.startsWith(monthPrefix) && h.status === "completed").length;
  const lastBackup = cloud.history.find((h) => h.status === "completed" && h.destination !== "device");
  const activeSchedules = cloud.schedules.filter((s) => s.enabled).length;

  const tabs: Array<[Tab, string, number | null]> = [
    ["overview", "Overview", null],
    ["schedules", "Schedules", cloud.schedules.length],
    ["history", "History", cloud.history.length],
    ["shared", "Shared links", cloud.shares.length],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Share &amp; Export</h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-ink-muted">Send your data where it&apos;s useful, on demand or on a schedule.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShareOpen(true)} disabled={!expenses.length}>
            <span aria-hidden>🔗</span> Share link
          </Button>
          <Button onClick={() => setComposer({ template: "monthly-summary", destination: "device" })} disabled={!expenses.length}>
            New export
          </Button>
        </div>
      </div>

      <Suggestion
        hasExpenses={expenses.length > 0}
        hasBackupSchedule={cloud.schedules.some((s) => s.templateId === "full-backup" && s.enabled)}
        onBackup={() => setScheduleDialog({ editing: null, template: "full-backup" })}
        onTax={() => setComposer({ template: "tax-report", destination: "email" })}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Connected apps" value={`${cloud.connections.length} / ${DESTINATION_ORDER.filter((d) => DESTINATIONS[d].requiresAuth).length}`} />
        <Stat label="Active schedules" value={String(activeSchedules)} />
        <Stat label="Exports this month" value={String(exportsThisMonth)} />
        <Stat label="Last cloud backup" value={lastBackup ? timeAgo(lastBackup.createdAt) : "Never"} warn={!lastBackup && expenses.length > 0} />
      </div>

      <div role="tablist" aria-label="Export sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === id ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {label}
            {count !== null && count > 0 && <span className="rounded-full bg-page px-1.5 text-xs text-ink-muted ring-1 ring-line">{count}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-base font-semibold">Templates</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TEMPLATE_ORDER.map((id) => {
                const t = TEMPLATES[id];
                return (
                  <Card key={id} className="flex flex-col !p-4">
                    <div className="flex items-start justify-between">
                      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-page text-xl">{t.icon}</span>
                      <span className="rounded-md bg-page px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-muted ring-1 ring-line">{t.format}</span>
                    </div>
                    <h3 className="mt-3 font-semibold">{t.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-ink-muted">{t.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-1">
                      {t.includes.map((i) => (
                        <li key={i} className="rounded-full bg-page px-2 py-0.5 text-[11px] text-ink-secondary">{i}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <Button className="flex-1 !px-2" onClick={() => setComposer({ template: id, destination: "device" })} disabled={!expenses.length}>
                        Export
                      </Button>
                      <Button variant="secondary" className="!px-2" onClick={() => setScheduleDialog({ editing: null, template: id })} title="Schedule">
                        ⏱ Schedule
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Connected apps</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DESTINATION_ORDER.filter((d) => DESTINATIONS[d].requiresAuth).map((id) => {
                const d = DESTINATIONS[id];
                const c = cloud.connection(id);
                const syncing = cloud.jobs.some((j) => j.destination === id && j.status === "running");
                return (
                  <div key={id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                    <ServiceMark id={id} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{d.name}</p>
                      {c ? (
                        <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                          <SyncDot state={syncing ? "syncing" : c.lastSyncAt ? "synced" : "idle"} />
                          {syncing ? "Syncing…" : c.lastSyncAt ? `Synced ${timeAgo(c.lastSyncAt)}` : "Connected"} · {c.account}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-ink-muted">{d.blurb}</p>
                      )}
                      {c && id === "google-sheets" && (
                        <label className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-secondary">
                          <input type="checkbox" checked={c.liveSync} onChange={(e) => cloud.setLiveSync(id, e.target.checked)} className="accent-[rgb(var(--accent))]" />
                          Live sync on every change
                        </label>
                      )}
                    </div>
                    {c ? (
                      <Button variant="ghost" className="!px-2 text-xs" onClick={() => cloud.disconnect(id)}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="secondary" className="!px-3 text-xs" onClick={() => setConnecting(id)}>
                        Connect
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === "schedules" && (
        <SchedulesTab onNew={() => setScheduleDialog({ editing: null, template: "full-backup" })} onEdit={(s) => setScheduleDialog({ editing: s, template: s.templateId })} />
      )}
      {tab === "history" && <HistoryTab />}
      {tab === "shared" && <SharedTab onNew={() => setShareOpen(true)} />}

      <ExportComposer
        open={composer !== null}
        onClose={() => setComposer(null)}
        initialTemplate={composer?.template}
        initialDestination={composer?.destination}
      />
      <ScheduleDialog
        open={scheduleDialog !== null}
        onClose={() => setScheduleDialog(null)}
        editing={scheduleDialog?.editing}
        initialTemplate={scheduleDialog?.template}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}

function Suggestion({
  hasExpenses,
  hasBackupSchedule,
  onBackup,
  onTax,
}: {
  hasExpenses: boolean;
  hasBackupSchedule: boolean;
  onBackup: () => void;
  onTax: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !hasExpenses) return null;
  const now = new Date();
  const taxSeason = now.getMonth() < 4;
  if (hasBackupSchedule && !taxSeason) return null;

  const [title, body, cta, action] = !hasBackupSchedule
    ? ["Your expenses only live in this browser", "Clearing site data would erase them. Set up an automatic weekly backup to the cloud in under a minute.", "Set up backups", onBackup]
    : [`Tax season: your ${now.getFullYear() - 1} report is ready`, "Send an itemized Tax Report straight to your accountant.", "Prepare tax report", onTax];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 sm:flex-row sm:items-center">
      <span aria-hidden className="text-2xl">✨</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-secondary">{body}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={action}>{cta}</Button>
        <Button variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss suggestion">
          Later
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${warn ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function SchedulesTab({ onNew, onEdit }: { onNew: () => void; onEdit: (s: Schedule) => void }) {
  const cloud = useCloud();
  if (!cloud.schedules.length) {
    return (
      <EmptyState
        title="No recurring exports yet"
        description="Schedule a weekly backup or a monthly summary, and Spendwise will send it for you."
        action={<Button onClick={onNew}>Create schedule</Button>}
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onNew}>
          + New schedule
        </Button>
      </div>
      {cloud.schedules.map((s) => {
        const connected = !!cloud.connection(s.destination);
        return (
          <div key={s.id} className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center ${s.enabled ? "" : "opacity-70"}`}>
            <Switch
              on={s.enabled}
              disabled={!connected}
              label={`${s.enabled ? "Pause" : "Resume"} ${TEMPLATES[s.templateId].name} schedule`}
              onChange={() => cloud.toggleSchedule(s.id)}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                <span aria-hidden>{TEMPLATES[s.templateId].icon}</span>
                {TEMPLATES[s.templateId].name}
                <span className="text-ink-muted">→</span>
                <ServiceMark id={s.destination} size="sm" />
                {DESTINATIONS[s.destination].name}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {describeTiming(s)} ·{" "}
                {!connected
                  ? <span className="text-danger">Paused: {DESTINATIONS[s.destination].name} disconnected</span>
                  : s.enabled
                    ? `Next ${timeUntil(s.nextRunAt)} (${formatDateTime(s.nextRunAt)})`
                    : "Paused"}
                {s.lastRunAt && ` · Last ran ${timeAgo(s.lastRunAt)}`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                className="!px-2.5 text-xs"
                disabled={!connected}
                onClick={() => void cloud.runExport({ templateId: s.templateId, params: {}, destination: s.destination, target: "" }).catch(() => undefined)}
              >
                Run now
              </Button>
              <Button variant="ghost" className="!px-2.5 text-xs" onClick={() => onEdit(s)}>
                Edit
              </Button>
              <Button variant="ghost" className="!px-2.5 text-xs hover:!text-danger" onClick={() => cloud.deleteSchedule(s.id)}>
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Switch({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-accent" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

const TRIGGER_LABEL: Record<HistoryEntry["trigger"], string> = { manual: "Manual", schedule: "Scheduled", "live-sync": "Live sync" };

function HistoryTab() {
  const cloud = useCloud();
  const { expenses } = useExpenses();
  const { showToast } = useToast();
  if (!cloud.history.length) {
    return <EmptyState title="No exports yet" description="Every export you run, manual or scheduled, is logged here." />;
  }

  const redownload = (h: HistoryEntry) => {
    const a = TEMPLATES[h.templateId].build(expenses, h.params, new Date());
    const blob = new Blob([a.mimeType.startsWith("text/csv") ? "﻿" + a.content : a.content], { type: a.mimeType });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: a.filename }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    showToast({ tone: "info", message: `Re-generated ${a.filename} from your current data.` });
  };

  return (
    <Card className="!p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm text-ink-secondary">{cloud.history.length} exports</p>
        <Button variant="ghost" className="!px-2 text-xs" onClick={cloud.clearHistory}>
          Clear history
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-muted">
            <tr>
              <th className="px-5 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Export</th>
              <th className="px-3 py-2 font-medium">Destination</th>
              <th className="px-3 py-2 text-right font-medium">Records</th>
              <th className="px-3 py-2 text-right font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cloud.history.map((h) => (
              <tr key={h.id}>
                <td className="whitespace-nowrap px-5 py-3 text-ink-secondary" title={new Date(h.createdAt).toLocaleString()}>
                  {formatDateTime(h.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{TEMPLATES[h.templateId].name}</p>
                  <p className="text-xs text-ink-muted">
                    {describeParams(h.templateId, h.params)} · <span className="rounded bg-page px-1">{TRIGGER_LABEL[h.trigger]}</span>
                  </p>
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <ServiceMark id={h.destination} size="sm" />
                    <span className="min-w-0">
                      <span className="block">{DESTINATIONS[h.destination].name}</span>
                      <span className="block max-w-[14rem] truncate text-xs text-ink-muted">{h.target}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{h.records}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{formatBytes(h.bytes)}</td>
                <td className="px-3 py-3">
                  {h.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">✓ Delivered</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">! No data</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  {h.status === "completed" && (
                    <button type="button" onClick={() => redownload(h)} className="text-xs font-medium text-accent-strong hover:underline">
                      Download
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SharedTab({ onNew }: { onNew: () => void }) {
  const cloud = useCloud();
  const { showToast } = useToast();
  if (!cloud.shares.length) {
    return (
      <EmptyState
        title="No shared links"
        description="Share a read-only spending summary with a partner, roommate or accountant. It comes with a QR code."
        action={<Button onClick={onNew}>Create share link</Button>}
      />
    );
  }
  const now = Date.now();
  return (
    <div className="space-y-3">
      {cloud.shares.map((s) => {
        const expired = !!s.expiresAt && new Date(s.expiresAt).getTime() < now;
        return (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-page text-lg">🔗</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.title}</p>
              <p className="text-xs text-ink-muted">
                Created {timeAgo(s.createdAt)} ·{" "}
                {expired ? <span className="font-medium text-danger">Expired</span> : s.expiresAt ? `Expires ${timeUntil(s.expiresAt)}` : "Never expires"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                className="!px-2.5 text-xs"
                disabled={expired}
                onClick={() =>
                  navigator.clipboard.writeText(s.url).then(
                    () => showToast({ tone: "success", message: "Link copied." }),
                    () => showToast({ tone: "error", message: "Copy failed." }),
                  )
                }
              >
                Copy link
              </Button>
              <Button variant="ghost" className="!px-2.5 text-xs" onClick={() => window.open(s.url, "_blank", "noopener")}>
                Open ↗
              </Button>
              <Button variant="ghost" className="!px-2.5 text-xs" onClick={() => cloud.removeShare(s.id)} title="Removes it from this list. The link keeps working until it expires.">
                Remove
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
