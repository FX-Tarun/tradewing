
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Plus,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getSavedJournalEntries,
  getJournalSummary,
  type SavedJournalEntry,
} from "@/lib/journalStorage";

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-2xl border border-[#17304A] bg-[#09111A] ${className}`}>
    {children}
  </div>
);

type WatchlistPair = {
  pair: string;
  price: string;
  bias: "Bullish" | "Bearish" | "Neutral";
  type: "blue" | "red" | "neutral";
};

const watchlistPairs: WatchlistPair[] = [
  { pair: "EURUSD", price: "—", bias: "Neutral", type: "neutral" },
  { pair: "GBPUSD", price: "—", bias: "Neutral", type: "neutral" },
  { pair: "USDJPY", price: "—", bias: "Neutral", type: "neutral" },
];

const quickActionClass =
  "group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-lg border border-[#155E92] bg-[#0A1724] px-3.5 text-sm font-semibold text-zinc-100 " +
  "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out " +
  "hover:-translate-y-[2px] hover:border-[#1BA8FF] hover:bg-[#0D2032] " +
  "hover:shadow-[0_6px_18px_rgba(21,155,255,0.14)] " +
  "active:translate-y-[1px] active:scale-[0.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159BFF]/60 " +
  "motion-reduce:transition-none";

function formatJournalDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value || "Date unavailable";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getEntryDescription(entry: SavedJournalEntry) {
  const note = entry.whatLearned?.trim() || entry.whyTaken?.trim();

  return (
    note ||
    `${
      entry.result === "WIN"
        ? "Winning"
        : entry.result === "LOSS"
          ? "Losing"
          : entry.result === "BE"
            ? "Breakeven"
            : "Saved"
    } trade · ${entry.direction}`
  );
}

function formatPrice(pair: string, price: string | undefined) {
  if (!price) return "—";

  const number = Number(price);
  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-US", {
    minimumFractionDigits: pair.endsWith("JPY") ? 3 : 5,
    maximumFractionDigits: pair.endsWith("JPY") ? 3 : 5,
  });
}

export default function Dashboard() {
  const router = useRouter();

  const [journalEntries, setJournalEntries] = useState<SavedJournalEntry[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});
  const [priceError, setPriceError] = useState(false);

  const [journalSummary, setJournalSummary] = useState({
    totalEntries: 0,
    closedTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: null as number | null,
    averageR: null as number | null,
    latestEntry: null as SavedJournalEntry | null,
  });

  const refreshJournalData = useCallback(() => {
    try {
      setJournalEntries(getSavedJournalEntries());
      setJournalSummary(getJournalSummary());
    } catch (error) {
      console.error("Could not load saved Journal data:", error);
      setJournalEntries([]);
      setJournalSummary({
        totalEntries: 0,
        closedTrades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        winRate: null,
        averageR: null,
        latestEntry: null,
      });
    }
  }, []);

  useEffect(() => {
    refreshJournalData();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "tradewing.journalEntries") {
        refreshJournalData();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshJournalData);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshJournalData);
    };
  }, [refreshJournalData]);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const response = await fetch(
          "/api/market/prices?symbols=EURUSD,GBPUSD,USDJPY",
          { cache: "no-store" }
        );

        const data: unknown = await response.json();

        if (!response.ok) {
          throw new Error("Market price request failed");
        }

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Invalid market price response");
        }

        const result: Record<string, string> = {};

        for (const [symbol, value] of Object.entries(data)) {
          if (value && typeof value === "object" && "price" in value) {
            const rawPrice = (value as { price: unknown }).price;

            if (
              (typeof rawPrice === "string" || typeof rawPrice === "number") &&
              Number.isFinite(Number(rawPrice))
            ) {
              result[symbol.replace("/", "").toUpperCase()] = String(rawPrice);
            }
          } else if (typeof value === "string" || typeof value === "number") {
            if (Number.isFinite(Number(value))) {
              result[symbol.replace("/", "").toUpperCase()] = String(value);
            }
          }
        }

        if (!cancelled) {
          setLivePrices(result);
          setPriceError(Object.keys(result).length === 0);
        }
      } catch (error) {
        console.error("Watchlist price update failed:", error);

        if (!cancelled) {
          setPriceError(true);
        }
      }
    };

    void fetchPrices();

    const interval = window.setInterval(() => {
      void fetchPrices();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleNewTrade = () => {
    router.push("/terminal");
  };

  const latestEntry = journalEntries.reduce<SavedJournalEntry | null>(
    (latest, entry) => {
      if (!latest) return entry;

      const latestTime = new Date(latest.savedAt).getTime() || 0;
      const entryTime = new Date(entry.savedAt).getTime() || 0;

      return entryTime > latestTime ? entry : latest;
    },
    null
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05090E]">
        <div className="absolute -left-1/4 -top-1/4 h-[140%] w-[140%] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(21,155,255,0.09),transparent_60%)]" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[140%] w-[140%] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(0,229,160,0.05),transparent_60%)]"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <main className="h-full min-h-0 overflow-hidden px-5 py-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1360px] flex-col gap-3">
          <div className="grid min-h-0 flex-[1.3] grid-cols-[minmax(0,1.55fr)_minmax(440px,0.78fr)] gap-4">
            <Card className="relative min-h-0 overflow-hidden px-7 py-4">
              <svg
                className="pointer-events-none absolute inset-y-0 right-0 h-full w-[42%] opacity-[0.14]"
                viewBox="0 0 400 220"
                preserveAspectRatio="xMaxYMax slice"
                aria-hidden="true"
              >
                <polygon points="40,220 140,70 210,150 260,90 400,220" fill="#0E3A66" />
                <polygon points="150,220 230,110 300,170 400,120 400,220" fill="#0A2C4E" />
              </svg>

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,rgba(0,119,255,0.08),transparent_38%)]" />

              <div className="relative z-10 flex h-full min-h-0 flex-col">
                <div className="shrink-0">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6D86A0]">
                    Quick Actions
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleNewTrade}
                      className={quickActionClass}
                      aria-label="Create a new trade"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#159BFF]/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                      <Plus size={15} strokeWidth={2.2} className="relative z-10 text-[#19A8FF] transition-transform duration-200 group-hover:rotate-90" />
                      <span className="relative z-10">New trade</span>
                    </button>

                    <a
                      href="https://www.tradingview.com/chart/l3meMj9x/?symbol=OANDA%3AEURUSD"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={quickActionClass}
                      aria-label="Open TradingView EURUSD chart"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#159BFF]/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                      <BarChart3 size={15} strokeWidth={2.2} className="relative z-10 text-[#19A8FF] transition-transform duration-200 group-hover:scale-110" />
                      <span className="relative z-10">TradingView</span>
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center">
                  <div className="text-sm font-bold uppercase tracking-[0.08em] text-[#149FFF]">
                    Good morning
                  </div>
                  <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-zinc-100">
                   {new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date()).replace(",", " ·")}
                  </h1>
                  <div className="mt-1.5 inline-flex w-fit rounded-full border border-[#075D4D] bg-[#06382F] px-3 py-1 text-xs font-bold text-[#00E5A0]">
                    Mission status · ready
                  </div>
                  <p className="mt-2 text-[16px] font-bold text-zinc-100">
                    Today&apos;s mission: take only one A+ setup.
                  </p>

                  <div className="mt-3 flex items-center gap-8">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#6D86A0]">Max risk</div>
                      <div className="mt-0.5 text-lg font-extrabold text-zinc-100">1%</div>
                    </div>
                    <div className="h-8 w-px bg-[#1B3045]" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#6D86A0]">Max trades</div>
                      <div className="mt-0.5 text-lg font-extrabold text-zinc-100">1</div>
                    </div>
                    <div className="ml-auto hidden text-sm font-bold italic text-[#159FFF] xl:block">
                      Discipline beats frequency.
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden border-[#087BCB] px-6 py-5">
              <div className="flex shrink-0 items-center gap-2">
                <Lightbulb size={18} className="text-[#159FFF]" />
                <h2 className="text-base font-extrabold text-zinc-100">Market Insight</h2>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 items-center gap-5">
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="grid grid-cols-[1.15fr_0.9fr_0.8fr] gap-4">
                    <div className="min-w-0">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-[#6D86A0]">Trend</div>
                      <div className="mt-1 text-sm font-extrabold leading-5 text-[#159FFF]">Strong Bullish</div>
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-[#6D86A0]">Volatility</div>
                      <div className="mt-1 whitespace-nowrap text-sm font-extrabold leading-5 text-[#159FFF]">Moderate</div>
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-[#6D86A0]">Key level</div>
                      <div className="mt-1 whitespace-nowrap text-sm font-extrabold leading-5 text-[#159FFF]">1.0800</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#173B58] bg-[#0B1A29] px-3.5 py-3 text-xs font-semibold leading-5 text-[#A8B8C8]">
                    Price is above daily EMA 50 and respecting higher-low structure. Bias remains bullish.
                  </div>
                </div>

                <div className="hidden w-[145px] shrink-0 lg:block">
                  <svg viewBox="0 0 180 90" className="h-[75px] w-full" fill="none" aria-hidden="true">
                    <path d="M5 72 L20 65 L31 69 L44 52 L57 60 L70 43 L83 49 L96 34 L108 40 L121 25 L134 31 L147 18 L159 26 L175 8" stroke="#159FFF" strokeWidth="2" />
                    <path d="M5 80 L20 75 L35 73 L50 68 L65 64 L80 58 L95 53 L110 48 L125 43 L140 37 L155 32 L175 25" stroke="#0B6EA8" strokeWidth="1" strokeDasharray="4 4" />
                  </svg>
                </div>
              </div>

              <div className="flex shrink-0 justify-end pt-2">
                <button type="button" className="text-sm font-bold text-[#159FFF] transition hover:text-[#52C4FF]">
                  View full analysis →
                </button>
              </div>
            </Card>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.48fr)_minmax(460px,0.92fr)] gap-4">
            <div className="grid min-h-0 grid-rows-[minmax(0,0.78fr)_minmax(0,1fr)] gap-5">
              <Card className="flex min-h-0 flex-col justify-between px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-zinc-100">Checklist</h2>
                  <span className="text-lg font-extrabold text-[#159FFF]">75%</span>
                </div>
                <div className="mt-3 h-2 shrink-0 rounded-full bg-[#132337]">
                  <div className="h-2 w-[75%] rounded-full bg-gradient-to-r from-[#087BDA] to-[#1CB8FF]" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-[#8BA0B5]">
                    <span className="text-[#159FFF]">75%</span> · journal remaining
                  </span>
                  <button type="button" onClick={() => router.push("/checklist")} className="shrink-0 rounded-lg border border-[#155E92] px-3 py-1.5 text-xs font-bold text-zinc-100 transition hover:border-[#1BA8FF]">
                    Next task
                  </button>
                </div>
              </Card>

              <Card className="flex min-h-0 flex-col justify-between px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-zinc-100">Recent journal</h2>
                  <span className="text-sm font-extrabold text-[#159FFF]">
                    {latestEntry ? formatJournalDate(latestEntry.date || latestEntry.savedAt) : "No entries"}
                  </span>
                </div>
                <div className="flex min-h-0 items-center justify-between gap-5">
                  {latestEntry ? (
                    <>
                      <div className="min-w-0">
                        <div className="text-base font-extrabold text-zinc-100">
                          {latestEntry.pair} {latestEntry.direction.toLowerCase()}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-semibold text-[#8EA2B8]">
                          {getEntryDescription(latestEntry)}
                        </div>
                      </div>
                      <div className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6D86A0] md:block">
                        Latest saved entry
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-semibold text-[#8EA2B8]">
                      No journal entries yet. Save a trade in Journal to see it here.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid min-h-0 grid-cols-[minmax(0,1.2fr)_minmax(200px,0.8fr)] gap-4">
              <Card className="flex min-h-0 flex-col px-5 py-4">
                <div className="flex shrink-0 items-center justify-between">
                  <h2 className="text-base font-extrabold text-zinc-100">Watchlist</h2>
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-[#6D86A0]">
                    {priceError ? "Price unavailable" : "Live prices"}
                  </span>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-6">
                  {watchlistPairs.map(({ pair }) => (
                    <div key={pair} className="grid min-w-0 grid-cols-[64px_76px_minmax(0,1fr)_20px] items-center gap-3">
                      <span className="truncate text-sm font-extrabold text-zinc-100">{pair}</span>

                      <span className="w-fit justify-self-start whitespace-nowrap rounded-full bg-[#172331] px-2.5 py-1 text-[10px] font-bold text-[#9BAABD]">
                        Neutral
                      </span>

                      <span className="justify-self-end whitespace-nowrap text-sm font-bold text-zinc-100">
                        {formatPrice(pair, livePrices[pair])}
                      </span>

                      <span className="flex justify-self-end">
                        <span className="text-[#9BAABD]">•</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex min-h-0 flex-col px-5 py-4">
                <h2 className="shrink-0 text-base font-extrabold text-zinc-100">Performance</h2>
                <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-6 text-sm font-bold">
                  <div className="flex items-center justify-between gap-3">
                    <span className="whitespace-nowrap text-[#8EA2B8]">Win rate</span>
                    <span className="whitespace-nowrap text-zinc-100">
                      {journalSummary.winRate !== null ? `${journalSummary.winRate.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="whitespace-nowrap text-[#8EA2B8]">Avg R</span>
                    <span className="whitespace-nowrap text-zinc-100">
                      {journalSummary.averageR !== null ? `${journalSummary.averageR.toFixed(2)}R` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[#159FFF]">
                    <span>Saved</span>
                    <span>{journalSummary.totalEntries}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
