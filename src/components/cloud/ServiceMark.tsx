import { DESTINATIONS } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";

export function ServiceMark({ id, size = "md" }: { id: DestinationId; size?: "sm" | "md" | "lg" }) {
  const d = DESTINATIONS[id];
  const dims = size === "sm" ? "h-6 w-6 text-[11px] rounded-md" : size === "lg" ? "h-12 w-12 text-lg rounded-xl" : "h-9 w-9 text-sm rounded-lg";
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center font-bold text-white ${dims}`} style={{ background: d.tint }}>
      {d.mark}
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Integrations are simulated in this demo. Nothing leaves your browser."
      className={`inline-flex items-center gap-1 rounded-full border border-dashed border-ink-muted/50 px-2 py-0.5 text-[11px] font-medium text-ink-muted ${className}`}
    >
      Simulated
    </span>
  );
}

export type SyncState = "synced" | "syncing" | "idle" | "error";

export function SyncDot({ state }: { state: SyncState }) {
  const cls = {
    synced: "bg-success",
    syncing: "bg-accent animate-pulse",
    idle: "bg-ink-muted/50",
    error: "bg-danger",
  }[state];
  return <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}
