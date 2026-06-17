import type { Curriculum } from "@/types";

let cached: Curriculum | null = null;

export async function loadCurriculum(): Promise<Curriculum> {
  if (cached) return cached;
  const res = await fetch("/curriculum/v1/modules.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to load curriculum");
  cached = (await res.json()) as Curriculum;
  return cached;
}
