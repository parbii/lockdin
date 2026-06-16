import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { userDoc } from "./users";
import type { ModuleProgress, SectionStateEntry } from "@/types";

export function moduleProgressDoc(uid: string, moduleId: string) {
  return doc(getDb(), "users", uid, "moduleProgress", moduleId);
}

export function moduleProgressCollection(uid: string) {
  return collection(getDb(), "users", uid, "moduleProgress");
}

export function subscribeToModuleProgress(
  uid: string,
  moduleId: string,
  cb: (p: ModuleProgress | null) => void,
) {
  return onSnapshot(moduleProgressDoc(uid, moduleId), (s) =>
    cb(s.exists() ? (s.data() as ModuleProgress) : null),
  );
}

export async function ensureModuleStarted(uid: string, moduleId: string) {
  const ref = moduleProgressDoc(uid, moduleId);
  await setDoc(
    ref,
    {
      moduleId,
      status: "in_progress",
      sectionState: {},
      reflections: {},
      quizAttempts: [],
      journalStreaks: {},
      externalLinkAttestations: {},
      startedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function patchSectionState(
  uid: string,
  moduleId: string,
  sectionId: string,
  patch: SectionStateEntry,
) {
  await setDoc(
    moduleProgressDoc(uid, moduleId),
    { sectionState: { [sectionId]: patch } },
    { merge: true },
  );
}

export async function saveReflection(
  uid: string,
  moduleId: string,
  sectionId: string,
  text: string,
) {
  await setDoc(
    moduleProgressDoc(uid, moduleId),
    { reflections: { [sectionId]: text } },
    { merge: true },
  );
}

export async function completeModule(
  uid: string,
  moduleId: string,
  newCompletedCount: number,
  totalModules: number,
) {
  const batch = writeBatch(getDb());
  batch.set(
    moduleProgressDoc(uid, moduleId),
    { status: "completed", completedAt: Date.now() },
    { merge: true },
  );
  batch.set(
    userDoc(uid),
    {
      modulesCompleted: newCompletedCount,
      lockdInStatus: newCompletedCount >= totalModules ? "locked_in" : "in_progress",
      lastModuleId: moduleId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

export { increment };
