export type DestinationId =
  | "device"
  | "email"
  | "google-sheets"
  | "google-drive"
  | "dropbox"
  | "onedrive"
  | "notion"
  | "slack";

export type TemplateId = "tax-report" | "monthly-summary" | "category-analysis" | "full-backup";

export interface TemplateParams {
  /** Tax year, for the tax report. */
  year?: number;
  /** YYYY-MM, for the monthly summary. */
  month?: string;
}

export interface Connection {
  id: DestinationId;
  account: string;
  connectedAt: string;
  lastSyncAt: string | null;
  /** Keep a destination continuously up to date as expenses change (Sheets). */
  liveSync: boolean;
}

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  content: string;
  records: number;
  /** Tabular view used by previews and the Sheets mockup. */
  table: { columns: string[]; rows: string[][] };
}

export type Trigger = "manual" | "schedule" | "live-sync";

export interface HistoryEntry {
  id: string;
  createdAt: string;
  templateId: TemplateId;
  params: TemplateParams;
  destination: DestinationId;
  /** Recipients, sheet name or folder, depending on destination. */
  target: string;
  filename: string;
  records: number;
  bytes: number;
  status: "completed" | "failed";
  trigger: Trigger;
}

export type Frequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  templateId: TemplateId;
  destination: DestinationId;
  frequency: Frequency;
  /** 0 = Sunday; used when weekly. */
  weekday: number;
  /** 1–28; used when monthly (28 keeps every month valid). */
  monthDay: number;
  /** HH:MM, local time. */
  time: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface ShareLink {
  id: string;
  createdAt: string;
  title: string;
  url: string;
  expiresAt: string | null;
}

export interface Job {
  id: string;
  title: string;
  destination: DestinationId;
  stage: string;
  progress: number;
  status: "running" | "done" | "failed";
}
