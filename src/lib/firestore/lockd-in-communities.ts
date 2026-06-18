import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { userDoc } from "./users";
import type { GoalCategory } from "@/types";

const CATEGORY_TITLES: Record<GoalCategory, string> = {
  run: "LOCKD In on Running",
  train: "LOCKD In on Training",
  read: "LOCKD In on Reading",
  write: "LOCKD In on Writing",
  study: "LOCKD In on Studying",
  meditate: "LOCKD In on Meditation",
  hydrate: "LOCKD In on Hydration",
  sleep: "LOCKD In on Sleep",
  build: "LOCKD In on Building",
  practice: "LOCKD In on Practice",
  connect: "LOCKD In on Connecting",
  other: "LOCKD In Crew",
};

export function lockdInCommunityTitle(category: GoalCategory): string {
  return CATEGORY_TITLES[category] ?? "LOCKD In Crew";
}

export async function ensureLockdInCommunityForCategory(
  category: GoalCategory,
): Promise<string> {
  const base = collection(getDb(), "organizations");
  const q = query(
    base,
    where("isLockedInCommunity", "==", true),
    where("category", "==", category),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const id = `lockd-in-${category}`;
  const ref = doc(getDb(), "organizations", id);
  await setDoc(ref, {
    name: CATEGORY_TITLES[category],
    university: "LOCKD In",
    type: "lockd-in",
    description: `Auto-joined when you lock in on a ${category === "other" ? "personal" : category} goal.`,
    leaderIds: [],
    memberCount: 0,
    isApproved: true,
    isLockedInCommunity: true,
    category,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function joinLockdInCommunity(
  uid: string,
  category: GoalCategory,
  currentCampusOrgs: string[],
): Promise<string> {
  const communityId = await ensureLockdInCommunityForCategory(category);
  const batch = writeBatch(getDb());
  batch.set(
    doc(getDb(), "organizations", communityId, "members", uid),
    { role: "member", joinedAt: Date.now(), source: "auto-lockd-in" },
    { merge: true },
  );
  batch.set(
    doc(getDb(), "organizations", communityId),
    { memberCount: increment(1) },
    { merge: true },
  );
  if (!currentCampusOrgs.includes(communityId)) {
    batch.set(
      userDoc(uid),
      { campusOrgs: [...currentCampusOrgs, communityId], updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
  return communityId;
}
