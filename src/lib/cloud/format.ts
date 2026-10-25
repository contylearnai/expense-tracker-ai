export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeUntil(iso: string, now: Date = new Date()): string {
  const s = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  if (s <= 60) return "in a moment";
  const m = Math.round(s / 60);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 36) return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

/** Splits "a@x.com, b@y.org" into valid and invalid addresses. */
export function parseRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  return { valid: parts.filter((p) => EMAIL.test(p)), invalid: parts.filter((p) => !EMAIL.test(p)) };
}
