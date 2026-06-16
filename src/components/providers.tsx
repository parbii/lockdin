"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { ensureUserDoc, subscribeToUser } from "@/lib/firestore/users";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured;

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      if (u) {
        await ensureUserDoc(u.uid, u.email ?? "", u.displayName ?? u.email?.split("@")[0] ?? "Student");
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [configured]);

  useEffect(() => {
    if (!user || !configured) return;
    const unsub = subscribeToUser(user.uid, setProfile);
    return unsub;
  }, [user, configured]);

  const signInGoogle = async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider);
  };
  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };
  const signUpEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await ensureUserDoc(cred.user.uid, email, name);
  };
  const logout = async () => {
    await signOut(getFirebaseAuth());
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, configured, signInGoogle, signInEmail, signUpEmail, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
