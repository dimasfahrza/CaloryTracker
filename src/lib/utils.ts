import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(d = new Date()): string {
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function formatNumber(n: number, digits = 0) {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Mifflin-St Jeor BMR estimate. Returns kcal/day.
export function estimateBMR(opts: {
  sex: "male" | "female" | "other" | null;
  weightKg: number;
  heightCm: number;
  age: number;
}) {
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  return Math.round(opts.sex === "female" ? base - 161 : base + 5);
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

export function estimateTDEE(bmr: number, activity: keyof typeof ACTIVITY_FACTORS | string) {
  const factor = ACTIVITY_FACTORS[activity] ?? 1.55;
  return Math.round(bmr * factor);
}
