import type { DestinationId } from "./types";

export interface DestinationSpec {
  id: DestinationId;
  name: string;
  /** Short monogram for the tile; we deliberately don't ship third-party logos. */
  mark: string;
  tint: string;
  blurb: string;
  /** Needs an (simulated) OAuth connection before use. */
  requiresAuth: boolean;
  targetLabel: string;
  defaultTarget: string;
  stages: string[];
  scopes: string[];
}

export const DESTINATIONS: Record<DestinationId, DestinationSpec> = {
  device: {
    id: "device",
    name: "This device",
    mark: "↓",
    tint: "#52514e",
    blurb: "Download the file straight to your computer.",
    requiresAuth: false,
    targetLabel: "",
    defaultTarget: "Downloads",
    stages: ["Generating file", "Starting download"],
    scopes: [],
  },
  email: {
    id: "email",
    name: "Email",
    mark: "@",
    tint: "#6250d6",
    blurb: "Send the export as an attachment to anyone.",
    requiresAuth: false,
    targetLabel: "Recipients",
    defaultTarget: "",
    stages: ["Generating attachment", "Composing message", "Delivering"],
    scopes: [],
  },
  "google-sheets": {
    id: "google-sheets",
    name: "Google Sheets",
    mark: "S",
    tint: "#188038",
    blurb: "Create a spreadsheet, or keep one in live sync.",
    requiresAuth: true,
    targetLabel: "Spreadsheet",
    defaultTarget: "Spendwise Expenses",
    stages: ["Preparing rows", "Opening spreadsheet", "Writing cells", "Applying formatting"],
    scopes: ["Create and edit spreadsheets you open with Spendwise"],
  },
  "google-drive": {
    id: "google-drive",
    name: "Google Drive",
    mark: "D",
    tint: "#1a73e8",
    blurb: "Save files into a Drive folder.",
    requiresAuth: true,
    targetLabel: "Folder",
    defaultTarget: "/Spendwise",
    stages: ["Generating file", "Uploading", "Verifying checksum"],
    scopes: ["See and manage files created by Spendwise"],
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    mark: "Db",
    tint: "#0061fe",
    blurb: "Drop exports into an app folder.",
    requiresAuth: true,
    targetLabel: "Folder",
    defaultTarget: "/Apps/Spendwise",
    stages: ["Generating file", "Uploading", "Verifying checksum"],
    scopes: ["Read and write files in Apps/Spendwise"],
  },
  onedrive: {
    id: "onedrive",
    name: "OneDrive",
    mark: "O",
    tint: "#0364b8",
    blurb: "Back up to your Microsoft cloud.",
    requiresAuth: true,
    targetLabel: "Folder",
    defaultTarget: "/Documents/Spendwise",
    stages: ["Generating file", "Uploading", "Verifying checksum"],
    scopes: ["Read and write files in Documents/Spendwise"],
  },
  notion: {
    id: "notion",
    name: "Notion",
    mark: "N",
    tint: "#37352f",
    blurb: "Publish summaries into a Notion database.",
    requiresAuth: true,
    targetLabel: "Database",
    defaultTarget: "Finance / Expenses",
    stages: ["Preparing blocks", "Creating page", "Writing database rows"],
    scopes: ["Insert content into pages you share with Spendwise"],
  },
  slack: {
    id: "slack",
    name: "Slack",
    mark: "#",
    tint: "#611f69",
    blurb: "Post a summary card to a channel.",
    requiresAuth: true,
    targetLabel: "Channel",
    defaultTarget: "#household-budget",
    stages: ["Rendering summary", "Posting message"],
    scopes: ["Post messages to channels you choose"],
  },
};

export const DESTINATION_ORDER: DestinationId[] = [
  "device",
  "email",
  "google-sheets",
  "google-drive",
  "dropbox",
  "onedrive",
  "notion",
  "slack",
];
