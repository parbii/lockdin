"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink as ExternalLinkIcon, CheckCircle2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { Section, ModuleProgress } from "@/types";
import { todayKey } from "@/lib/utils";

interface SectionProps {
  section: Section;
  progress: ModuleProgress | null;
  onComplete: () => void;
  onReflectionSave: (text: string) => void;
  onJournalEntry: () => void;
  onAttestExternal: () => void;
  onQuizSubmit: (score: number) => void;
}

export function SectionRenderer(props: SectionProps) {
  switch (props.section.type) {
    case "text": return <TextBlock {...props} />;
    case "reflection": return <Reflection {...props} />;
    case "journal_streak": return <JournalStreak {...props} />;
    case "external_link": return <ExternalLinkSection {...props} />;
    case "quiz": return <Quiz {...props} />;
    case "video":
    case "audio": return <MediaPlaceholder {...props} />;
  }
}

function TextBlock({ section, onComplete }: SectionProps) {
  if (section.type !== "text") return null;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onComplete();
          observer.disconnect();
        }
      },
      { threshold: 0.9 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onComplete]);

  return (
    <article className="prose prose-invert max-w-none">
      <p className="whitespace-pre-line text-base leading-relaxed text-foreground/95">
        {section.body}
      </p>
      <div ref={ref} className="h-1" />
    </article>
  );
}

function Reflection({ section, progress, onReflectionSave, onComplete }: SectionProps) {
  if (section.type !== "reflection") return null;
  const initial = progress?.reflections?.[section.id] ?? "";
  const [text, setText] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = text.length >= section.minChars;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (text !== initial) onReflectionSave(text);
      if (completed) onComplete();
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, completed, initial, onComplete, onReflectionSave]);

  return (
    <div>
      <p className="text-base text-foreground/95 mb-4">{section.prompt}</p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Start typing..." />
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className={completed ? "text-primary font-semibold" : "text-muted-foreground"}>
          {text.length} / {section.minChars} characters
        </span>
        {completed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-1 text-primary font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </motion.span>
        )}
      </div>
    </div>
  );
}

function JournalStreak({ section, progress, onJournalEntry, onComplete }: SectionProps) {
  if (section.type !== "journal_streak") return null;
  const streak = progress?.journalStreaks?.[section.id];
  const today = todayKey();
  const canLogToday = !streak || streak.lastEntryDate !== today;
  const current = streak?.currentStreak ?? 0;
  const completed = current >= section.targetDays;

  useEffect(() => {
    if (completed) onComplete();
  }, [completed, onComplete]);

  return (
    <div>
      <p className="text-base text-foreground/95 mb-4">{section.prompt}</p>
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
          <Flame className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-3xl font-bold tabular-nums">{current} <span className="text-muted-foreground text-sm font-normal">/ {section.targetDays} days</span></div>
          <div className="text-xs text-muted-foreground mt-1">
            {completed ? "Streak complete." : canLogToday ? "Log today to keep the streak." : "Already logged today. See you tomorrow."}
          </div>
        </div>
        <Button onClick={onJournalEntry} disabled={!canLogToday || completed} variant={canLogToday ? "primary" : "secondary"}>
          {completed ? "Done" : canLogToday ? "Log today" : "Logged"}
        </Button>
      </div>
    </div>
  );
}

function ExternalLinkSection({ section, progress, onAttestExternal, onComplete }: SectionProps) {
  if (section.type !== "external_link") return null;
  const confirmed = !!progress?.externalLinkAttestations?.[section.id]?.confirmed;
  useEffect(() => {
    if (confirmed) onComplete();
  }, [confirmed, onComplete]);

  return (
    <div>
      {section.body && <p className="text-base text-foreground/95 mb-4">{section.body}</p>}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <a
          href={section.url}
          target={section.url.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
        >
          <ExternalLinkIcon className="h-4 w-4" /> {section.ctaLabel}
        </a>
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button onClick={onAttestExternal} disabled={confirmed} variant={confirmed ? "secondary" : "primary"} size="sm">
            {confirmed ? "✓ Confirmed" : "I did it"}
          </Button>
          <span className="text-xs text-muted-foreground">Mark complete when you've taken the action.</span>
        </div>
      </div>
    </div>
  );
}

function Quiz({ section, onQuizSubmit, onComplete }: SectionProps) {
  if (section.type !== "quiz") return null;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score =
    Object.entries(answers).filter(([qid, idx]) => {
      const q = section.questions.find((q) => q.id === qid);
      return q && q.correctIndex === idx;
    }).length / section.questions.length;
  const passed = submitted && score >= section.passingScore;

  return (
    <div className="space-y-5">
      {section.questions.map((q, qi) => (
        <div key={q.id}>
          <p className="font-semibold mb-3">
            <span className="text-muted-foreground mr-2">Q{qi + 1}.</span>
            {q.prompt}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === idx;
              const isCorrect = submitted && idx === q.correctIndex;
              const isWrong = submitted && selected && idx !== q.correctIndex;
              return (
                <button
                  key={idx}
                  disabled={submitted}
                  onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                    isCorrect
                      ? "border-primary bg-primary/10 text-foreground"
                      : isWrong
                      ? "border-border bg-secondary/40 text-muted-foreground"
                      : selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <Button
          onClick={() => {
            setSubmitted(true);
            onQuizSubmit(score);
            if (score >= section.passingScore) onComplete();
          }}
          disabled={Object.keys(answers).length < section.questions.length}
        >
          Submit
        </Button>
      ) : (
        <div className={`rounded-xl border p-4 ${passed ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
          <div className="font-semibold">{passed ? "Passed" : "Try again"}</div>
          <div className="text-sm text-muted-foreground mt-1">
            You got {Math.round(score * section.questions.length)} of {section.questions.length} correct.
          </div>
          {!passed && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
              }}
            >
              Retake
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function MediaPlaceholder({ section, onComplete }: SectionProps) {
  if (section.type !== "video" && section.type !== "audio") return null;
  useEffect(() => onComplete(), [onComplete]);
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <div className="text-4xl mb-2">{section.type === "video" ? "🎬" : "🎧"}</div>
      <p className="text-sm text-muted-foreground">Media coming soon — marked complete on view for now.</p>
    </div>
  );
}
