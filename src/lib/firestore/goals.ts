import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  addDoc,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { userDoc } from "./users";
import type { Goal, Habit } from "@/types";
import { todayKey } from "@/lib/utils";
import {
  computeTotalReps,
  LOCK_IN_THRESHOLD,
  repsOnDay,
  isHabitLockedIn,
  isGoalLockedIn,
  normalizeGoal,
  makeHabitId,
} from "@/lib/goals-math";

function goalsCol(uid: string) {
  return collection(getDb(), "users", uid, "goals");
}

export async function listActiveGoals(uid: string): Promise<Goal[]> {
  const q = query(
    goalsCol(uid),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    normalizeGoal({ id: d.id, ...(d.data() as Omit<Goal, "id">) }),
  );
}

export interface NewHabitInput {
  title: string;
  metric: string;
  dailyFrequency: number;
}

export async function createGoal(
  uid: string,
  data: {
    title: string;
    description?: string;
    isPublic: boolean;
    habits: NewHabitInput[];
  },
): Promise<string> {
  const ref = doc(goalsCol(uid));
  const habits: Habit[] = (data.habits.length > 0 ? data.habits : [
    { title: data.title, metric: "", dailyFrequency: 1 },
  ]).map((h) => ({
    id: makeHabitId(),
    title: h.title,
    metric: h.metric,
    dailyFrequency: Math.max(1, Math.floor(h.dailyFrequency || 1)),
    progressHistory: {},
  }));
  const goal: Omit<Goal, "id"> = {
    userId: uid,
    title: data.title,
    description: data.description,
    isPublic: data.isPublic,
    status: "active",
    trackingMode: "active",
    createdAt: Date.now(),
    habits,
  };
  const batch = writeBatch(getDb());
  batch.set(ref, goal);
  batch.set(
    userDoc(uid),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
  return ref.id;
}

export interface HabitCheckInResult {
  habitJustLocked: boolean;
  goalJustLocked: boolean;
  atDailyMax: boolean;
  newReps: number;
}

interface TxResult {
  outcome: HabitCheckInResult;
  feedPost: { type: "check_in" | "milestone"; body: string } | null;
}

export async function checkInHabit(
  uid: string,
  goalId: string,
  habitId: string,
  userName: string,
): Promise<HabitCheckInResult | null> {
  const goalRef = doc(getDb(), "users", uid, "goals", goalId);
  const day = todayKey();

  const txResult = await runTransaction<TxResult | null>(getDb(), async (tx) => {
    const snap = await tx.get(goalRef);
    if (!snap.exists()) return null;
    const goal = normalizeGoal({ id: snap.id, ...(snap.data() as Omit<Goal, "id">) });
    const habitIdx = goal.habits.findIndex((h) => h.id === habitId);
    if (habitIdx < 0) return null;
    const habit = goal.habits[habitIdx];
    const todayReps = repsOnDay(habit.progressHistory, day);
    const freq = Math.max(1, habit.dailyFrequency || 1);
    if (todayReps >= freq) {
      return {
        outcome: { habitJustLocked: false, goalJustLocked: false, atDailyMax: true, newReps: todayReps },
        feedPost: null,
      };
    }

    const newReps = todayReps + 1;
    const newHistory = { ...habit.progressHistory, [day]: newReps };
    const newTotal = computeTotalReps(newHistory);
    const habitWasLocked = isHabitLockedIn(habit);
    const habitNowLocked = newTotal >= LOCK_IN_THRESHOLD;
    const habitJustLocked = !habitWasLocked && habitNowLocked;

    const updatedHabit: Habit = {
      ...habit,
      progressHistory: newHistory,
      lockedInAt: habit.lockedInAt ?? (habitJustLocked ? Date.now() : undefined),
    };
    const updatedHabits = [...goal.habits];
    updatedHabits[habitIdx] = updatedHabit;

    const goalWasLocked = isGoalLockedIn(goal);
    const newGoal = { ...goal, habits: updatedHabits };
    const goalNowLocked = isGoalLockedIn(newGoal);
    const goalJustLocked = !goalWasLocked && goalNowLocked;

    const patch: Record<string, unknown> = { habits: updatedHabits };
    if (goalJustLocked) patch.lockedInAt = Date.now();
    tx.set(goalRef, patch, { merge: true });
    tx.set(
      userDoc(uid),
      { lastCheckInDate: day, updatedAt: serverTimestamp() },
      { merge: true },
    );

    let feedPost: TxResult["feedPost"] = null;
    if (goal.isPublic) {
      if (goalJustLocked) {
        feedPost = { type: "milestone", body: `🔒 LOCKD In on "${goal.title}" — every habit at 15 reps.` };
      } else if (habitJustLocked) {
        feedPost = { type: "milestone", body: `🔒 LOCKD In on "${habit.title}" toward "${goal.title}" — 15 reps deep.` };
      } else {
        feedPost = { type: "check_in", body: `Rep ${newTotal} on "${habit.title}" toward "${goal.title}"` };
      }
    }

    return {
      outcome: { habitJustLocked, goalJustLocked, atDailyMax: newReps >= freq, newReps },
      feedPost,
    };
  });

  if (txResult?.feedPost) {
    await addDoc(collection(getDb(), "feed"), {
      type: txResult.feedPost.type,
      userId: uid,
      userName,
      goalId,
      habitId,
      body: txResult.feedPost.body,
      createdAt: Date.now(),
      reactions: {},
    });
  }

  return txResult?.outcome ?? null;
}

export async function archiveGoal(uid: string, goalId: string) {
  await setDoc(
    doc(getDb(), "users", uid, "goals", goalId),
    { status: "archived" },
    { merge: true },
  );
}

export async function deleteGoal(uid: string, goalId: string) {
  await deleteDoc(doc(getDb(), "users", uid, "goals", goalId));
}

export async function setGoalTrackingMode(
  uid: string,
  goalId: string,
  mode: "active" | "graduated",
) {
  await setDoc(
    doc(getDb(), "users", uid, "goals", goalId),
    { trackingMode: mode },
    { merge: true },
  );
}

export interface EditableHabit {
  id?: string;
  title: string;
  metric: string;
  dailyFrequency: number;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  data: {
    title: string;
    description?: string;
    isPublic: boolean;
    habits: EditableHabit[];
  },
): Promise<void> {
  const goalRef = doc(getDb(), "users", uid, "goals", goalId);
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(goalRef);
    if (!snap.exists()) throw new Error("Goal not found");
    const existing = normalizeGoal({ id: snap.id, ...(snap.data() as Omit<Goal, "id">) });

    const merged: Habit[] = data.habits.map((h) => {
      const prior = h.id ? existing.habits.find((p) => p.id === h.id) : undefined;
      if (prior) {
        return {
          ...prior,
          title: h.title,
          metric: h.metric,
          dailyFrequency: Math.max(1, Math.floor(h.dailyFrequency || 1)),
        };
      }
      return {
        id: makeHabitId(),
        title: h.title,
        metric: h.metric,
        dailyFrequency: Math.max(1, Math.floor(h.dailyFrequency || 1)),
        progressHistory: {},
      };
    });

    tx.set(
      goalRef,
      {
        title: data.title,
        description: data.description ?? "",
        isPublic: data.isPublic,
        habits: merged,
      },
      { merge: true },
    );
  });
}
