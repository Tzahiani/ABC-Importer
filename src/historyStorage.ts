/**
 * History is stored only in localStorage (per origin). Each browser profile / device
 * sees its own data. Optional local profiles (p1–p4) isolate history on a shared browser.
 */

const LEGACY_HISTORY_KEY = "abc-muse-app-history-v1";
const PROFILE_KEY = "abc-muse-app-active-profile-v1";
const HISTORY_PREFIX = "abc-muse-app-history-v1:";

const MAX_HISTORY = 12;

export type HistoryEntry = {
  id: string;
  label: string;
  at: string;
  snippet: string;
};

export const HISTORY_PROFILE_IDS = ["p1", "p2", "p3", "p4"] as const;
export type HistoryProfileId = (typeof HISTORY_PROFILE_IDS)[number];

function historyStorageKey(id: HistoryProfileId): string {
  return `${HISTORY_PREFIX}${id}`;
}

function isProfileId(v: string): v is HistoryProfileId {
  return (HISTORY_PROFILE_IDS as readonly string[]).includes(v);
}

/** Migrates pre-profile data into p1 once, then removes the legacy key. */
function migrateLegacyIfNeeded(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (!legacy) return;
    const p1Key = historyStorageKey("p1");
    if (!localStorage.getItem(p1Key)) {
      localStorage.setItem(p1Key, legacy);
    }
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function getActiveProfileId(): HistoryProfileId {
  try {
    const v = localStorage.getItem(PROFILE_KEY);
    if (v && isProfileId(v)) return v;
  } catch {
    /* ignore */
  }
  return "p1";
}

export function setActiveProfileId(id: HistoryProfileId): void {
  try {
    localStorage.setItem(PROFILE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadHistory(): HistoryEntry[] {
  migrateLegacyIfNeeded();
  try {
    const raw = localStorage.getItem(historyStorageKey(getActiveProfileId()));
    if (!raw) return [];
    const v = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: Omit<HistoryEntry, "at"> & { at?: string }): void {
  migrateLegacyIfNeeded();
  const list = loadHistory();
  const next: HistoryEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  };
  const filtered = list.filter((x) => x.id !== next.id);
  const merged = [next, ...filtered].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(
      historyStorageKey(getActiveProfileId()),
      JSON.stringify(merged),
    );
  } catch {
    /* ignore */
  }
}
