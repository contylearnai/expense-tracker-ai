const MAX_LENGTH = 80;
// Windows reserves these names regardless of extension.
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Makes a user-typed name safe for every OS: strips path separators and characters
 * that Windows/macOS reject, collapses whitespace, and drops a typed extension.
 */
export function sanitizeFilename(raw: string, extension: string): string {
  let name = raw
    .normalize("NFKC")
    .replace(new RegExp(`\\.${extension}$`, "i"), "")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s.-]+|[\s.]+$/g, "")
    .slice(0, MAX_LENGTH)
    .trim();
  if (!name || RESERVED.test(name)) name = name ? `${name}-export` : "";
  return name;
}

export function defaultFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `expenses-${y}-${m}-${d}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
