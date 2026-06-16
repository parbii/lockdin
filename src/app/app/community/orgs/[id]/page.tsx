"use client";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getOrg } from "@/lib/firestore/orgs";
import { fadeUp } from "@/lib/motion";

export default function OrgWallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: org } = useQuery({ queryKey: ["org", id], queryFn: () => getOrg(id) });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-2xl mx-auto px-6 py-8 lg:py-12">
      <Link href="/app/community/orgs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>
      {!org ? (
        <div className="space-y-3">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-32 skeleton" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{org.emoji ?? "🏛️"}</span>
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{org.university} · {org.memberCount} members</p>
          {org.description && <p className="mt-6 text-base leading-relaxed">{org.description}</p>}
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <h3 className="font-bold mb-2">Org wall coming soon</h3>
            <p className="text-sm text-muted-foreground">Announcements, member check-ins, and group goals will live here.</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
