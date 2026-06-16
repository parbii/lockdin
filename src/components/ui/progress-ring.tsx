"use client";
import { motion } from "framer-motion";
import { springProgress } from "@/lib/motion";

interface Props {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}

export function ProgressRing({ value, total, size = 56, stroke = 5, showLabel = true }: Props) {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const pct = Math.min(1, total > 0 ? value / total : 0);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - c * pct }}
          transition={springProgress}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
          {value}/{total}
        </div>
      )}
    </div>
  );
}
