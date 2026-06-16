import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-input/40 px-4 text-sm",
          "placeholder:text-muted-foreground focus:border-primary/60 focus:bg-input/70 transition-colors",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[140px] w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm leading-relaxed",
          "placeholder:text-muted-foreground focus:border-primary/60 focus:bg-input/70 transition-colors resize-y",
          className,
        )}
        {...props}
      />
    );
  },
);
