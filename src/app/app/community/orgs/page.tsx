"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useAuth } from "@/components/providers";
import { listApprovedOrgs, joinOrg } from "@/lib/firestore/orgs";
import { Button } from "@/components/ui/button";
import { fadeUp, stagger } from "@/lib/motion";

type Tab = "mine" | "discover" | "friends";

export default function OrgsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("discover");

  const { data: orgs, refetch } = useQuery({
    queryKey: ["orgs", profile?.university],
    queryFn: () => listApprovedOrgs(profile?.university),
  });

  const list = tab === "mine"
    ? orgs?.filter((o) => profile?.campusOrgs?.includes(o.id))
    : tab === "discover"
    ? orgs?.filter((o) => !profile?.campusOrgs?.includes(o.id))
    : [];

  return (
    <motion.div
      variants={stagger(0.04)}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.header variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Your campus</p>
          <h1 className="text-4xl font-bold tracking-tight">Communities</h1>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/app/community/feed" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground">Feed</Link>
          <Link href="/app/community/orgs" className="px-3 py-1.5 rounded-full bg-secondary font-semibold">Orgs</Link>
        </div>
      </motion.header>

      <motion.div variants={fadeUp} className="flex gap-2 mb-6 border-b border-border">
        {(["mine", "discover", "friends"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "mine" ? "My communities" : t}
            {tab === t && (
              <motion.div layoutId="orgs-tab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </motion.div>

      {tab === "friends" ? (
        <Empty title="Friends coming soon" body="Invite-only campus connections." />
      ) : !list || list.length === 0 ? (
        <Empty
          title={tab === "mine" ? "You haven't joined any orgs" : "No orgs yet for your campus"}
          body={tab === "mine" ? "Go to Discover to find one." : "Check back as orgs onboard."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((o) => (
            <motion.div key={o.id} variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{o.emoji ?? "🏛️"}</div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.memberCount} members</span>
              </div>
              <h3 className="font-bold tracking-tight">{o.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{o.university}</p>
              {o.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{o.description}</p>}
              {tab === "discover" && user && (
                <Button
                  size="sm"
                  className="mt-4 w-full"
                  onClick={async () => {
                    await joinOrg(user.uid, o.id, profile?.campusOrgs ?? []);
                    refetch();
                  }}
                >
                  Join
                </Button>
              )}
              {tab === "mine" && (
                <Link href={`/app/community/orgs/${o.id}`}>
                  <Button size="sm" variant="outline" className="mt-4 w-full">
                    Open
                  </Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
