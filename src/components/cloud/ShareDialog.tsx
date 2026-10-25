"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useCloud } from "@/context/CloudProvider";
import { useExpenses } from "@/context/ExpensesProvider";
import { useToast } from "@/context/ToastProvider";
import { buildSnapshot, encodeSnapshot } from "@/lib/cloud/snapshot";
import { formatCurrency, toISODate } from "@/lib/format";
import type { Expense } from "@/lib/types";

type Scope = "this-month" | "last-month" | "this-year" | "all";
type Expiry = "1d" | "7d" | "30d" | "never";

const SCOPES: Record<Scope, { label: string; filter: (now: Date) => (e: Expense) => boolean; period: (now: Date) => string }> = {
  "this-month": {
    label: "This month",
    filter: (n) => (e) => e.date.startsWith(toISODate(n).slice(0, 7)),
    period: (n) => n.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  },
  "last-month": {
    label: "Last month",
    filter: (n) => (e) => e.date.startsWith(toISODate(new Date(n.getFullYear(), n.getMonth() - 1, 1)).slice(0, 7)),
    period: (n) => new Date(n.getFullYear(), n.getMonth() - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  },
  "this-year": {
    label: "This year",
    filter: (n) => (e) => e.date.startsWith(`${n.getFullYear()}-`),
    period: (n) => String(n.getFullYear()),
  },
  all: { label: "All time", filter: () => () => true, period: () => "All time" },
};

const EXPIRY: Record<Expiry, { label: string; days: number | null }> = {
  "1d": { label: "24 hours", days: 1 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  never: { label: "Never", days: null },
};

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Share a summary" size="lg">
      {open && <ShareBody onClose={onClose} />}
    </Modal>
  );
}

function ShareBody({ onClose }: { onClose: () => void }) {
  const { expenses } = useExpenses();
  const { addShare } = useCloud();
  const { showToast } = useToast();
  const [scope, setScope] = useState<Scope>("this-month");
  const [expiry, setExpiry] = useState<Expiry>("7d");
  const [title, setTitle] = useState("Household spending");
  const [link, setLink] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const rows = expenses.filter(SCOPES[scope].filter(now));
  const total = rows.reduce((t, e) => t + e.amountCents, 0);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    // The QR encoder is only needed here, so load it on demand.
    import("qrcode")
      .then((QR) => QR.toDataURL(link, { errorCorrectionLevel: "L", margin: 1, width: 360 }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const generate = async () => {
    setBusy(true);
    try {
      const days = EXPIRY[expiry].days;
      const expiresAt = days ? new Date(now.getTime() + days * 86_400_000) : null;
      const snapshot = buildSnapshot(rows, { title: title.trim().slice(0, 80) || "Spending summary", period: SCOPES[scope].period(now), now, expiresAt });
      const url = `${window.location.origin}/shared#s=${await encodeSnapshot(snapshot)}`;
      addShare({ title: `${snapshot.title} · ${snapshot.period}`, url, expiresAt: expiresAt?.toISOString() ?? null });
      setLink(url);
    } catch {
      showToast({ tone: "error", message: "Couldn't create the link in this browser." });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast({ tone: "success", message: "Link copied." });
    } catch {
      showToast({ tone: "error", message: "Copy failed. Select the link and copy it manually." });
    }
  };

  const nativeShare = async () => {
    if (!link || !navigator.share) return;
    try {
      await navigator.share({ title, url: link });
    } catch {
      // User dismissed the share sheet.
    }
  };

  if (link) {
    return (
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-sm font-semibold">Your link is ready</p>
            <p className="text-sm text-ink-muted">
              {EXPIRY[expiry].days ? `Expires in ${EXPIRY[expiry].label}.` : "Never expires."} Anyone with the link can view it.
            </p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Share link" className="min-w-0 flex-1 bg-page px-3 py-2 font-mono text-xs text-ink-secondary" />
            <button type="button" onClick={copy} className="border-l border-line bg-surface px-3 text-sm font-medium text-accent-strong hover:bg-page">
              Copy
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.open(link, "_blank", "noopener")}>
              Open preview ↗
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button variant="secondary" onClick={nativeShare}>
                Share…
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setLink(null); setQr(null); }}>
              Create another
            </Button>
          </div>
          <p className="rounded-lg bg-page p-3 text-xs text-ink-muted">
            🔒 The summary is stored <strong>inside the link</strong> (after the #), so it never touches a server. That also means a link
            can&apos;t be revoked once shared, so pick an expiry you&apos;re comfortable with.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-line bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL, nothing for next/image to optimize */}
            {qr ? <img src={qr} alt="QR code for the share link" className="h-full w-full" /> : <span className="text-xs text-ink-muted">Generating QR…</span>}
          </div>
          <p className="text-xs text-ink-muted">Scan to open on a phone</p>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Title</span>
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
      <Choice label="Period" value={scope} onChange={setScope} options={Object.entries(SCOPES).map(([k, v]) => [k as Scope, v.label])} />
      <Choice label="Link expires after" value={expiry} onChange={setExpiry} options={Object.entries(EXPIRY).map(([k, v]) => [k as Expiry, v.label])} />
      <div className="rounded-xl border border-line bg-page p-4 text-sm">
        <p className="font-medium text-ink">
          {rows.length} expenses · {formatCurrency(total)}
        </p>
        <p className="mt-1 text-ink-muted">
          Viewers see totals by category and by month only. Descriptions and individual expenses are never included.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={generate} disabled={busy || rows.length === 0}>
          {busy ? "Creating…" : "Create link"}
        </Button>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink-secondary">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${value === k ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-ink-secondary hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
