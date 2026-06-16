import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { FeedPost } from "@/types";

const PAGE = 20;

export async function fetchFeedPage(cursor?: QueryDocumentSnapshot) {
  const base = collection(getDb(), "feed");
  const q = cursor
    ? query(base, orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE))
    : query(base, orderBy("createdAt", "desc"), limit(PAGE));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedPost, "id">) }));
  return { items, nextCursor: snap.docs.at(-1) };
}
