"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

export function Card({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "bg-card border border-border rounded-2xl p-5 shadow-[0_1px_0_0_hsl(var(--border))]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground mt-1", className)} {...props} />;
}
