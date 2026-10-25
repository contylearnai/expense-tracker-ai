import type { ExportFormat } from "./types";

const PREFS_KEY = "expense-tracker:export-prefs";

export function loadPreferredFormat(): ExportFormat | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null")?.format;
    return value === "csv" || value === "json" || value === "pdf" ? value : null;
  } catch {
    return null;
  }
}

export function savePreferredFormat(format: ExportFormat): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ format }));
  } catch {
    // Preference only; safe to ignore.
  }
}
