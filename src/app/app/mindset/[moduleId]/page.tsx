"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/components/providers";
import { loadCurriculum } from "@/lib/curriculum";
import {
  ensureModuleStarted,
  patchSectionState,
  saveReflection,
  completeModule,
  subscribeToModuleProgress,
  moduleProgressDoc,
} from "@/lib/firestore/modules";
import { setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { SectionRenderer } from "@/components/sections";
import { fadeUp, pageTransition } from "@/lib/motion";
import { todayKey } from "@/lib/utils";
import type { ModuleProgress } from "@/types";

export default function ModuleDetailPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params);
  const { user, profile } = useAuth();
  const { data: curriculum } = useQuery({ queryKey: ["curriculum"], queryFn: loadCurriculum });
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const module = useMemo(() => curriculum?.modules.find((m) => m.id === moduleId), [curriculum, moduleId]);
  const section = module?.sections[sectionIdx];

  useEffect(() => {
    if (!user || !module) return;
    ensureModuleStarted(user.uid, module.id);
    const unsub = subscribeToModuleProgress(user.uid, module.id, setProgress);
    return unsub;
  }, [user, module]);

  const sectionsCompleted = useMemo(() => {
    if (!module || !progress) return 0;
    return module.sections.filter((s) => progress.sectionState?.[s.id]?.completed).length;
  }, [module, progress]);

  const allDone = module && sectionsCompleted === module.sections.length;

  useEffect(() => {
    if (!allDone || !user || !module || !curriculum) return;
    if (progress?.status === "completed") return;
    (async () => {
      const newCount = (profile?.modulesCompleted ?? 0) + 1;
      await completeModule(user.uid, module.id, newCount, curriculum.modules.length);
      celebrate();
      if (newCount >= curriculum.modules.length) {
        setTimeout(() => setCelebrating(true), 600);
      }
    })();
  }, [allDone, user, module, curriculum, progress, profile]);

  const markSectionComplete = async (sectionId: string) => {
    if (!user || !module) return;
    if (progress?.sectionState?.[sectionId]?.completed) return;
    await patchSectionState(user.uid, module.id, sectionId, { completed: true, at: Date.now() });
  };

  if (!module || !section) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="h-8 w-40 skeleton mb-4" />
        <div className="h-4 w-full skeleton mb-2" />
        <div className="h-4 w-3/4 skeleton" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 lg:py-12">
      <Link href="/app/mindset" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Mindset Hub
      </Link>

      <motion.header variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">
          Module {module.order} of {curriculum?.modules.length ?? 10}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{module.emoji}</span>
          <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
        </div>
        <p className="text-muted-foreground mt-2">{module.subtitle}</p>
      </motion.header>

      <div className="flex gap-1.5 mb-8">
        {module.sections.map((s, i) => {
          const done = progress?.sectionState?.[s.id]?.completed;
          return (
            <button
              key={s.id}
              onClick={() => setSectionIdx(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                done ? "bg-primary" : i === sectionIdx ? "bg-foreground/50" : "bg-secondary"
              }`}
              aria-label={`Section ${i + 1}`}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section.id}
          variants={pageTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="min-h-[300px]"
        >
          <h2 className="text-xl font-bold tracking-tight mb-4">{section.title}</h2>
          <SectionRenderer
            section={section}
            progress={progress}
            onComplete={() => markSectionComplete(section.id)}
            onReflectionSave={(text) => user && saveReflection(user.uid, module.id, section.id, text)}
            onJournalEntry={async () => {
              if (!user) return;
              const today = todayKey();
              const cur = progress?.journalStreaks?.[section.id];
              const newStreak = cur && cur.lastEntryDate === yesterday() ? cur.currentStreak + 1 : (cur?.lastEntryDate === today ? cur.currentStreak : 1);
              await setDoc(
                moduleProgressDoc(user.uid, module.id),
                { journalStreaks: { [section.id]: { currentStreak: newStreak, lastEntryDate: today } } },
                { merge: true },
              );
            }}
            onAttestExternal={async () => {
              if (!user) return;
              await setDoc(
                moduleProgressDoc(user.uid, module.id),
                { externalLinkAttestations: { [section.id]: { confirmed: true, at: Date.now() } } },
                { merge: true },
              );
            }}
            onQuizSubmit={async (score) => {
              if (!user) return;
              await setDoc(
                moduleProgressDoc(user.uid, module.id),
                { quizAttempts: [...(progress?.quizAttempts ?? []), { sectionId: section.id, score, at: Date.now() }] },
                { merge: true },
              );
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <Button
          variant="ghost"
          disabled={sectionIdx === 0}
          onClick={() => setSectionIdx((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">{sectionIdx + 1} / {module.sections.length}</span>
        <Button
          disabled={sectionIdx === module.sections.length - 1}
          onClick={() => setSectionIdx((i) => Math.min(module.sections.length - 1, i + 1))}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {celebrating && <LockdInCelebration onClose={() => setCelebrating(false)} />}
      </AnimatePresence>
    </div>
  );
}

function celebrate() {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 110,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.7 },
    colors: ["#FF1493", "#ffffff", "#FF6FB5"],
  });
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function LockdInCelebration({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 220, spread: 120, startVelocity: 50, origin: { y: 0.6 }, colors: ["#FF1493", "#fff"] });
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-md w-full rounded-3xl bg-card border border-primary/50 p-8 text-center shadow-[0_0_80px_-10px_hsl(var(--primary)/0.6)]"
      >
        <div className="text-6xl mb-4">🔒</div>
        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Status unlocked</div>
        <h2 className="text-4xl font-bold tracking-tight">You're LOCKD In</h2>
        <p className="text-muted-foreground mt-4">
          Ten modules. Done. This is the start of the discipline, not the end of the curriculum. Keep your streak.
        </p>
        <Button className="mt-8 w-full" size="lg" onClick={onClose}>
          Let's go
        </Button>
      </motion.div>
    </motion.div>
  );
}
