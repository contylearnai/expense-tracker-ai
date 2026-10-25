"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeSnapshot, isExpired, type Snapshot } from "@/lib/cloud/snapshot";
import { CATEGORY_COLOR } from "@/lib/category-style";
import { formatCurrency, formatMonthKey } from "@/lib/format";

type State = { kind: "loading" } | { kind: "invalid" } | { kind: "expired"; snap: Snapshot } | { kind: "ok"; snap: Snapshot };

/** Read-only viewer for snapshot links. Everything it shows comes from the URL fragment. */
export default function SharedPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const load = async () => {
      const payload = new URLSearchParams(window.location.hash.slice(1)).get("s") ?? "";
      const snap = await decodeSnapshot(payload);
      setState(!snap ? { kind: "invalid" } : isExpired(snap) ? { kind: "expired", snap } : { kind: "ok", snap });
    };
    void load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  if (state.kind === "loading") return <p className="py-24 text-center text-sm text-ink-muted">Opening shared summary…</p>;
  if (state.kind !== "ok") {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-4xl" aria-hidden>{state.kind === "expired" ? "⌛" : "🔗"}</p>
        <h1 className="mt-4 text-xl font-semibold">{state.kind === "expired" ? "This link has expired" : "This link isn't valid"}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {state.kind === "expired" ? "Ask the person who shared it for a new link." : "It may have been copied incompletely."}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent-strong hover:underline">Go to Spendwise</Link>
      </div>
    );
  }

  const { snap } = state;
  const maxCat = Math.max(...snap.categories.map((c) => c[1]), 1);
  const maxMonth = Math.max(...snap.months.map((m) => m[1]), 1);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Shared summary · read-only</p>
        <h1 className="mt-1 text-2xl font-semibold">{snap.title}</h1>
        <p className="text-sm text-ink-muted">{snap.period}</p>
        <div className="mt-5 flex items-baseline gap-3">
          <p className="text-4xl font-semibold tracking-tight">{formatCurrency(snap.totalCents)}</p>
          <p className="text-sm text-ink-muted">across {snap.count} expenses</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">By category</h2>
        <ul className="space-y-3">
          {[...snap.categories].sort((a, b) => b[1] - a[1]).map(([c, cents, n]) => (
            <li key={c}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[c] }} />
                  {c} <span className="text-xs text-ink-muted">({n})</span>
                </span>
                <span className="tabular-nums">{formatCurrency(cents)}</span>
              </div>
              <div className="h-2.5 rounded-r" style={{ width: `${(cents / maxCat) * 100}%`, background: CATEGORY_COLOR[c] }} />
            </li>
          ))}
        </ul>
      </div>

      {snap.months.length > 1 && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">By month</h2>
          <div className="flex h-40 items-end gap-2">
            {snap.months.map(([m, cents]) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1" title={`${formatMonthKey(m, "long")}: ${formatCurrency(cents)}`}>
                <div className="w-full max-w-6 rounded-t bg-accent" style={{ height: `${Math.max((cents / maxMonth) * 120, 2)}px` }} />
                <span className="text-[10px] text-ink-muted">{formatMonthKey(m)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-ink-muted">
        Shared {new Date(snap.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
        {snap.expiresAt && ` · expires ${new Date(snap.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`} · Made with{" "}
        <Link href="/" className="font-medium text-accent-strong hover:underline">Spendwise</Link>
      </p>
    </div>
  );
}
