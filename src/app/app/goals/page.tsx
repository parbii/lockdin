"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Lock, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers";
import { listActiveGoals, createGoal, checkInHabit, archiveGoal, NewHabitInput } from "@/lib/firestore/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockInBar } from "@/components/ui/lock-in-bar";
import { fadeUp, stagger } from "@/lib/motion";
import { todayKey } from "@/lib/utils";
import {
  computeTotalReps,
  repsOnDay,
  LOCK_IN_THRESHOLD,
  isHabitLockedIn,
  isGoalLockedIn,
  goalLockProgress,
} from "@/lib/goals-math";
import type { Goal, Habit } from "@/types";

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const { data: goals, refetch } = useQuery({
    queryKey: ["goals", user?.uid],
    enabled: !!user,
    queryFn: () => listActiveGoals(user!.uid),
  });
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<{ goal: Goal; type: "habit" | "goal"; habit?: Habit } | null>(null);

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
              Name the outcome. Stack the habits that get you there. {LOCK_IN_THRESHOLD} reps per habit and you&apos;re LOCKD In.
            </p>
            <Button onClick={() => setOpen(true)}>Create your first</Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => (
            <motion.div key={g.id} variants={fadeUp}>
              <GoalCard
                goal={g}
                userName={profile?.name || "Student"}
                onChanged={refetch}
                onMilestone={(payload) => {
                  fireConfetti();
                  setCelebrate(payload);
                }}
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
        {celebrate && (
          <LockInCelebration
            payload={celebrate}
            onClose={() => setCelebrate(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GoalCard({
  goal,
  userName,
  onChanged,
  onMilestone,
}: {
  goal: Goal;
  userName: string;
  onChanged: () => void;
  onMilestone: (payload: { goal: Goal; type: "habit" | "goal"; habit?: Habit }) => void;
}) {
  const { user } = useAuth();
  const goalLocked = isGoalLockedIn(goal);
  const pct = goalLockProgress(goal);
  const lockedCount = goal.habits.filter(isHabitLockedIn).length;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border bg-card p-5 ${goalLocked ? "border-primary/40" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold tracking-tight text-lg">{goal.title}</h3>
            {goalLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Lock className="h-2.5 w-2.5" /> LOCKD In
              </span>
            )}
            {goal.isPublic && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Public</span>
            )}
          </div>
          {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <button
          onClick={async () => {
            if (!user || !confirm("Archive this goal?")) return;
            await archiveGoal(user.uid, goal.id);
            onChanged();
          }}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Archive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
          <span className="text-muted-foreground">Goal progress</span>
          <span className={goalLocked ? "text-primary" : "text-muted-foreground"}>
            {lockedCount} / {goal.habits.length} habits LOCKD In
          </span>
        </div>
        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={goalLocked ? { boxShadow: "0 0 12px hsl(var(--primary) / 0.6)" } : undefined}
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        {goal.habits.map((h) => (
          <HabitItem
            key={h.id}
            goal={goal}
            habit={h}
            userName={userName}
            onChanged={onChanged}
            onMilestone={onMilestone}
          />
        ))}
      </div>
    </motion.div>
  );
}

function HabitItem({
  goal,
  habit,
  userName,
  onChanged,
  onMilestone,
}: {
  goal: Goal;
  habit: Habit;
  userName: string;
  onChanged: () => void;
  onMilestone: (payload: { goal: Goal; type: "habit" | "goal"; habit?: Habit }) => void;
}) {
  const { user } = useAuth();
  const today = todayKey();
  const todayReps = repsOnDay(habit.progressHistory, today);
  const totalReps = computeTotalReps(habit.progressHistory);
  const freq = Math.max(1, habit.dailyFrequency || 1);
  const atDailyMax = todayReps >= freq;
  const locked = totalReps >= LOCK_IN_THRESHOLD;
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-xl bg-secondary/30 p-3">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          disabled={atDailyMax || busy || !user}
          onClick={async () => {
            if (!user) return;
            setBusy(true);
            try {
              const r = await checkInHabit(user.uid, goal.id, habit.id, userName);
              if (r?.goalJustLocked) {
                onMilestone({ goal, type: "goal" });
              } else if (r?.habitJustLocked) {
                onMilestone({ goal, type: "habit", habit });
              }
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
          className={`h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            atDailyMax ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary text-foreground"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
          aria-label={atDailyMax ? "Daily max hit" : "Add a rep"}
        >
          {atDailyMax ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="text-lg font-bold leading-none">+</span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-sm truncate">{habit.title}</div>
            {locked && (
              <span className="text-[9px] uppercase tracking-wider text-primary font-bold">LOCKD In</span>
            )}
          </div>
          {habit.metric && <div className="text-[11px] text-muted-foreground truncate">{habit.metric}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold tabular-nums">
            <span className={atDailyMax ? "text-primary" : "text-foreground"}>{todayReps}</span>
            <span className="text-muted-foreground">/{freq}</span>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">today</div>
        </div>
      </div>
      <LockInBar totalReps={totalReps} size="sm" showLabel={false} />
    </div>
  );
}

function CreateGoalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [habits, setHabits] = useState<NewHabitInput[]>([{ title: "", metric: "", dailyFrequency: 1 }]);
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const validHabits = habits.filter((h) => h.title.trim().length > 0);
  const canCreate = !!title.trim() && validHabits.length > 0;

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
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold mb-1">New goal</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Name the outcome. Add the habits that get you there. {LOCK_IN_THRESHOLD} reps per habit to LOCKD In.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goal</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a marathon under 30 min" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="2026 NYC Marathon" className="mt-1" />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habits</label>
              <button
                type="button"
                onClick={() => setHabits([...habits, { title: "", metric: "", dailyFrequency: 1 }])}
                className="text-xs text-primary font-semibold inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add habit
              </button>
            </div>

            <div className="space-y-3">
              {habits.map((h, i) => (
                <HabitInputRow
                  key={i}
                  habit={h}
                  canRemove={habits.length > 1}
                  onChange={(updated) => {
                    const copy = [...habits];
                    copy[i] = updated;
                    setHabits(copy);
                  }}
                  onRemove={() => setHabits(habits.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border p-4 cursor-pointer mt-3">
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
            disabled={!canCreate || !user || busy}
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              try {
                await createGoal(user.uid, { title, description, isPublic, habits: validHabits });
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

function HabitInputRow({
  habit,
  onChange,
  onRemove,
  canRemove,
}: {
  habit: NewHabitInput;
  onChange: (h: NewHabitInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={habit.title}
          onChange={(e) => onChange({ ...habit, title: e.target.value })}
          placeholder="Habit (e.g. Easy run)"
          className="h-9 text-sm flex-1"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Remove habit"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <Input
        value={habit.metric}
        onChange={(e) => onChange({ ...habit, metric: e.target.value })}
        placeholder="Metric (e.g. 5 km)"
        className="h-9 text-sm"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Frequency:</span>
        {[1, 2, 3, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...habit, dailyFrequency: n })}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              habit.dailyFrequency === n
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {n}×
          </button>
        ))}
        <Input
          type="number"
          min={1}
          max={50}
          value={habit.dailyFrequency}
          onChange={(e) => onChange({ ...habit, dailyFrequency: Math.max(1, parseInt(e.target.value) || 1) })}
          className="h-7 w-16 text-xs"
        />
        <span className="text-[10px] text-muted-foreground">
          {Math.ceil(LOCK_IN_THRESHOLD / Math.max(1, habit.dailyFrequency))}d min
        </span>
      </div>
    </div>
  );
}

function LockInCelebration({
  payload,
  onClose,
}: {
  payload: { goal: Goal; type: "habit" | "goal"; habit?: Habit };
  onClose: () => void;
}) {
  const isGoal = payload.type === "goal";
  const title = isGoal ? payload.goal.title : payload.habit?.title || "";
  const body = isGoal
    ? `Every habit at 15 reps. This isn't a streak anymore — it's who you are.`
    : `15 reps deep. One habit closer to "${payload.goal.title}".`;
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
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">
          {isGoal ? "Goal locked in" : "Habit locked in"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-3">{body}</p>
        <Button className="mt-8 w-full" size="lg" onClick={onClose}>
          Keep going
        </Button>
      </motion.div>
    </motion.div>
  );
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
