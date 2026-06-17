import type { Goal, Habit } from "@/types";

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

export function habitLockProgress(habit: Habit): number {
  return Math.min(1, computeTotalReps(habit.progressHistory) / LOCK_IN_THRESHOLD);
}

export function isHabitLockedIn(habit: Habit): boolean {
  return computeTotalReps(habit.progressHistory) >= LOCK_IN_THRESHOLD;
}

export function isGoalLockedIn(goal: Goal): boolean {
  if (!goal.habits || goal.habits.length === 0) return false;
  return goal.habits.every(isHabitLockedIn);
}

export function goalLockProgress(goal: Goal): number {
  if (!goal.habits || goal.habits.length === 0) return 0;
  const sum = goal.habits.reduce((s, h) => s + habitLockProgress(h), 0);
  return sum / goal.habits.length;
}

export function goalTotalReps(goal: Goal): number {
  if (!goal.habits) return 0;
  return goal.habits.reduce((s, h) => s + computeTotalReps(h.progressHistory), 0);
}

export function goalRepsTarget(goal: Goal): number {
  return (goal.habits?.length || 0) * LOCK_IN_THRESHOLD;
}

export function normalizeGoal(raw: Goal & Record<string, unknown>): Goal {
  if (Array.isArray(raw.habits) && raw.habits.length > 0) return raw as Goal;
  const legacyHabit: Habit = {
    id: "h-legacy",
    title: raw.title,
    metric: (raw.habitMetric as string) || "",
    dailyFrequency: (raw.dailyFrequency as number) || 1,
    progressHistory: (raw.progressHistory as RepHistory) || {},
    lockedInAt: raw.lockedInAt,
  };
  return { ...raw, habits: [legacyHabit] } as Goal;
}

export function makeHabitId(): string {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
