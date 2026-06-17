"use client";
import { motion } from "framer-motion";
import { LOCK_IN_THRESHOLD } from "@/lib/goals-math";

interface Props {
  totalReps: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function LockInBar({ totalReps, size = "md", showLabel = true }: Props) {
  const pct = Math.min(1, totalReps / LOCK_IN_THRESHOLD);
  const lockedIn = totalReps >= LOCK_IN_THRESHOLD;
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-semibold tabular-nums">
          <span className={lockedIn ? "text-primary uppercase tracking-wider" : "text-muted-foreground uppercase tracking-wider"}>
            {lockedIn ? "LOCKD In" : "Lock-in progress"}
          </span>
          <span className={lockedIn ? "text-primary" : "text-muted-foreground"}>
            {Math.min(totalReps, LOCK_IN_THRESHOLD)} / {LOCK_IN_THRESHOLD} reps
          </span>
        </div>
      )}
      <div className={`relative w-full bg-secondary rounded-full overflow-hidden ${size === "sm" ? "h-1.5" : "h-2.5"}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          style={lockedIn ? { boxShadow: "0 0 12px hsl(var(--primary) / 0.6)" } : undefined}
        />
      </div>
    </div>
  );
}
