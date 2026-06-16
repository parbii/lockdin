"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers";
import { updateUserProfile } from "@/lib/firestore/users";
import { fadeUp } from "@/lib/motion";

const STEPS = ["name", "major", "university", "orgs"] as const;
type Step = (typeof STEPS)[number];

const SUGGESTED_ORGS = [
  { id: "nsbe", name: "NSBE", emoji: "🛠️" },
  { id: "bsu", name: "Black Student Union", emoji: "✊🏾" },
  { id: "sga", name: "Student Government", emoji: "🏛️" },
  { id: "ssp", name: "Student Society of Professionals", emoji: "💼" },
  { id: "greek", name: "Greek Life", emoji: "🏛️" },
  { id: "athletics", name: "Athletics", emoji: "🏀" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [university, setUniversity] = useState("");
  const [orgs, setOrgs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.name || "");
      if (!university && profile.email) {
        const domain = profile.email.split("@")[1] || "";
        const guess = domain.replace(".edu", "").split(".").pop() || "";
        setUniversity(guess ? guess.toUpperCase() : "");
      }
    }
  }, [profile, university]);

  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]);
  const back = () => setStep(STEPS[Math.max(0, idx - 1)]);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await updateUserProfile(user.uid, { name, major, university, campusOrgs: orgs });
      router.replace("/app/home");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <motion.div
              key={s}
              className="flex-1 h-1 rounded-full bg-secondary overflow-hidden"
            >
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: i <= idx ? "100%" : 0 }}
                transition={{ duration: 0.4 }}
              />
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {step === "name" && (
              <>
                <Heading title="What should we call you?" sub="This shows up on your profile and in your campus community." />
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              </>
            )}
            {step === "major" && (
              <>
                <Heading title="What's your major?" sub="We'll use this to surface relevant orgs and opportunities." />
                <Input placeholder="e.g. Computer Science" value={major} onChange={(e) => setMajor(e.target.value)} />
              </>
            )}
            {step === "university" && (
              <>
                <Heading title="Which school?" sub="Pre-filled from your email. Edit if it's wrong." />
                <Input placeholder="University" value={university} onChange={(e) => setUniversity(e.target.value)} />
              </>
            )}
            {step === "orgs" && (
              <>
                <Heading title="Pick communities you're in" sub="You can join more later from the Community tab." />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {SUGGESTED_ORGS.map((o) => {
                    const active = orgs.includes(o.id);
                    return (
                      <motion.button
                        key={o.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() =>
                          setOrgs((arr) => (active ? arr.filter((x) => x !== o.id) : [...arr, o.id]))
                        }
                        className={`text-left rounded-xl border p-4 transition-all ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-border/80"
                        }`}
                      >
                        <div className="text-2xl mb-2">{o.emoji}</div>
                        <div className="font-semibold text-sm">{o.name}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-10">
          {idx > 0 && (
            <Button variant="ghost" onClick={back} className="flex-1">
              Back
            </Button>
          )}
          {step !== "orgs" ? (
            <Button onClick={next} className="flex-1" disabled={step === "name" && !name}>
              Continue
            </Button>
          ) : (
            <Button onClick={finish} className="flex-1" disabled={busy}>
              {busy ? "..." : "Start"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}
