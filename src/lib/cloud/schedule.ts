import type { Frequency, Schedule } from "./types";

type Timing = Pick<Schedule, "frequency" | "weekday" | "monthDay" | "time">;

/** The first run strictly after `from`, in local time. */
export function computeNextRun(timing: Timing, from: Date): Date {
  const [h, m] = timing.time.split(":").map(Number);
  const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h, m, 0, 0);

  if (timing.frequency === "daily") {
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }
  if (timing.frequency === "weekly") {
    const delta = (timing.weekday - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    if (candidate <= from) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }
  candidate.setDate(timing.monthDay);
  if (candidate <= from) candidate.setMonth(candidate.getMonth() + 1, timing.monthDay);
  return candidate;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function describeTiming(t: Timing): string {
  const [h, m] = t.time.split(":").map(Number);
  const time = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const map: Record<Frequency, string> = {
    daily: `Every day at ${time}`,
    weekly: `Every ${WEEKDAYS[t.weekday]} at ${time}`,
    monthly: `On the ${ordinal(t.monthDay)} of every month at ${time}`,
  };
  return map[t.frequency];
}

export { WEEKDAYS };
