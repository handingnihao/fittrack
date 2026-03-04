import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDateStr(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function round0(n: number): number {
  return Math.round(n);
}

export function macroRatio(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(value / target, 1);
}

export function pctStr(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function kgToLbs(kg: number): number {
  return round1(kg * 2.20462);
}

export function lbsToKg(lbs: number): number {
  return round4(lbs / 2.20462);
}

export function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function cmToFtInParts(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  return { ft: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

export function ftInToCm(ft: number, inches: number): number {
  return round1((ft * 12 + inches) * 2.54);
}

// Generate a date range of YYYY-MM-DD strings
export function dateRange(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const cur = new Date(start);
  while (cur <= end) {
    result.push(format(cur, "yyyy-MM-dd"));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Get last N days as YYYY-MM-DD strings (inclusive of today)
export function lastNDays(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(format(d, "yyyy-MM-dd"));
  }
  return result;
}
