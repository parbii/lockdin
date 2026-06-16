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
  data: { title: string; description?: string; habitMetric: string; isPublic: boolean },
): Promise<string> {
  const ref = doc(goalsCol(uid));
  const goal: Omit<Goal, "id"> = {
    userId: uid,
    title: data.title,
    description: data.description,
    habitMetric: data.habitMetric,
    isPublic: data.isPublic,
    status: "active",
    createdAt: Date.now(),
    progressHistory: {},
  };
  const batch = writeBatch(getDb());
  batch.set(ref, goal);
  batch.set(
    userDoc(uid),
    { activeGoalCount: 0, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
  return ref.id;
}

export async function checkInGoal(
  uid: string,
  goal: Goal,
  userName: string,
): Promise<void> {
  const day = todayKey();
  const alreadyChecked = goal.progressHistory[day];
  if (alreadyChecked) return;

  const batch = writeBatch(getDb());
  batch.set(
    doc(getDb(), "users", uid, "goals", goal.id),
    { progressHistory: { [day]: true } },
    { merge: true },
  );
  batch.set(
    userDoc(uid),
    { lastCheckInDate: day, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();

  if (goal.isPublic) {
    await addDoc(collection(getDb(), "feed"), {
      type: "check_in",
      userId: uid,
      userName,
      goalId: goal.id,
      body: `Checked in on "${goal.title}" — ${goal.habitMetric}`,
      createdAt: Date.now(),
      reactions: {},
    });
  }
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
