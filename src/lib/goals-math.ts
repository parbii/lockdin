export const LOCK_IN_THRESHOLD = 15;

export type RepHistory = Record<string, number | boolean>;

function valueToReps(v: number | boolean | undefined): number {
  if (typeof v === "number") return v;
  return v ? 1 : 0;
}

export function repsOnDay(history: RepHistory | undefined, day: string): number {
  if (!history) return 0;
  return valueToReps(history[day]);
}

export function computeTotalReps(history: RepHistory | undefined): number {
  if (!history) return 0;
  let sum = 0;
  for (const v of Object.values(history)) sum += valueToReps(v);
  return sum;
}

export function lockInProgress(history: RepHistory | undefined): number {
  return Math.min(1, computeTotalReps(history) / LOCK_IN_THRESHOLD);
}

export function isLockedIn(history: RepHistory | undefined): boolean {
  return computeTotalReps(history) >= LOCK_IN_THRESHOLD;
}

export function daysCompleted(history: RepHistory | undefined, dailyFrequency: number): number {
  if (!history) return 0;
  let count = 0;
  for (const v of Object.values(history)) {
    if (valueToReps(v) >= dailyFrequency) count++;
  }
  return count;
}
