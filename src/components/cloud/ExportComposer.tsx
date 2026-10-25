"use client";

import { useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useCloud } from "@/context/CloudProvider";
import { useExpenses } from "@/context/ExpensesProvider";
import { DESTINATION_ORDER, DESTINATIONS } from "@/lib/cloud/destinations";
import { formatBytes, parseRecipients } from "@/lib/cloud/format";
import { defaultParams, describeParams, TEMPLATE_ORDER, TEMPLATES } from "@/lib/cloud/templates";
import type { DestinationId, ExportArtifact, TemplateId, TemplateParams } from "@/lib/cloud/types";
import { formatMonthKey } from "@/lib/format";
import { ConnectDialog } from "./ConnectDialog";
import { DemoBadge, ServiceMark } from "./ServiceMark";
import { SheetsMock } from "./SheetsMock";

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

export function ExportComposer({
  open,
  onClose,
  initialTemplate = "monthly-summary",
  initialDestination = "device",
}: {
  open: boolean;
  onClose: () => void;
  initialTemplate?: TemplateId;
  initialDestination?: DestinationId;
}) {
  return (
    <Modal open={open} onClose={onClose} title="New export" size="xl">
      {open && <ComposerBody initialTemplate={initialTemplate} initialDestination={initialDestination} onClose={onClose} />}
    </Modal>
  );
}

function ComposerBody({
  initialTemplate,
  initialDestination,
  onClose,
}: {
  initialTemplate: TemplateId;
  initialDestination: DestinationId;
  onClose: () => void;
}) {
  const { expenses } = useExpenses();
  const cloud = useCloud();
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate);
  const [params, setParams] = useState<TemplateParams>(() => defaultParams(initialTemplate));
  const [destination, setDestination] = useState<DestinationId>(initialDestination);
  const [target, setTarget] = useState(DESTINATIONS[initialDestination].defaultTarget);
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [sheetMode, setSheetMode] = useState<"new" | "append">("new");
  // Start from the connection's current setting so re-exporting never silently turns live sync off.
  const [liveSync, setLiveSync] = useState(() => !!cloud.connection("google-sheets")?.liveSync);
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [touched, setTouched] = useState(false);

  const template = TEMPLATES[templateId];
  const dest = DESTINATIONS[destination];
  const artifact = useMemo(() => template.build(expenses, params, new Date()), [template, expenses, params]);
  const connected = !dest.requiresAuth || !!cloud.connection(destination);
  const { valid, invalid } = parseRecipients(recipients);
  const emailError = destination === "email" && (invalid.length ? `Invalid: ${invalid.join(", ")}` : !valid.length ? "Add at least one recipient." : null);
  const subject = `Spendwise · ${template.name} · ${describeParams(templateId, params)}`;

  const years = useMemo(() => {
    const set = new Set(expenses.map((e) => Number(e.date.slice(0, 4))));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [expenses]);
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const chooseTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setParams(defaultParams(id));
  };
  const chooseDestination = (id: DestinationId) => {
    setDestination(id);
    setTarget(DESTINATIONS[id].defaultTarget);
  };

  const run = () => {
    setTouched(true);
    if (!connected || emailError || artifact.records === 0) return;
    if (destination === "google-sheets") cloud.setLiveSync("google-sheets", liveSync);
    void cloud.runExport({
      templateId,
      params,
      destination,
      target: destination === "email" ? valid.join(", ") : destination === "google-sheets" ? `${target} (${sheetMode === "new" ? "new" : "appended"})` : target,
    });
    onClose();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Left: configure */}
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Template</legend>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_ORDER.map((id) => {
              const t = TEMPLATES[id];
              const on = id === templateId;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseTemplate(id)}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${on ? "border-accent bg-accent/[0.07] ring-1 ring-accent" : "border-line hover:border-ink-muted"}`}
                >
                  <span aria-hidden className="text-lg leading-none">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{t.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{t.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {template.params === "year" && (
            <label className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-ink-secondary">Tax year</span>
              <select className={`${inputClass} w-auto`} value={params.year} onChange={(e) => setParams({ year: Number(e.target.value) })}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          )}
          {template.params === "month" && (
            <label className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-ink-secondary">Month</span>
              <select className={`${inputClass} w-auto`} value={params.month} onChange={(e) => setParams({ month: e.target.value })}>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthKey(m, "long")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
            Send to <DemoBadge />
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {DESTINATION_ORDER.map((id) => {
              const d = DESTINATIONS[id];
              const on = id === destination;
              const isConnected = !d.requiresAuth || !!cloud.connection(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseDestination(id)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition-colors ${on ? "border-accent bg-accent/[0.07] ring-1 ring-accent" : "border-line hover:border-ink-muted"}`}
                >
                  <ServiceMark id={id} />
                  <span className="text-[11px] font-medium leading-tight text-ink">{d.name}</span>
                  {d.requiresAuth && (
                    <span
                      className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-line"}`}
                      title={isConnected ? "Connected" : "Not connected"}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {!connected ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-page p-4">
            <ServiceMark id={destination} />
            <p className="flex-1 text-sm text-ink-secondary">Connect {dest.name} to send exports there.</p>
            <Button onClick={() => setConnecting(destination)}>Connect</Button>
          </div>
        ) : destination === "email" ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-secondary">To</span>
              <input
                className={inputClass}
                placeholder="accountant@example.com, partner@example.com"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                aria-invalid={touched && !!emailError}
              />
              {touched && emailError && <span className="mt-1 block text-xs font-medium text-danger">{emailError}</span>}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-secondary">Message (optional)</span>
              <textarea className={`${inputClass} h-20 resize-none`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Here's this month's summary." />
            </label>
          </div>
        ) : destination === "google-sheets" ? (
          <div className="space-y-3">
            <div className="flex gap-2 text-sm">
              {(["new", "append"] as const).map((m) => (
                <label key={m} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${sheetMode === m ? "border-accent" : "border-line"}`}>
                  <input type="radio" name="sheet-mode" checked={sheetMode === m} onChange={() => setSheetMode(m)} className="accent-[rgb(var(--accent))]" />
                  {m === "new" ? "Create new spreadsheet" : "Append to existing"}
                </label>
              ))}
            </div>
            <input className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Spreadsheet name" />
            <label className="flex items-start gap-2.5 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" checked={liveSync} onChange={(e) => setLiveSync(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent))]" />
              <span>
                <span className="font-medium text-ink">Keep in live sync</span>
                <span className="block text-xs text-ink-muted">Every time you add or edit an expense, the sheet updates in the background.</span>
              </span>
            </label>
          </div>
        ) : destination !== "device" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink-secondary">{dest.targetLabel}</span>
            <input className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} />
            <span className="mt-1 block text-xs text-ink-muted">Connected as {cloud.connection(destination)?.account}</span>
          </label>
        ) : null}
      </div>

      {/* Right: live destination preview */}
      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Preview</h3>
          <span className="text-xs text-ink-muted">
            {artifact.records} records · {formatBytes(new Blob([artifact.content]).size)} · {template.format}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {artifact.records === 0 ? (
            <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
              No expenses for {describeParams(templateId, params)}. Pick another period.
            </div>
          ) : (
            <DestinationPreview
              destination={destination}
              artifact={artifact}
              target={target}
              subject={subject}
              recipients={valid}
              message={message}
              summary={`${template.name} · ${describeParams(templateId, params)}`}
            />
          )}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-xs text-ink-muted sm:mr-auto">Runs in the background, so you can keep working.</p>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className="whitespace-nowrap" onClick={run} disabled={!connected || artifact.records === 0}>
            {destination === "device" ? "Download" : destination === "email" ? "Send email" : `Send to ${dest.name}`}
          </Button>
        </div>
      </div>

      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}

function DestinationPreview({
  destination,
  artifact,
  target,
  subject,
  recipients,
  message,
  summary,
}: {
  destination: DestinationId;
  artifact: ExportArtifact;
  target: string;
  subject: string;
  recipients: string[];
  message: string;
  summary: string;
}) {
  if (destination === "google-sheets") return <SheetsMock artifact={artifact} title={target || "Untitled spreadsheet"} />;

  if (destination === "email") {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface text-sm">
        <div className="space-y-1 border-b border-line bg-page px-4 py-3 text-xs">
          <p><span className="inline-block w-14 text-ink-muted">From</span>Spendwise &lt;reports@spendwise.app&gt;</p>
          <p className="truncate"><span className="inline-block w-14 text-ink-muted">To</span>{recipients.join(", ") || <span className="text-ink-muted">—</span>}</p>
          <p className="truncate"><span className="inline-block w-14 text-ink-muted">Subject</span><span className="font-medium">{subject}</span></p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="whitespace-pre-wrap text-ink-secondary">{message || "Hi! Your requested expense export is attached."}</p>
          <MiniTable artifact={artifact} rows={4} />
          <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <span aria-hidden className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-secondary">
              {artifact.filename.split(".").pop()?.toUpperCase()}
            </span>
            <span className="truncate font-mono text-xs">{artifact.filename}</span>
            <span className="ml-auto text-xs text-ink-muted">{formatBytes(new Blob([artifact.content]).size)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (destination === "slack") {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-sm">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white">$</span>
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-bold">Spendwise</span> <span className="rounded bg-page px-1 text-[10px] font-semibold text-ink-muted">APP</span>{" "}
              <span className="text-xs text-ink-muted">in {target}</span>
            </p>
            <div className="mt-2 border-l-4 border-accent pl-3">
              <p className="font-semibold">{summary}</p>
              <MiniTable artifact={artifact} rows={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (destination === "device") return <MiniTable artifact={artifact} rows={10} bordered />;

  // Cloud folders & Notion: show where the file lands.
  const crumbs = target.split("/").filter(Boolean);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface text-sm">
      <div className="flex items-center gap-1.5 border-b border-line bg-page px-4 py-2.5 text-xs text-ink-secondary">
        <ServiceMark id={destination} size="sm" />
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-muted">›</span>}
            {c}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-line">
        <li className="flex items-center gap-3 bg-accent/[0.06] px-4 py-2.5">
          <span aria-hidden>📄</span>
          <span className="flex-1 truncate font-mono text-xs font-medium">{artifact.filename}</span>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-strong">NEW</span>
        </li>
        <li className="flex items-center gap-3 px-4 py-2.5 text-ink-muted">
          <span aria-hidden>📄</span>
          <span className="flex-1 truncate font-mono text-xs">spendwise-backup-previous.json</span>
        </li>
      </ul>
      <div className="border-t border-line p-3">
        <MiniTable artifact={artifact} rows={4} />
      </div>
    </div>
  );
}

function MiniTable({ artifact, rows, bordered }: { artifact: ExportArtifact; rows: number; bordered?: boolean }) {
  const cols = artifact.table.columns.slice(0, 5);
  return (
    <div className={`overflow-x-auto ${bordered ? "rounded-xl border border-line" : ""}`}>
      <table className="w-full text-left text-xs">
        <thead className="text-ink-muted">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {artifact.table.rows.slice(0, rows).map((r, i) => (
            <tr key={i} className={/TOTAL|subtotal/.test(r[0]) ? "font-semibold" : ""}>
              {cols.map((_, ci) => (
                <td key={ci} className="max-w-[9rem] truncate whitespace-nowrap px-2 py-1.5 tabular-nums text-ink-secondary">{r[ci]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {artifact.table.rows.length > rows && <p className="px-2 py-1 text-[11px] text-ink-muted">+ {artifact.table.rows.length - rows} more rows</p>}
    </div>
  );
}
