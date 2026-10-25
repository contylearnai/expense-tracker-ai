"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useCloud } from "@/context/CloudProvider";
import { useToast } from "@/context/ToastProvider";
import { DESTINATION_ORDER, DESTINATIONS } from "@/lib/cloud/destinations";
import { formatDateTime } from "@/lib/cloud/format";
import { computeNextRun, describeTiming, WEEKDAYS } from "@/lib/cloud/schedule";
import { TEMPLATE_ORDER, TEMPLATES } from "@/lib/cloud/templates";
import type { DestinationId, Frequency, Schedule, TemplateId } from "@/lib/cloud/types";
import { ConnectDialog } from "./ConnectDialog";
import { ServiceMark } from "./ServiceMark";

const SCHEDULABLE = DESTINATION_ORDER.filter((d) => DESTINATIONS[d].requiresAuth);
const selectClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

export function ScheduleDialog({
  open,
  onClose,
  editing,
  initialTemplate = "full-backup",
}: {
  open: boolean;
  onClose: () => void;
  editing?: Schedule | null;
  initialTemplate?: TemplateId;
}) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit schedule" : "Schedule recurring export"} size="lg">
      {open && <ScheduleForm key={editing?.id ?? "new"} editing={editing ?? null} initialTemplate={initialTemplate} onClose={onClose} />}
    </Modal>
  );
}

function ScheduleForm({ editing, initialTemplate, onClose }: { editing: Schedule | null; initialTemplate: TemplateId; onClose: () => void }) {
  const cloud = useCloud();
  const { showToast } = useToast();
  const [templateId, setTemplateId] = useState<TemplateId>(editing?.templateId ?? initialTemplate);
  const [destination, setDestination] = useState<DestinationId>(
    editing?.destination ?? SCHEDULABLE.find((d) => cloud.connection(d)) ?? "dropbox",
  );
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? "weekly");
  const [weekday, setWeekday] = useState(editing?.weekday ?? 1);
  const [monthDay, setMonthDay] = useState(editing?.monthDay ?? 1);
  const [time, setTime] = useState(editing?.time ?? "09:00");
  const [connecting, setConnecting] = useState<DestinationId | null>(null);

  const timing = { frequency, weekday, monthDay, time: time || "09:00" };
  const connected = !!cloud.connection(destination);

  const save = () => {
    cloud.saveSchedule({ id: editing?.id, templateId, destination, ...timing, enabled: true });
    showToast({ tone: "success", message: `${TEMPLATES[templateId].name} scheduled: ${describeTiming(timing).toLowerCase()}.` });
    onClose();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-secondary">What</span>
          <select className={selectClass} value={templateId} onChange={(e) => setTemplateId(e.target.value as TemplateId)}>
            {TEMPLATE_ORDER.map((id) => (
              <option key={id} value={id}>
                {TEMPLATES[id].icon} {TEMPLATES[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Where</span>
          <select className={selectClass} value={destination} onChange={(e) => setDestination(e.target.value as DestinationId)}>
            {SCHEDULABLE.map((id) => (
              <option key={id} value={id}>
                {DESTINATIONS[id].name}
                {cloud.connection(id) ? "" : " (not connected)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-secondary">How often</span>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl border border-line p-1">
          {(["daily", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={frequency === f}
              onClick={() => setFrequency(f)}
              className={`rounded-lg py-1.5 text-sm font-medium capitalize ${frequency === f ? "bg-accent text-white" : "text-ink-secondary hover:text-ink"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {frequency === "weekly" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Day</span>
            <select className={selectClass} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
        {frequency === "monthly" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Day of month</span>
            <select className={selectClass} value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Time</span>
          <input type="time" className={selectClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-line bg-page p-4">
        <ServiceMark id={destination} />
        <div className="text-sm">
          <p className="font-medium text-ink">
            {describeTiming(timing)} → {DESTINATIONS[destination].name}
          </p>
          <p className="mt-0.5 text-ink-muted">
            Next run: {formatDateTime(computeNextRun(timing, new Date()).toISOString())} · Runs while Spendwise is open and catches up on
            missed runs when you return.
          </p>
        </div>
      </div>

      {!connected && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm">
          <span className="flex-1 text-ink-secondary">{DESTINATIONS[destination].name} isn&apos;t connected yet.</span>
          <Button variant="secondary" onClick={() => setConnecting(destination)}>
            Connect
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!connected}>
          {editing ? "Save changes" : "Create schedule"}
        </Button>
      </div>
      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}
