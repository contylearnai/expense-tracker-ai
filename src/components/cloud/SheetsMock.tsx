import type { ExportArtifact } from "@/lib/cloud/types";

const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A spreadsheet-looking preview of exactly what would be written to Google Sheets. */
export function SheetsMock({ artifact, title }: { artifact: ExportArtifact; title: string }) {
  const rows = artifact.table.rows.slice(0, 8);
  const cols = artifact.table.columns.slice(0, 6);
  const numeric = (v: string) => /^[-+]?\d+(\.\d+)?%?$/.test(v);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white text-[#202124] shadow-sm dark:bg-[#202124] dark:text-[#e8eaed]">
      <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
        <span aria-hidden className="flex h-5 w-4 items-center justify-center rounded-sm bg-[#188038] text-[9px] font-bold text-white">
          ▦
        </span>
        <span className="truncate text-xs font-medium">{title}</span>
        <span className="ml-auto text-[10px] text-black/50 dark:text-white/50">Preview</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-[Arial,sans-serif] text-[11px]">
          <thead>
            <tr className="bg-[#f8f9fa] text-black/50 dark:bg-[#2b2c2f] dark:text-white/50">
              <th className="w-8 border border-black/10 dark:border-white/10" />
              {cols.map((_, i) => (
                <th key={i} className="border border-black/10 px-2 py-0.5 font-normal dark:border-white/10">
                  {COLS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black/10 bg-[#f8f9fa] text-center text-black/50 dark:border-white/10 dark:bg-[#2b2c2f] dark:text-white/50">1</td>
              {cols.map((c) => (
                <td key={c} className="whitespace-nowrap border border-black/10 bg-[#e6f4ea] px-2 py-1 font-bold dark:border-white/10 dark:bg-[#1e3a2a]">
                  {c}
                </td>
              ))}
            </tr>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="border border-black/10 bg-[#f8f9fa] text-center text-black/50 dark:border-white/10 dark:bg-[#2b2c2f] dark:text-white/50">{ri + 2}</td>
                {cols.map((_, ci) => (
                  <td
                    key={ci}
                    className={`max-w-[10rem] truncate whitespace-nowrap border border-black/10 px-2 py-1 dark:border-white/10 ${numeric(r[ci] ?? "") ? "text-right tabular-nums" : ""} ${/TOTAL|subtotal/.test(r[0]) ? "font-bold" : ""}`}
                  >
                    {r[ci]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {artifact.table.rows.length > rows.length && (
        <p className="border-t border-black/10 px-3 py-1.5 text-[11px] text-black/50 dark:border-white/10 dark:text-white/50">
          + {artifact.table.rows.length - rows.length} more rows
        </p>
      )}
    </div>
  );
}
