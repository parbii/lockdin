"use client";
import { motion } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LockdInBadge({ status, className }: { status: "in_progress" | "locked_in"; className?: string }) {
  const locked = status === "locked_in";
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
        locked
          ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]"
          : "bg-secondary text-muted-foreground border border-border",
        className,
      )}
    >
      {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
      {locked ? "LOCKD In" : "In progress"}
    </motion.div>
  );
}
