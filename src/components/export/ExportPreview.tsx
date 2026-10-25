"use client";

import { useEffect, useState } from "react";
import { buildCsvText } from "@/lib/export/formats/csv";
import { buildJsonDocument } from "@/lib/export/formats/json";
import type { ExportContext, ExportFormatSpec } from "@/lib/export/types";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { CategoryBadge } from "../ui";

const PREVIEW_ROWS = 8;

export function ExportPreview({ rows, spec, ctx }: { rows: Expense[]; spec: ExportFormatSpec; ctx: ExportContext }) {
  const [view, setView] = useState<"table" | "raw">("table");
  useEffect(() => {
    if (!spec.textPreview) setView("table");
  }, [spec.textPreview]);

  const shown = rows.slice(0, PREVIEW_ROWS);
  const more = rows.length - shown.length;

  const raw =
    view === "raw"
      ? spec.id === "csv"
        ? buildCsvText(shown)
        : JSON.stringify({ ...buildJsonDocument(shown, ctx), expenses: buildJsonDocument(shown, ctx).expenses.slice(0, 2) }, null, 2)
      : "";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Preview</h3>
        <div role="tablist" aria-label="Preview mode" className="flex rounded-lg border border-line p-0.5 text-xs font-medium">
          {(["table", "raw"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              disabled={v === "raw" && !spec.textPreview}
              title={v === "raw" && !spec.textPreview ? "Raw preview isn't available for PDF" : undefined}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                view === v ? "bg-page text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {v === "table" ? "Table" : `Raw ${spec.label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        {view === "table" ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-page text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">{formatDate(e.date)}</td>
                    <td className="px-3 py-2">
                      <CategoryBadge category={e.category} />
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-ink" title={e.description}>
                      {e.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink">{formatCurrency(e.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="max-h-72 overflow-auto bg-page p-3 font-mono text-xs leading-relaxed text-ink-secondary">{raw}</pre>
        )}
        {more > 0 && (
          <p className="border-t border-line bg-page px-3 py-2 text-xs text-ink-muted">
            Showing first {shown.length} of {rows.length} records · {more} more will be included in the file
          </p>
        )}
      </div>
    </div>
  );
}
