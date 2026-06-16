"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.5)]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "bg-transparent text-foreground hover:bg-secondary/60",
  outline: "border border-border bg-transparent text-foreground hover:bg-secondary/40",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-14 px-7 text-base rounded-2xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});
