"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { LockdInBadge } from "@/components/ui/lockd-in-badge";
import { StreakFlame } from "@/components/ui/streak-flame";
import { ProgressRing } from "@/components/ui/progress-ring";
import { fadeUp, stagger } from "@/lib/motion";
import { initials } from "@/lib/utils";

export default function MePage() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  if (!user) return null;

  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto px-6 lg:px-10 py-8 lg:py-12"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-5 mb-8">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
          {initials(profile?.name || user.email || "U")}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{profile?.name || "Student"}</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="flex gap-2 mt-3">
            <LockdInBadge status={profile?.lockdInStatus ?? "in_progress"} />
            <StreakFlame days={profile?.currentStreak ?? 0} />
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-8">
        <Stat label="Modules" value={`${profile?.modulesCompleted ?? 0}/${profile?.modulesTotal ?? 10}`} icon={
          <ProgressRing value={profile?.modulesCompleted ?? 0} total={profile?.modulesTotal ?? 10} size={48} stroke={4} showLabel={false} />
        } />
        <Stat label="Active goals" value={`${profile?.activeGoalCount ?? 0}`} />
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <Row label="Major" value={profile?.major || "—"} />
        <Row label="University" value={profile?.university || "—"} />
        <Row label="Communities" value={`${profile?.campusOrgs?.length ?? 0} joined`} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8">
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Sign out
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-bold text-lg">{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
