"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Lock, Trash2, Pencil } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers";
import {
  listActiveGoals,
  createGoal,
  updateGoal,
  checkInHabit,
  archiveGoal,
  setGoalTrackingMode,
  NewHabitInput,
  EditableHabit,
} from "@/lib/firestore/goals";
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

type Tab = "active" | "locked";

type CelebratePayload =
  | { type: "habit"; goal: Goal; habit: Habit }
  | { type: "goal_choice"; goal: Goal };

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const { data: goals, refetch } = useQuery({
    queryKey: ["goals", user?.uid],
    enabled: !!user,
    queryFn: () => listActiveGoals(user!.uid),
  });
  const [tab, setTab] = useState<Tab>("active");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [celebrate, setCelebrate] = useState<CelebratePayload | null>(null);

  const { activeGoals, lockedGoals } = useMemo(() => {
    const active: Goal[] = [];
    const locked: Goal[] = [];
    for (const g of goals ?? []) {
      const isLocked = isGoalLockedIn(g);
      if (isLocked) locked.push(g);
      if (!isLocked || g.trackingMode === "active") active.push(g);
    }
    return { activeGoals: active, lockedGoals: locked };
  }, [goals]);

  const visibleGoals = tab === "active" ? activeGoals : lockedGoals;

  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.header variants={fadeUp} className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Your discipline</p>
          <h1 className="text-4xl font-bold tracking-tight">Goals</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </motion.header>

      <motion.div variants={fadeUp} className="flex gap-2 mb-6 border-b border-border">
        <TabButton active={tab === "active"} onClick={() => setTab("active")} label="Active" count={activeGoals.length} />
        <TabButton active={tab === "locked"} onClick={() => setTab("locked")} label="LOCKD In" count={lockedGoals.length} highlight />
      </motion.div>

      {visibleGoals.length === 0 ? (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            {tab === "active" ? (
              <>
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold mb-2">No active goals</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Name the outcome. Stack the habits. {LOCK_IN_THRESHOLD} reps per habit and you&apos;re LOCKD In.
                </p>
                <Button onClick={() => setOpenCreate(true)}>Create your first</Button>
              </>
            ) : (
              <>
                <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold mb-2">Nothing locked in yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Once a goal hits {LOCK_IN_THRESHOLD} reps on every habit, it lives here.
                </p>
              </>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {visibleGoals.map((g) => (
            <motion.div key={g.id} variants={fadeUp}>
              <GoalCard
                goal={g}
                userName={profile?.name || "Student"}
                onChanged={refetch}
                onEdit={() => setEditing(g)}
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
        {openCreate && (
          <GoalDialog
            mode="create"
            onClose={() => setOpenCreate(false)}
            onSaved={async () => {
              setOpenCreate(false);
              await refetch();
            }}
          />
        )}
        {editing && (
          <GoalDialog
            mode="edit"
            goal={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await refetch();
            }}
          />
        )}
        {celebrate && celebrate.type === "habit" && (
          <HabitLockedCelebration
            goal={celebrate.goal}
            habit={celebrate.habit}
            onClose={() => setCelebrate(null)}
          />
        )}
        {celebrate && celebrate.type === "goal_choice" && (
          <GoalLockedChoice
            goal={celebrate.goal}
            onChoice={async (mode) => {
              if (user) await setGoalTrackingMode(user.uid, celebrate.goal.id, mode);
              setCelebrate(null);
              if (mode === "graduated") setTab("locked");
              await refetch();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-semibold transition-colors inline-flex items-center gap-2 ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={`text-[10px] font-bold tabular-nums rounded-full px-1.5 py-0.5 ${
        highlight && count > 0 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
      }`}>
        {count}
      </span>
      {active && <motion.div layoutId="goals-tab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
    </button>
  );
}

function GoalCard({
  goal,
  userName,
  onChanged,
  onEdit,
  onMilestone,
}: {
  goal: Goal;
  userName: string;
  onChanged: () => void;
  onEdit: () => void;
  onMilestone: (payload: CelebratePayload) => void;
}) {
  const { user } = useAuth();
  const goalLocked = isGoalLockedIn(goal);
  const pct = goalLockProgress(goal);
  const lockedCount = goal.habits.filter(isHabitLockedIn).length;
  const isGraduated = goal.trackingMode === "graduated";

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
            {isGraduated && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Graduated</span>
            )}
            {goal.isPublic && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Public</span>
            )}
          </div>
          {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50"
            aria-label="Edit goal"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!user || !confirm("Archive this goal?")) return;
              await archiveGoal(user.uid, goal.id);
              onChanged();
            }}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50"
            aria-label="Archive goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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

      {!isGraduated && (
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
      )}

      {isGraduated && (
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">You&apos;ve got the swing of this one.</p>
          <button
            type="button"
            onClick={async () => {
              if (!user) return;
              await setGoalTrackingMode(user.uid, goal.id, "active");
              onChanged();
            }}
            className="text-xs font-semibold text-primary"
          >
            Resume tracking
          </button>
        </div>
      )}
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
  onMilestone: (payload: CelebratePayload) => void;
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
                onMilestone({ type: "goal_choice", goal });
              } else if (r?.habitJustLocked) {
                onMilestone({ type: "habit", goal, habit });
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

function GoalDialog({
  mode,
  goal,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  goal?: Goal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [isPublic, setIsPublic] = useState(goal?.isPublic ?? true);
  const [habits, setHabits] = useState<EditableHabit[]>(
    goal
      ? goal.habits.map((h) => ({
          id: h.id,
          title: h.title,
          metric: h.metric,
          dailyFrequency: h.dailyFrequency,
        }))
      : [{ title: "", metric: "", dailyFrequency: 1 }],
  );
  const [busy, setBusy] = useState(false);

  const validHabits = habits.filter((h) => h.title.trim().length > 0);
  const canSave = !!title.trim() && validHabits.length > 0;

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
        <h2 className="text-xl font-bold mb-1">{mode === "create" ? "New goal" : "Edit goal"}</h2>
        <p className="text-xs text-muted-foreground mb-6">
          {mode === "create"
            ? `Name the outcome. Add the habits that get you there. ${LOCK_IN_THRESHOLD} reps per habit to LOCKD In.`
            : `Your progress carries over. Existing habits keep their reps; new ones start at zero.`}
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
                  key={h.id ?? `new-${i}`}
                  habit={h}
                  canRemove={habits.length > 1}
                  onChange={(updated) => {
                    const copy = [...habits];
                    copy[i] = updated;
                    setHabits(copy);
                  }}
                  onRemove={() => {
                    if (h.id && goal?.habits.find((p) => p.id === h.id)) {
                      const ok = confirm("This habit has progress. Remove it permanently?");
                      if (!ok) return;
                    }
                    setHabits(habits.filter((_, j) => j !== i));
                  }}
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
            disabled={!canSave || !user || busy}
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              try {
                if (mode === "create") {
                  const newHabits: NewHabitInput[] = validHabits.map((h) => ({
                    title: h.title,
                    metric: h.metric,
                    dailyFrequency: h.dailyFrequency,
                  }));
                  await createGoal(user.uid, { title, description, isPublic, habits: newHabits });
                } else if (goal) {
                  await updateGoal(user.uid, goal.id, {
                    title,
                    description,
                    isPublic,
                    habits: validHabits,
                  });
                }
                onSaved();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "..." : mode === "create" ? "Create" : "Save"}
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
  habit: EditableHabit;
  onChange: (h: EditableHabit) => void;
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

function HabitLockedCelebration({
  goal,
  habit,
  onClose,
}: {
  goal: Goal;
  habit: Habit;
  onClose: () => void;
}) {
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
        <h2 className="text-3xl font-bold tracking-tight">{habit.title}</h2>
        <p className="text-muted-foreground mt-3">
          15 reps deep. One habit closer to &quot;{goal.title}&quot;.
        </p>
        <Button className="mt-8 w-full" size="lg" onClick={onClose}>
          Keep going
        </Button>
      </motion.div>
    </motion.div>
  );
}

function GoalLockedChoice({
  goal,
  onChoice,
}: {
  goal: Goal;
  onChoice: (mode: "active" | "graduated") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-md w-full rounded-3xl bg-card border border-primary/50 p-8 text-center shadow-[0_0_120px_-10px_hsl(var(--primary)/0.7)]"
      >
        <Lock className="h-14 w-14 text-primary mx-auto mb-4" />
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Goal locked in</div>
        <h2 className="text-3xl font-bold tracking-tight">{goal.title}</h2>
        <p className="text-muted-foreground mt-4">
          Every habit hit 15 reps. This isn&apos;t a streak anymore — it&apos;s who you are.
        </p>
        <p className="text-sm mt-6 mb-4 font-semibold">How do you want to keep this going?</p>
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => onChoice("active")}
          >
            Keep stacking reps
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => onChoice("graduated")}
          >
            I&apos;ve got the swing of it
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Either way, this goal lives in your LOCKD In tab forever.
        </p>
      </motion.div>
    </motion.div>
  );
}

function fireConfetti() {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 200,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: ["#FF1493", "#ffffff", "#FF6FB5"],
  });
}
