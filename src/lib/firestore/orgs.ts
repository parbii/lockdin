import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { userDoc } from "./users";
import type { Organization } from "@/types";

export async function listApprovedOrgs(university?: string): Promise<Organization[]> {
  const base = collection(getDb(), "organizations");
  const q = university
    ? query(
        base,
        where("isApproved", "==", true),
        where("university", "==", university),
        orderBy("memberCount", "desc"),
        limit(20),
      )
    : query(base, where("isApproved", "==", true), orderBy("memberCount", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Organization, "id">) }));
}

export async function getOrg(orgId: string): Promise<Organization | null> {
  const s = await getDoc(doc(getDb(), "organizations", orgId));
  return s.exists() ? ({ id: s.id, ...(s.data() as Omit<Organization, "id">) }) : null;
}

export async function joinOrg(uid: string, orgId: string, currentOrgs: string[]) {
  const batch = writeBatch(getDb());
  batch.set(
    doc(getDb(), "organizations", orgId, "members", uid),
    { role: "member", joinedAt: Date.now() },
    { merge: true },
  );
  batch.set(
    doc(getDb(), "organizations", orgId),
    { memberCount: increment(1) },
    { merge: true },
  );
  if (!currentOrgs.includes(orgId)) {
    batch.set(
      userDoc(uid),
      { campusOrgs: [...currentOrgs, orgId], updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
}
