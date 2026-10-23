export type SavedJournalEntry = {
  id: string;
  savedAt: string;
  pair: string;
  direction: "Long" | "Short";
  date: string;
  setupType: string;
  session: string;
  weeklyBias: string;
  dailyBias: string;
  h4Bias: string;
  ltfBias: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  risk: string;
  target: string;
  riskReward: string;
  attachedSnapshot: unknown | null;
  beforeSlot: { name: string; url: string } | null;
  entrySlot: { name: string; url: string } | null;
  afterSlot: { name: string; url: string } | null;
  whyTaken: string;
  whatHappened: string;
  whatLearned: string;
  whatCorrect: string;
  entryQuality: number;
  patience: number;
  ruleAdherence: number;
  management: number;
  emotionBefore: string;
  emotionDuring: string;
  emotionAfter: string;
  validity: { label: string; checked: boolean }[];
  exitPrice: string;
  exitReason: string;
  result: "WIN" | "LOSS" | "BE";
  pnl: string;
  rMultiple: string;
};

export const JOURNAL_STORAGE_KEY = "tradewing.journalEntries";

function isJournalEntry(value: unknown): value is SavedJournalEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.pair === "string" &&
    typeof entry.savedAt === "string" &&
    ["WIN", "LOSS", "BE"].includes(String(entry.result))
  );
}

export function getSavedJournalEntries(): SavedJournalEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(isJournalEntry)
      : [];
  } catch (error) {
    console.error("Failed to read TradeWing journal entries:", error);
    return [];
  }
}

export function getJournalSummary() {
  const entries = getSavedJournalEntries();

  const closedTrades = entries.filter(
    (entry) => entry.result === "WIN" || entry.result === "LOSS"
  );

  const wins = closedTrades.filter(
    (entry) => entry.result === "WIN"
  ).length;

  const losses = closedTrades.length - wins;

  const recordedR = closedTrades
    .map((entry) => {
      const value = String(entry.rMultiple ?? "").trim();

      if (!value) return NaN;

      const match = value.match(
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*R?$/i
      );

      return match
        ? Number(value.replace(/R$/i, "").trim())
        : NaN;
    })
    .filter(Number.isFinite);

  const latestEntry =
    [...entries].sort(
      (a, b) =>
        new Date(b.savedAt).getTime() -
        new Date(a.savedAt).getTime()
    )[0] ?? null;

  return {
    totalEntries: entries.length,
    closedTrades: closedTrades.length,
    wins,
    losses,
    breakeven: entries.filter(
      (entry) => entry.result === "BE"
    ).length,
    winRate:
      closedTrades.length > 0
        ? (wins / closedTrades.length) * 100
        : null,
    averageR:
      recordedR.length > 0
        ? recordedR.reduce((total, value) => total + value, 0) /
          recordedR.length
        : null,
    latestEntry,
  };
}

export function getJournalEntriesForPair(pair: string) {
  const normalizedPair = pair.trim().toUpperCase();

  return getSavedJournalEntries().filter(
    (entry) => entry.pair.trim().toUpperCase() === normalizedPair
  );
}
