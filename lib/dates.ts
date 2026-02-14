import { DatePreset } from "@/types/market";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function toUnixSeconds(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

export function addDays(date: string | Date, days: number): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function subtractDays(date: string | Date, days: number): string {
  return addDays(date, -days);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function rangeFromPreset(preset: DatePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);

  switch (preset) {
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6M":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "3Y":
      from.setFullYear(from.getFullYear() - 3);
      break;
    case "5Y":
      from.setFullYear(from.getFullYear() - 5);
      break;
    default:
      from.setMonth(from.getMonth() - 1);
      break;
  }

  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export function yearsBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.abs(end - start) / (365.25 * 24 * 60 * 60 * 1000);
}
