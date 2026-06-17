"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";
import { Users, MessageCircle } from "lucide-react";
import { fetchFeedPage } from "@/lib/firestore/feed";
import { fadeUp, stagger } from "@/lib/motion";
import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }: { pageParam: QueryDocumentSnapshot | undefined }) =>
      fetchFeedPage(pageParam),
    initialPageParam: undefined as QueryDocumentSnapshot | undefined,
    getNextPageParam: (last) => last.nextCursor,
  });

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <motion.div
      variants={stagger(0.04)}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.header variants={fadeUp} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Campus feed</p>
            <h1 className="text-4xl font-bold tracking-tight">Community</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/app/community/feed" className="px-3 py-1.5 rounded-full bg-secondary font-semibold">Feed</Link>
            <Link href="/app/community/orgs" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground">Communities</Link>
          </div>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="h-4 w-1/3 skeleton mb-3" />
              <div className="h-3 w-full skeleton mb-2" />
              <div className="h-3 w-2/3 skeleton" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold mb-2">Feed is quiet</h3>
            <p className="text-sm text-muted-foreground mb-6">Make a goal public and your check-ins show up here.</p>
            <Link href="/app/goals">
              <Button>Create a public goal</Button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <motion.article key={p.id} variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                  {initials(p.userName)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{p.userName}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed">{p.body}</p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <button className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  🔥 <span>{p.reactions?.fire ?? 0}</span>
                </button>
                <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" /> Reply
                </button>
              </div>
            </motion.article>
          ))}
          {hasNextPage && (
            <Button variant="outline" className="w-full" onClick={() => fetchNextPage()}>
              Load more
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
