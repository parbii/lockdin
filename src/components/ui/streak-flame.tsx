"use client";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export function StreakFlame({ days }: { days: number }) {
  const active = days > 0;
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-sm font-semibold"
    >
      <Flame className={active ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
      <span className="tabular-nums">{days}</span>
      <span className="text-muted-foreground text-xs">day{days === 1 ? "" : "s"}</span>
    </motion.div>
  );
}
