"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useCloud } from "@/context/CloudProvider";
import { useToast } from "@/context/ToastProvider";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";
import { DemoBadge, ServiceMark } from "./ServiceMark";

/** A stand-in for an OAuth consent screen, so the flow feels like the real thing. */
export function ConnectDialog({
  id,
  onClose,
  onConnected,
}: {
  id: DestinationId | null;
  onClose: () => void;
  onConnected?: (id: DestinationId) => void;
}) {
  return (
    <Modal open={id !== null} onClose={onClose} title="Connect an app">
      {id && <ConnectBody key={id} id={id} onClose={onClose} onConnected={onConnected} />}
    </Modal>
  );
}

function ConnectBody({ id, onClose, onConnected }: { id: DestinationId; onClose: () => void; onConnected?: (id: DestinationId) => void }) {
  const { connect } = useCloud();
  const { showToast } = useToast();
  const d = DESTINATIONS[id];
  const [account, setAccount] = useState("you@example.com");
  const [phase, setPhase] = useState<"consent" | "authorizing">("consent");

  const allow = async () => {
    setPhase("authorizing");
    await new Promise((r) => setTimeout(r, 1200));
    connect(id, account.trim() || "you@example.com");
    showToast({ tone: "success", message: `${d.name} connected.` });
    onConnected?.(id);
    onClose();
  };

  if (phase === "authorizing") {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">$</span>
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
          <ServiceMark id={id} size="lg" />
        </div>
        <p className="mt-4 text-sm font-medium">Waiting for {d.name} to authorize…</p>
        <p className="mt-1 text-xs text-ink-muted">You&apos;d normally see {d.name}&apos;s sign-in page in a pop-up.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <ServiceMark id={id} size="lg" />
        <div>
          <p className="font-semibold">{d.name}</p>
          <p className="text-sm text-ink-muted">{d.blurb}</p>
        </div>
        <DemoBadge className="ml-auto" />
      </div>

      <div className="mt-5 rounded-xl border border-line bg-page p-4">
        <p className="text-sm font-medium">Spendwise is requesting permission to:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-secondary">
          {d.scopes.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="text-success">✓</span>
              {s}
            </li>
          ))}
          <li className="flex gap-2">
            <span aria-hidden className="text-success">✓</span>
            See your account email address
          </li>
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Spendwise only gets access to what it creates. You can disconnect at any time from the Exports page.
        </p>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Account</span>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={allow}>Allow access</Button>
      </div>
    </div>
  );
}
