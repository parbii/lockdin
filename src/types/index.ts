export type LockdInStatus = "in_progress" | "locked_in";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  major?: string;
  university?: string;
  campusOrgs: string[];
  avatarUrl?: string;
  lockdInStatus: LockdInStatus;
  modulesCompleted: number;
  modulesTotal: number;
  activeGoalCount: number;
  currentStreak: number;
  lastCheckInDate?: string;
  createdAt: number;
}

export type SectionType =
  | "video"
  | "audio"
  | "text"
  | "reflection"
  | "journal_streak"
  | "external_link"
  | "quiz";

interface BaseSection {
  id: string;
  type: SectionType;
  title: string;
}

export interface VideoSection extends BaseSection {
  type: "video";
  mediaUrl: string;
  durationSec: number;
}
export interface AudioSection extends BaseSection {
  type: "audio";
  mediaUrl: string;
  durationSec: number;
}
export interface TextSection extends BaseSection {
  type: "text";
  body: string;
}
export interface ReflectionSection extends BaseSection {
  type: "reflection";
  prompt: string;
  minChars: number;
}
export interface JournalStreakSection extends BaseSection {
  type: "journal_streak";
  prompt: string;
  targetDays: number;
}
export interface ExternalLinkSection extends BaseSection {
  type: "external_link";
  url: string;
  ctaLabel: string;
  body?: string;
}
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}
export interface QuizSection extends BaseSection {
  type: "quiz";
  questions: QuizQuestion[];
  passingScore: number;
}

export type Section =
  | VideoSection
  | AudioSection
  | TextSection
  | ReflectionSection
  | JournalStreakSection
  | ExternalLinkSection
  | QuizSection;

export interface MindsetModule {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  emoji: string;
  sections: Section[];
}

export interface Curriculum {
  version: string;
  modules: MindsetModule[];
}

export interface SectionStateEntry {
  completed?: boolean;
  at?: number;
  scrollPct?: number;
  charCount?: number;
}

export interface ModuleProgress {
  moduleId: string;
  status: "in_progress" | "completed";
  sectionState: Record<string, SectionStateEntry>;
  reflections: Record<string, string>;
  quizAttempts: Array<{ sectionId: string; score: number; at: number }>;
  journalStreaks: Record<string, { currentStreak: number; lastEntryDate: string }>;
  externalLinkAttestations: Record<string, { confirmed: boolean; at: number }>;
  startedAt: number;
  completedAt?: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  habitMetric: string;
  dailyFrequency: number;
  isPublic: boolean;
  status: "active" | "archived";
  createdAt: number;
  progressHistory: Record<string, number | boolean>;
  lockedInAt?: number;
}

export interface FeedPost {
  id: string;
  type: "check_in" | "milestone" | "org_post";
  userId: string;
  userName: string;
  userAvatar?: string;
  orgId?: string;
  goalId?: string;
  body: string;
  createdAt: number;
  reactions: Record<string, number>;
}

export interface Organization {
  id: string;
  name: string;
  university: string;
  type: string;
  description?: string;
  leaderIds: string[];
  memberCount: number;
  isApproved: boolean;
  emoji?: string;
}
