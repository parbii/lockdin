"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Lock, Plus as PlusIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers";
import { listActiveGoals, createGoal, checkInGoal, archiveGoal } from "@/lib/firestore/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockInBar } from "@/components/ui/lock-in-bar";
import { fadeUp, stagger } from "@/lib/motion";
import { todayKey } from "@/lib/utils";
import { computeTotalReps, repsOnDay, LOCK_IN_THRESHOLD } from "@/lib/goals-math";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const { data: goals, refetch } = useQuery({
    queryKey: ["goals", user?.uid],
    enabled: !!user,
    queryFn: () => listActiveGoals(user!.uid),
  });
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<Goal | null>(null);

  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.header variants={fadeUp} className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground">Active goals</p>
          <h1 className="text-4xl font-bold tracking-tight">Goals</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </motion.header>

      {!goals || goals.length === 0 ? (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold mb-2">No active goals</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Pick one habit. Set the daily frequency you can sustain. {LOCK_IN_THRESHOLD} reps and you&apos;re LOCKD In.
            </p>
            <Button onClick={() => setOpen(true)}>Create your first</Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <motion.div key={g.id} variants={fadeUp}>
              <GoalCard
                goal={g}
                userName={profile?.name || "Student"}
                onChanged={refetch}
                onLockedIn={(g) => setCelebrate(g)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <CreateGoalDialog
            onClose={() => setOpen(false)}
            onCreated={async () => {
              setOpen(false);
              await refetch();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrate && <LockInCelebration goal={celebrate} onClose={() => setCelebrate(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function GoalCard({
  goal,
  userName,
  onChanged,
  onLockedIn,
}: {
  goal: Goal;
  userName: string;
  onChanged: () => void;
  onLockedIn: (goal: Goal) => void;
}) {
  const { user } = useAuth();
  const today = todayKey();
  const todayReps = repsOnDay(goal.progressHistory, today);
  const totalReps = computeTotalReps(goal.progressHistory);
  const lockedIn = totalReps >= LOCK_IN_THRESHOLD || !!goal.lockedInAt;
  const freq = goal.dailyFrequency || 1;
  const atDailyMax = todayReps >= freq;
  const [busy, setBusy] = useState(false);

  const handleCheckIn = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const result = await checkInGoal(user.uid, goal, userName);
      if (result?.justLockedIn) {
        fireConfetti();
        onLockedIn(goal);
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div whileHover={{ y: -2 }} className={`rounded-2xl border bg-card p-5 ${lockedIn ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold tracking-tight">{goal.title}</h3>
            {lockedIn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Lock className="h-2.5 w-2.5" /> LOCKD In
              </span>
            )}
            {goal.isPublic && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Public</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{goal.habitMetric}</p>
          {goal.description && <p className="text-xs text-muted-foreground mt-2">{goal.description}</p>}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Today</div>
          <div className="text-lg font-bold tabular-nums">
            <span className={atDailyMax ? "text-primary" : "text-foreground"}>{todayReps}</span>
            <span className="text-muted-foreground"> / {freq}</span>
          </div>
        </div>
      </div>

      <LockInBar totalReps={totalReps} />

      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          className="flex-1"
          variant={atDailyMax ? "secondary" : "primary"}
          disabled={atDailyMax || busy || !user}
          onClick={handleCheckIn}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {atDailyMax ? "Daily max hit — back tomorrow" : lockedIn ? "Bank another rep" : "Check in"}
        </Button>
        <button
          onClick={async () => {
            if (!user || !confirm("Archive this goal?")) return;
            await archiveGoal(user.uid, goal.id);
            onChanged();
          }}
          className="text-[11px] text-muted-foreground hover:text-foreground px-2"
        >
          Archive
        </button>
      </div>
    </motion.div>
  );
}

function CreateGoalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [habitMetric, setHabitMetric] = useState("");
  const [description, setDescription] = useState("");
  const [dailyFrequency, setDailyFrequency] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold mb-1">New goal</h2>
        <p className="text-xs text-muted-foreground mb-6">{LOCK_IN_THRESHOLD} reps to LOCKD In. Higher frequency = faster lock-in.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a mile" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habit</label>
            <Input value={habitMetric} onChange={(e) => setHabitMetric(e.target.value)} placeholder="One mile" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Training for a half marathon" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Daily frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyFrequency(n)}
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    dailyFrequency === n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/60"
                  }`}
                >
                  {n}×<span className="block text-[10px] font-normal mt-0.5 uppercase tracking-wider">a day</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Custom:</span>
              <Input
                type="number"
                min={1}
                max={50}
                value={dailyFrequency}
                onChange={(e) => setDailyFrequency(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 w-20 text-sm"
              />
              <span className="text-[11px] text-muted-foreground">
                {daysToLockIn(dailyFrequency)} day{daysToLockIn(dailyFrequency) === 1 ? "" : "s"} minimum to LOCKD In
              </span>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border p-4 cursor-pointer mt-2">
            <div>
              <div className="text-sm font-semibold">Public</div>
              <div className="text-xs text-muted-foreground">Check-ins show up in your community feed.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`h-7 w-12 rounded-full transition-colors relative ${isPublic ? "bg-primary" : "bg-secondary"}`}
            >
              <motion.div
                animate={{ x: isPublic ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white"
              />
            </button>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!title || !habitMetric || !user || busy}
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              try {
                await createGoal(user.uid, { title, habitMetric, description, isPublic, dailyFrequency });
                onCreated();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "..." : "Create"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LockInCelebration({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full rounded-3xl bg-card border border-primary/50 p-8 text-center shadow-[0_0_80px_-10px_hsl(var(--primary)/0.6)]"
      >
        <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Habit locked in</div>
        <h2 className="text-3xl font-bold tracking-tight">{goal.title}</h2>
        <p className="text-muted-foreground mt-3">
          {LOCK_IN_THRESHOLD} reps deep. This isn&apos;t a streak anymore — it&apos;s who you are.
        </p>
        <Button className="mt-8 w-full" size="lg" onClick={onClose}>
          Keep going
        </Button>
      </motion.div>
    </motion.div>
  );
}

function daysToLockIn(freq: number): number {
  return Math.ceil(LOCK_IN_THRESHOLD / Math.max(1, freq));
}

function fireConfetti() {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 150,
    spread: 90,
    startVelocity: 42,
    origin: { y: 0.7 },
    colors: ["#FF1493", "#ffffff", "#FF6FB5"],
  });
}
