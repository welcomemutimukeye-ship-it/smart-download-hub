import { useEffect, useState } from "react";

const PREFS_KEY = "forge:prefs:v1";
const QUEUE_KEY = "forge:queue:v1";

export type CategoryRule = { id: string; pattern: string; category: string };

export type Prefs = {
  segments: 8 | 16 | 32;
  maxConcurrent: number;
  defaultCategory: string;
  scheduleEnabled: boolean;
  scheduleStart: string; // HH:MM
  scheduleEnd: string;   // HH:MM
  autoStart: boolean;
  notifyOnFinish: boolean;
  downloadDir: string;
  rules: CategoryRule[];
};

export const DEFAULT_PREFS: Prefs = {
  segments: 16,
  maxConcurrent: 4,
  defaultCategory: "Auto-detect",
  scheduleEnabled: false,
  scheduleStart: "22:00",
  scheduleEnd: "06:00",
  autoStart: true,
  notifyOnFinish: true,
  downloadDir: "~/Downloads/Forge",
  rules: [
    { id: "r1", pattern: ".zip,.rar,.7z,.tar,.gz", category: "Compressed" },
    { id: "r2", pattern: ".pdf,.docx,.txt,.epub", category: "Documents" },
    { id: "r3", pattern: ".mp3,.flac,.wav,.ogg", category: "Music" },
    { id: "r4", pattern: ".exe,.msi,.dmg,.iso,.deb", category: "Programs" },
    { id: "r5", pattern: ".mp4,.mkv,.mov,.webm,.avi", category: "Video" },
  ],
};

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function usePersistent<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(initial);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setState((prev) => ({ ...(prev as object), ...JSON.parse(raw) } as T));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeJSON(key, state); }, [key, state]);
  return [state, setState];
}

export function usePrefs() {
  return usePersistent<Prefs>(PREFS_KEY, DEFAULT_PREFS);
}

export const QUEUE_STORAGE_KEY = QUEUE_KEY;
export function loadQueue<T>(fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch { return fallback; }
}
export function saveQueue<T>(items: T[]) { writeJSON(QUEUE_KEY, items); }
