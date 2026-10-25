"use client";

import { useMemo, useReducer } from "react";
import { selectExportRows, summarizeExport, validateQuery } from "@/lib/export/query";
import { EXPORT_FORMATS } from "@/lib/export/registry";
import { sanitizeFilename } from "@/lib/export/filename";
import type { ExportFormat, ExportOptions } from "@/lib/export/types";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";

type Action =
  | { type: "format"; format: ExportFormat }
  | { type: "range"; from: string; to: string }
  | { type: "toggleCategory"; category: Category }
  | { type: "categories"; categories: Category[] }
  | { type: "filename"; filename: string }
  | { type: "reset"; options: ExportOptions };

function reducer(state: ExportOptions, action: Action): ExportOptions {
  switch (action.type) {
    case "format":
      return { ...state, format: action.format };
    case "range":
      return { ...state, from: action.from, to: action.to };
    case "toggleCategory": {
      const has = state.categories.includes(action.category);
      const next = has ? state.categories.filter((c) => c !== action.category) : [...state.categories, action.category];
      // Keep canonical order so labels and outputs are stable.
      return { ...state, categories: CATEGORIES.filter((c) => next.includes(c)) };
    }
    case "categories":
      return { ...state, categories: action.categories };
    case "filename":
      return { ...state, filename: action.filename };
    case "reset":
      return action.options;
  }
}

/** All derived export state (rows, summary, issues) computed from the options in one place. */
export function useExportForm(expenses: Expense[], initial: ExportOptions) {
  const [options, dispatch] = useReducer(reducer, initial);
  const spec = EXPORT_FORMATS[options.format];

  const derived = useMemo(() => {
    const issue = validateQuery(options);
    const rows = issue ? [] : selectExportRows(expenses, options);
    return { issue, rows, summary: summarizeExport(rows) };
  }, [expenses, options]);

  const cleanName = sanitizeFilename(options.filename, spec.extension);
  const filenameChanged = options.filename.trim() !== "" && cleanName !== options.filename.trim().replace(new RegExp(`\\.${spec.extension}$`, "i"), "");

  return { options, dispatch, spec, ...derived, cleanName, filenameChanged };
}
