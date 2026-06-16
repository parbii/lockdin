"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAuth } from "@/components/providers";
import { loadCurriculum } from "@/lib/curriculum";
import { getDb } from "@/lib/firebase";
import { LockdInBadge } from "@/components/ui/lockd-in-badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { fadeUp, stagger } from "@/lib/motion";
import type { ModuleProgress } from "@/types";

export default function MindsetHubPage() {
  const { user, profile } = useAuth();
  const { data: curriculum } = useQuery({ queryKey: ["curriculum"], queryFn: loadCurriculum });
  const [progressMap, setProgressMap] = useState<Record<string, ModuleProgress>>({});

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(getDb(), "users", user.uid, "moduleProgress"),
      (snap) => {
        const m: Record<string, ModuleProgress> = {};
        snap.docs.forEach((d) => (m[d.id] = d.data() as ModuleProgress));
        setProgressMap(m);
      },
    );
    return unsub;
  }, [user]);

  const completedCount = Object.values(progressMap).filter((p) => p.status === "completed").length;
  const total = curriculum?.modules.length ?? 10;

  return (
    <motion.div
      variants={stagger(0.04)}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.header variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-sm text-muted-foreground">The 10-module roadmap</p>
          <h1 className="text-4xl font-bold tracking-tight">Mindset Hub</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Finish all ten modules to unlock <span className="text-primary font-semibold">LOCKD In</span> status. Move through them in any order — but we recommend top to bottom.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={completedCount} total={total} size={72} stroke={6} />
          <LockdInBadge status={profile?.lockdInStatus ?? "in_progress"} />
        </div>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {curriculum?.modules.map((m, i) => {
          const p = progressMap[m.id];
          const completed = p?.status === "completed";
          const inProgress = p && !completed;
          return (
            <motion.div key={m.id} variants={fadeUp}>
              <Link href={`/app/mindset/${m.id}`}>
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-2xl border bg-card p-5 h-full transition-colors ${
                    completed ? "border-primary/40" : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{m.emoji}</div>
                    {completed ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold tracking-tight">{m.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.subtitle}</p>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
                    <span>{m.estimatedMinutes} min</span>
                    <span>·</span>
                    <span>{m.sections.length} sections</span>
                    {inProgress && (
                      <>
                        <span>·</span>
                        <span className="text-primary font-semibold">In progress</span>
                      </>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
