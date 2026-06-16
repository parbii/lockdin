"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, BookOpen, Target, Users, User, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/mindset", label: "Mindset", icon: BookOpen },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/community/feed", label: "Community", icon: Users, matchPrefix: "/app/community" },
  { href: "/app/me", label: "Me", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  const isActive = (item: (typeof NAV)[number]) =>
    item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card px-5 py-8 sticky top-0 h-screen">
        <Link href="/app/home" className="flex items-center gap-2 mb-10">
          <Lock className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">LOCKD In</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-secondary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-4.5 w-4.5 relative" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4 space-y-2">
          <Link href="/app/me" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/40 transition-colors">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {initials(profile?.name || user.email || "U")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{profile?.name || "Student"}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        <div className="flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
