"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Flame } from "lucide-react";
import { useAuth } from "@/components/providers";
import { loadCurriculum } from "@/lib/curriculum";
import { getDb } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StreakFlame } from "@/components/ui/streak-flame";
import { LockdInBadge } from "@/components/ui/lockd-in-badge";
import { listActiveGoals, checkInGoal } from "@/lib/firestore/goals";
import { fadeUp, stagger } from "@/lib/motion";
import { todayKey } from "@/lib/utils";
import { computeTotalReps, repsOnDay, LOCK_IN_THRESHOLD } from "@/lib/goals-math";
import { LockInBar } from "@/components/ui/lock-in-bar";
import type { Goal, ModuleProgress } from "@/types";

export default function HomePage() {
  const { user, profile } = useAuth();

  const { data: curriculum } = useQuery({
    queryKey: ["curriculum"],
    queryFn: loadCurriculum,
  });

  const { data: goals, refetch: refetchGoals } = useQuery({
    queryKey: ["goals", user?.uid],
    enabled: !!user,
    queryFn: () => listActiveGoals(user!.uid),
  });

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
  const nextModule = curriculum?.modules.find((m) => progressMap[m.id]?.status !== "completed");
  const today = todayKey();
  const goalsDoneToday = (goals ?? []).filter((g) => {
    const reps = repsOnDay(g.progressHistory, today);
    return reps >= (g.dailyFrequency || 1);
  }).length;
  const goalsLockedIn = (goals ?? []).filter((g) => computeTotalReps(g.progressHistory) >= LOCK_IN_THRESHOLD).length;

  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto px-6 lg:px-10 py-8 lg:py-12 space-y-6"
    >
      <motion.header variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-3xl font-bold tracking-tight">{(profile?.name || "Student").split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StreakFlame days={profile?.currentStreak ?? 0} />
          <LockdInBadge status={profile?.lockdInStatus ?? "in_progress"} />
        </div>
      </motion.header>

      {nextModule && (
        <motion.div variants={fadeUp}>
          <Link href={`/app/mindset/${nextModule.id}`}>
            <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 hover:border-primary/60 transition-colors cursor-pointer">
              <div className="flex items-start gap-5">
                <div className="text-4xl font-bold font-mono tabular-nums text-primary leading-none pt-1">
                  {String(nextModule.order).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-primary font-bold mb-1">
                    Recommended next
                  </div>
                  <h2 className="text-xl font-bold">{nextModule.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{nextModule.subtitle}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{nextModule.estimatedMinutes} min</span>
                    <span>·</span>
                    <span>{nextModule.sections.length} sections</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing value={completedCount} total={total} size={64} stroke={6} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Mindset</div>
              <div className="font-bold">{completedCount}/{total} modules</div>
              <Link href="/app/mindset" className="text-xs text-primary mt-1 inline-block">View hub →</Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Flame className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Goals</div>
              <div className="font-bold">{goalsDoneToday}/{goals?.length ?? 0} done today</div>
              <Link href="/app/goals" className="text-xs text-primary mt-1 inline-block">
                {goalsLockedIn > 0 ? `${goalsLockedIn} LOCKD In →` : "View goals →"}
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Today's habits</h2>
          <Link href="/app/goals" className="text-xs text-muted-foreground hover:text-foreground">All goals →</Link>
        </div>
        {!goals || goals.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">No active goals yet.</p>
              <Link href="/app/goals">
                <Button>Create your first goal</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {goals.slice(0, 4).map((g) => (
              <HabitRow key={g.id} goal={g} userName={profile?.name || "Student"} onChecked={refetchGoals} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function HabitRow({
  goal,
  userName,
  onChecked,
}: {
  goal: Goal;
  userName: string;
  onChecked: () => void;
}) {
  const { user } = useAuth();
  const today = todayKey();
  const todayReps = repsOnDay(goal.progressHistory, today);
  const totalReps = computeTotalReps(goal.progressHistory);
  const freq = goal.dailyFrequency || 1;
  const atDailyMax = todayReps >= freq;
  const lockedIn = totalReps >= LOCK_IN_THRESHOLD;
  const [busy, setBusy] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={atDailyMax || busy || !user}
          onClick={async () => {
            if (!user) return;
            setBusy(true);
            try {
              await checkInGoal(user.uid, goal, userName);
              onChecked();
            } finally {
              setBusy(false);
            }
          }}
          className={`h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            atDailyMax ? "bg-primary border-primary" : "border-border hover:border-primary"
          }`}
          aria-label={atDailyMax ? "Daily max hit" : "Add a rep"}
        >
          {atDailyMax ? (
            <svg className="h-4 w-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="text-base font-bold leading-none">+</span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-sm truncate">{goal.title}</div>
            {lockedIn && (
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">LOCKD In</span>
            )}
            {goal.isPublic && !lockedIn && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Public</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{goal.habitMetric}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold tabular-nums">
            <span className={atDailyMax ? "text-primary" : "text-foreground"}>{todayReps}</span>
            <span className="text-muted-foreground">/{freq}</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <LockInBar totalReps={totalReps} size="sm" showLabel={false} />
      </div>
    </motion.div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
