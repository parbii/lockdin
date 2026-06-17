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
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { userDoc } from "./users";
import type { Goal } from "@/types";
import { todayKey } from "@/lib/utils";
import { computeTotalReps, LOCK_IN_THRESHOLD, repsOnDay } from "@/lib/goals-math";

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
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Goal, "id">) }));
}

export async function createGoal(
  uid: string,
  data: { title: string; description?: string; habitMetric: string; isPublic: boolean; dailyFrequency: number },
): Promise<string> {
  const ref = doc(goalsCol(uid));
  const goal: Omit<Goal, "id"> = {
    userId: uid,
    title: data.title,
    description: data.description,
    habitMetric: data.habitMetric,
    dailyFrequency: Math.max(1, Math.floor(data.dailyFrequency || 1)),
    isPublic: data.isPublic,
    status: "active",
    createdAt: Date.now(),
    progressHistory: {},
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

export interface CheckInResult {
  reps: number;
  totalReps: number;
  justLockedIn: boolean;
  atDailyMax: boolean;
}

export async function checkInGoal(
  uid: string,
  goal: Goal,
  userName: string,
): Promise<CheckInResult | null> {
  const day = todayKey();
  const freq = Math.max(1, goal.dailyFrequency || 1);
  const todayCount = repsOnDay(goal.progressHistory, day);
  if (todayCount >= freq) return null;

  const newTodayCount = todayCount + 1;
  const prevTotal = computeTotalReps(goal.progressHistory);
  const newTotal = prevTotal + 1;
  const justLockedIn = !goal.lockedInAt && newTotal >= LOCK_IN_THRESHOLD;

  const goalRef = doc(getDb(), "users", uid, "goals", goal.id);
  const batch = writeBatch(getDb());
  const patch: Record<string, unknown> = {
    progressHistory: { [day]: newTodayCount },
  };
  if (justLockedIn) patch.lockedInAt = Date.now();
  batch.set(goalRef, patch, { merge: true });
  batch.set(
    userDoc(uid),
    { lastCheckInDate: day, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();

  if (goal.isPublic) {
    await addDoc(collection(getDb(), "feed"), {
      type: justLockedIn ? "milestone" : "check_in",
      userId: uid,
      userName,
      goalId: goal.id,
      body: justLockedIn
        ? `🔒 LOCKD In on "${goal.title}" — ${LOCK_IN_THRESHOLD} reps deep.`
        : `Checked in on "${goal.title}" — rep ${newTotal} of ${LOCK_IN_THRESHOLD}`,
      createdAt: Date.now(),
      reactions: {},
    });
  }

  return {
    reps: newTodayCount,
    totalReps: newTotal,
    justLockedIn,
    atDailyMax: newTodayCount >= freq,
  };
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
