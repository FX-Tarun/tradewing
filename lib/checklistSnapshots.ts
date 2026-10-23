/**
 * ChecklistSnapshot — bridge between the Direction Engine
 * and the Journal.
 *
 * Direction Engine = LIVE ANALYSIS
 * Journal          = HISTORICAL TRADE RECORD
 * Snapshot         = FROZEN BRIDGE
 *
 * Persistence is currently localStorage.
 */

export type ChecklistItemSnapshot = {
  name: string;
  weight: number;
  done: boolean;
};

export type TimeframeSnapshot = {
  label: string;
  short: string;
  score: number;
  items: ChecklistItemSnapshot[];
};

export type ChecklistSnapshot = {
  id: string;
  pair: string;
  direction?: "Long" | "Short";
  createdAt: string;
  timeframes: TimeframeSnapshot[];
  overallScore: number;
  setupValid: boolean;
};

const STORAGE_KEY = "tradewing.checklistSnapshots";

function readAll(): ChecklistSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as ChecklistSnapshot[];
  } catch {
    return [];
  }
}

function writeAll(snapshots: ChecklistSnapshot[]): void {
  if (typeof window === "undefined") return;

  try {
    if (snapshots.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(snapshots)
      );
    }
  } catch {
    // Never crash the UI because localStorage fails.
  }
}

/**
 * Save ONE frozen checklist snapshot.
 *
 * Every click creates exactly one snapshot.
 * Repeated checklist checking/editing before saving does not
 * affect previously saved snapshots.
 */
export function saveChecklistSnapshot(
  snapshot: Omit<ChecklistSnapshot, "id" | "createdAt">
): ChecklistSnapshot {
  const full: ChecklistSnapshot = {
    ...snapshot,
    id: `snap_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  const all = readAll();

  all.unshift(full);

  writeAll(all);

  return full;
}

/**
 * Get snapshots for one pair.
 */
export function getSnapshotsForPair(
  pair: string
): ChecklistSnapshot[] {
  const normalizedPair = pair.trim().toUpperCase();

  return readAll()
    .filter(
      (snapshot) =>
        snapshot.pair.trim().toUpperCase() === normalizedPair
    )
    .sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
}

/**
 * Get every saved checklist snapshot.
 */
export function getAllSnapshots(): ChecklistSnapshot[] {
  return readAll().sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

/**
 * Get one snapshot by ID.
 */
export function getSnapshotById(
  id: string
): ChecklistSnapshot | null {
  return readAll().find((snapshot) => snapshot.id === id) ?? null;
}

/**
 * Delete ONE checklist snapshot.
 */
export function deleteChecklistSnapshot(
  id: string
): boolean {
  const all = readAll();

  const filtered = all.filter(
    (snapshot) => snapshot.id !== id
  );

  if (filtered.length === all.length) {
    return false;
  }

  writeAll(filtered);

  return true;
}

/**
 * DELETE ALL checklist snapshots.
 *
 * This removes every Direction Engine snapshot across
 * every pair:
 *
 * EURUSD
 * XAUUSD
 * GBPUSD
 * CADJPY
 * etc.
 *
 * It does NOT touch saved Journal entries.
 */
export function deleteAllSnapshots(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Never crash the Journal/Checklist UI.
  }
}