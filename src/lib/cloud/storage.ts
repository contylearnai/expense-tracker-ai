import type { Connection, HistoryEntry, Schedule, ShareLink } from "./types";

const KEY = "expense-tracker:cloud-v1";
const HISTORY_LIMIT = 100;

export interface CloudData {
  connections: Connection[];
  schedules: Schedule[];
  history: HistoryEntry[];
  shares: ShareLink[];
}

export const EMPTY_CLOUD: CloudData = { connections: [], schedules: [], history: [], shares: [] };

export function loadCloud(): CloudData {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return EMPTY_CLOUD;
    return {
      connections: Array.isArray(raw.connections) ? raw.connections : [],
      schedules: Array.isArray(raw.schedules) ? raw.schedules : [],
      history: Array.isArray(raw.history) ? raw.history.slice(0, HISTORY_LIMIT) : [],
      shares: Array.isArray(raw.shares) ? raw.shares : [],
    };
  } catch {
    return EMPTY_CLOUD;
  }
}

export function saveCloud(data: CloudData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...data, history: data.history.slice(0, HISTORY_LIMIT) }));
  } catch {
    // Non-critical metadata; the app keeps working in memory.
  }
}
