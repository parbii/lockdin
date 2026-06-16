"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Sparkles, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers";
import { fadeUp, stagger } from "@/lib/motion";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, configured, signInGoogle, signInEmail, signUpEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/app/home");
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && !email.endsWith(".edu")) {
      setError("Use your .edu email to register your campus.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpEmail(email, password, name || email.split("@")[0]);
      } else {
        await signInEmail(email, password);
      }
      router.push("/onboarding");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <motion.section
        variants={stagger(0.08)}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-24 relative overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-6">
          <Lock className="h-3.5 w-3.5" /> LOCKD In
        </motion.div>
        <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-2xl">
          Ambition is cheap. <span className="text-primary">Discipline is the unlock.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          A daily system for college students. Ten mindset modules. Trackable habits. A community of people doing the same work.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
          <Feature icon={<Sparkles className="h-5 w-5" />} title="10 modules" body="5–10 min each. Finish all 10 to be LOCKD In." />
          <Feature icon={<Target className="h-5 w-5" />} title="Habit tracker" body="Public or private. Daily check-ins build streaks." />
          <Feature icon={<Users className="h-5 w-5" />} title="Campus orgs" body="Show up for each other. Discipline as a team sport." />
        </motion.div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="lg:w-[480px] bg-card border-l border-border flex flex-col justify-center px-8 py-12 lg:py-24"
      >
        <h2 className="text-2xl font-bold mb-1">{mode === "signup" ? "Get LOCKD In" : "Welcome back"}</h2>
        <p className="text-sm text-muted-foreground mb-8">
          {mode === "signup" ? "Use your .edu email to join your campus." : "Sign in to continue your streak."}
        </p>

        {!configured && (
          <div className="mb-6 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
            <p className="font-semibold text-primary mb-1">Firebase not configured</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Add your Firebase credentials to <code className="px-1 py-0.5 rounded bg-secondary text-foreground">.env.local</code> to enable sign-in. See README.
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          className="w-full mb-4"
          disabled={!configured || busy}
          onClick={async () => {
            try {
              await signInGoogle();
              router.push("/onboarding");
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Sign-in failed");
            }
          }}
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <Input type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-xs text-primary">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={!configured || busy}>
            {busy ? "..." : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button
          onClick={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </motion.section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-primary mb-2">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed mt-1">{body}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.1C29.3 35.5 26.8 36.5 24 36.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.1C40 35.3 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
