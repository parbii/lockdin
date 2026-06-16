import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export function userDoc(uid: string) {
  return doc(getDb(), "users", uid);
}

export async function ensureUserDoc(
  uid: string,
  email: string,
  name: string,
): Promise<UserProfile> {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;
  const profile: UserProfile = {
    uid,
    email,
    name,
    campusOrgs: [],
    lockdInStatus: "in_progress",
    modulesCompleted: 0,
    modulesTotal: 10,
    activeGoalCount: 0,
    currentStreak: 0,
    createdAt: Date.now(),
  };
  await setDoc(ref, { ...profile, createdAtServer: serverTimestamp() });
  return profile;
}

export async function updateUserProfile(uid: string, patch: Partial<UserProfile>) {
  await setDoc(userDoc(uid), patch, { merge: true });
}

export function subscribeToUser(
  uid: string,
  cb: (profile: UserProfile | null) => void,
) {
  return onSnapshot(userDoc(uid), (s) => {
    cb(s.exists() ? (s.data() as UserProfile) : null);
  });
}

export { writeBatch, increment };
