"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target } from "lucide-react";
import { useAuth } from "@/components/providers";
import { listActiveGoals, createGoal, checkInGoal, archiveGoal } from "@/lib/firestore/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadeUp, stagger } from "@/lib/motion";
import { todayKey } from "@/lib/utils";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const { data: goals, refetch } = useQuery({
    queryKey: ["goals", user?.uid],
    enabled: !!user,
    queryFn: () => listActiveGoals(user!.uid),
  });
  const [open, setOpen] = useState(false);

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
              Pick one habit you'll do every day. Small enough that skipping feels worse than doing it.
            </p>
            <Button onClick={() => setOpen(true)}>Create your first</Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <motion.div key={g.id} variants={fadeUp}>
              <GoalCard goal={g} userName={profile?.name || "Student"} onChanged={refetch} />
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
    </motion.div>
  );
}

function GoalCard({ goal, userName, onChanged }: { goal: Goal; userName: string; onChanged: () => void }) {
  const { user } = useAuth();
  const today = todayKey();
  const done = !!goal.progressHistory?.[today];
  const last7 = lastNDays(7);
  const streak = computeStreak(goal.progressHistory);
  const [busy, setBusy] = useState(false);

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold tracking-tight">{goal.title}</h3>
            {goal.isPublic && (
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Public</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{goal.habitMetric}</p>
          {goal.description && <p className="text-xs text-muted-foreground mt-2">{goal.description}</p>}
        </div>
        <Button
          size="sm"
          variant={done ? "secondary" : "primary"}
          disabled={done || busy || !user}
          onClick={async () => {
            if (!user) return;
            setBusy(true);
            try {
              await checkInGoal(user.uid, goal, userName);
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          {done ? "✓ Today" : "Check in"}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1">
          {last7.map((d) => {
            const hit = !!goal.progressHistory?.[d];
            return <div key={d} className={`h-7 w-7 rounded-md ${hit ? "bg-primary" : "bg-secondary"}`} title={d} />;
          })}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Streak</span> <span className="text-primary font-bold tabular-nums">{streak}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex justify-end">
        <button
          onClick={async () => {
            if (!user || !confirm("Archive this goal?")) return;
            await archiveGoal(user.uid, goal.id);
            onChanged();
          }}
          className="text-[11px] text-muted-foreground hover:text-foreground"
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
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-1">New goal</h2>
        <p className="text-xs text-muted-foreground mb-6">Make it small enough that skipping feels worse than doing.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a mile" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily habit</label>
            <Input value={habitMetric} onChange={(e) => setHabitMetric(e.target.value)} placeholder="One mile a day" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Training for a half marathon" className="mt-1" />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border p-4 cursor-pointer">
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
                await createGoal(user.uid, { title, habitMetric, description, isPublic });
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

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function computeStreak(history: Record<string, boolean> = {}): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (history[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // allow today to be uncheckd without breaking
      if (streak === 0 && key === todayKey()) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}
