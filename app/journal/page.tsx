"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSnapshotsForPair,
  getAllSnapshots,
  deleteAllSnapshots,
  type ChecklistSnapshot,
} from "@/lib/checklistSnapshots";
import {
  EXPORT_SCALE,
  TEMPLATE_HEIGHT,
  TEMPLATE_WIDTH,
  buildTradeSummarySvg,
  createCanvasMeasure,
  getTradeReferenceId,
  loadTemplateDataUrl,
  svgToPngBlob,
} from "@/lib/tradeSummary";
import {
  Plus,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Target,
  Activity,
  Gauge,
  Shield,
  Upload,
  X,
  Check,
  Circle,
  BookOpen,
  Trash2,
  Eye,
  Download,
} from "lucide-react";

/* =============================================================== */
/* JOURNAL PERSISTENCE                                             */
/*                                                                  */
/* This is the ACTUAL saved-journal storage. Previously "Save       */
/* Journal" only triggered a visual pulse and never wrote anywhere  */
/* — the "Saved Journal" button just scrolled to a table of         */
/* hard-coded demo rows (TW-1042 etc). Neither of those was real    */
/* data. This key/read/write pair is the real mechanism: every      */
/* click of Save Journal appends one frozen record here, and the    */
/* "Saved Journal" table now renders directly from this storage —   */
/* the demo rows are gone entirely.                                 */
/* =============================================================== */

const JOURNAL_STORAGE_KEY = "tradewing.journalEntries";

type UploadSlotState = { name: string; url: string } | null;

type ValidityItem = { label: string; checked: boolean };

type SavedJournalEntry = {
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

  attachedSnapshot: ChecklistSnapshot | null;

  beforeSlot: UploadSlotState;
  entrySlot: UploadSlotState;
  afterSlot: UploadSlotState;

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

  validity: ValidityItem[];

  exitPrice: string;
  exitReason: string;
  result: "WIN" | "LOSS" | "BE";
  pnl: string;
  rMultiple: string;
};

function readSavedJournals(): SavedJournalEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedJournalEntry[]) : [];
  } catch {
    return [];
  }
}

function writeSavedJournals(entries: SavedJournalEntry[]) {
  if (typeof window === "undefined") return;

  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(JOURNAL_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        JOURNAL_STORAGE_KEY,
        JSON.stringify(entries)
      );
    }
  } catch {
    // Never crash the Journal UI because storage failed.
  }
}

function createJournalId() {
  return `J-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* =============================================================== */
/* SHARED CARD                                                      */
/* =============================================================== */

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-[#17304A] bg-[#09111A] ${className}`}
  >
    {children}
  </div>
);

/* =============================================================== */
/* DEMO DATA — analytics placeholders only. NOT trade-log data.    */
/* =============================================================== */

type Kpi = {
  label: string;
  value: string;
  meta: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber";
};

const KPIS: Kpi[] = [
  {
    label: "Total Trades",
    value: "128",
    meta: "+6 this month",
    icon: <Activity size={15} />,
    tone: "blue",
  },
  {
    label: "Win Rate",
    value: "61%",
    meta: "78W · 50L",
    icon: <Target size={15} />,
    tone: "green",
  },
  {
    label: "Average R",
    value: "1.6R",
    meta: "per closed trade",
    icon: <TrendingUp size={15} />,
    tone: "blue",
  },
  {
    label: "Net R",
    value: "+42.8R",
    meta: "trailing 90 days",
    icon: <Gauge size={15} />,
    tone: "green",
  },
  {
    label: "Expectancy",
    value: "+0.34R",
    meta: "per trade taken",
    icon: <TrendingUp size={15} />,
    tone: "blue",
  },
  {
    label: "Discipline Score",
    value: "84%",
    meta: "rules respected",
    icon: <Shield size={15} />,
    tone: "amber",
  },
];

const EQUITY_CURVE = [
  0, 1.2, 0.6, 2.1, 3.4, 2.8, 4.6, 6.1, 5.3, 7.4, 9.0, 8.1, 10.6, 12.4, 11.8,
  14.2, 16.0, 15.1, 17.8, 19.6, 18.4, 21.0, 23.2, 22.0, 25.4, 27.8, 26.6,
  29.9, 32.4, 30.8, 33.6, 36.1, 34.9, 37.8, 40.2, 38.6, 42.8,
];

const PAIR_PERFORMANCE = [
  { label: "XAUUSD", trades: 41, winRate: 66, netR: "+18.4R" },
  { label: "EURUSD", trades: 33, winRate: 58, netR: "+9.1R" },
  { label: "GBPUSD", trades: 27, winRate: 55, netR: "+6.6R" },
  { label: "USDJPY", trades: 18, winRate: 61, netR: "+5.2R" },
  { label: "AUDUSD", trades: 9, winRate: 44, netR: "+3.5R" },
];

const SETUP_PERFORMANCE = [
  { label: "Break & Retest", trades: 39, winRate: 64, netR: "+15.9R" },
  { label: "AOI Rejection", trades: 35, winRate: 60, netR: "+11.3R" },
  { label: "Head & Shoulders", trades: 22, winRate: 55, netR: "+7.0R" },
  { label: "EMA Reclaim", trades: 19, winRate: 58, netR: "+5.4R" },
  { label: "SOS Continuation", trades: 13, winRate: 62, netR: "+3.2R" },
];

const EXECUTION_METRICS = [
  { label: "Entry Quality", value: 82 },
  { label: "Patience", value: 74 },
  { label: "Rule Adherence", value: 88 },
  { label: "Management", value: 69 },
];

const FILTER_GROUPS: { label: string; options: string[] }[] = [
  { label: "Pair", options: ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY"] },
  { label: "Direction", options: ["Long", "Short"] },
  {
    label: "Setup",
    options: ["Break & Retest", "AOI Rejection", "Head & Shoulders"],
  },
  { label: "Session", options: ["London", "New York", "Asia"] },
  { label: "Result", options: ["Win", "Loss", "Breakeven"] },
];

const EMOTIONAL_STATES = [
  "Calm",
  "Confident",
  "Anxious",
  "Impatient",
  "Fearful",
  "Greedy",
  "Frustrated",
  "Neutral",
];

const INITIAL_VALIDITY: ValidityItem[] = [
  { label: "Setup followed system", checked: true },
  { label: "Checklist completed", checked: true },
  { label: "Risk respected", checked: true },
  { label: "Planned entry respected", checked: false },
  { label: "Entered too early", checked: false },
  { label: "Moved stop loss", checked: false },
  { label: "Interfered with trade", checked: false },
  { label: "Overmanaged trade", checked: false },
];

/* =============================================================== */
/* SMALL SHARED UI PIECES                                          */
/* =============================================================== */

function SectionHeading({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4E718D]">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-[17px] font-extrabold text-zinc-100">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function ToneDot({ tone }: { tone: Kpi["tone"] }) {
  const color =
    tone === "green"
      ? "bg-[#19D5A2] shadow-[0_0_8px_rgba(25,213,162,0.7)]"
      : tone === "amber"
        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
        : "bg-[#159BFF] shadow-[0_0_8px_rgba(21,155,255,0.7)]";
  return <span className={`h-[6px] w-[6px] rounded-full ${color}`} />;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const valueColor =
    kpi.tone === "green"
      ? "text-[#19D5A2]"
      : kpi.tone === "amber"
        ? "text-amber-400"
        : "text-zinc-100";

  return (
    <Card className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6D86A0]">
          {kpi.label}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#17304A] bg-[#0D1723] text-[#159BFF]">
          {kpi.icon}
        </span>
      </div>
      <div className={`text-[26px] font-black leading-none ${valueColor}`}>
        {kpi.value}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6D86A0]">
        <ToneDot tone={kpi.tone} />
        {kpi.meta}
      </div>
    </Card>
  );
}

function BarRow({
  label,
  trades,
  winRate,
  netR,
}: {
  label: string;
  trades: number;
  winRate: number;
  netR: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-bold text-zinc-100">{label}</span>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#6D86A0]">
          <span>{trades} trades</span>
          <span className="text-[#19D5A2]">{netR}</span>
        </div>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-[#132337]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#087BDA] to-[#1CB8FF]"
          style={{ width: `${winRate}%` }}
        />
      </div>
    </div>
  );
}

function ExecutionBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "#19D5A2" : value >= 60 ? "#159BFF" : "#FF9F45";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#8EA2B8]">{label}</span>
        <span className="font-bold text-zinc-100">{value}%</span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-[#132337]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: tone }}
        />
      </div>
    </div>
  );
}

function EquityCurve({ data }: { data: number[] }) {
  const width = 640;
  const height = 160;
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathLength = 1400;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[160px] w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#159BFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#159BFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1="0"
          x2={width}
          y1={height * fraction}
          y2={height * fraction}
          stroke="#152233"
          strokeWidth="1"
        />
      ))}

      <polygon
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill="url(#equityFill)"
      />

      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#28D7F5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        }}
        className="animate-[trendReveal_1100ms_ease-out_300ms_forwards]"
      />
    </svg>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? "border-[#1BA8FF] bg-[#0D2032] text-[#28D7F5]"
          : "border-[#17304A] bg-[#0A1420] text-[#8EA2B8] hover:border-[#2A4562] hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6D86A0]">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2 text-[13px] font-semibold text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2 text-[13px] font-semibold text-zinc-100 outline-none transition-colors focus:border-[#1BA8FF]"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

/* =============================================================== */
/* TRADE VISUAL RECORD                                             */
/* =============================================================== */

function UploadSlot({
  label,
  slot,
  onSelect,
  onRemove,
}: {
  label: string;
  slot: UploadSlotState;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />

      {slot ? (
        <div className="group relative aspect-video overflow-hidden rounded-lg border border-[#17304A] bg-[#0A1420]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.url}
            alt={label}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 max-w-[75%] truncate rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
            {slot.name}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border border-[#FF5968]/40 bg-black/60 text-[#FF5968] opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Remove ${label} image`}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#233A52] bg-[#0A1420] text-[#4E718D] transition-colors hover:border-[#1BA8FF] hover:text-[#28D7F5]"
        >
          <Upload size={20} />
          <span className="text-[11px] font-bold uppercase tracking-wide">
            Add Image
          </span>
        </button>
      )}
    </div>
  );
}

/* =============================================================== */
/* RATING SCALE                                                    */
/* =============================================================== */

function RatingScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] font-black text-[#28D7F5]">
          {value}/10
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label}: ${n} out of 10`}
            className={`h-6 flex-1 rounded-[4px] transition-colors ${
              n <= value
                ? "bg-gradient-to-t from-[#087BDA] to-[#28D7F5]"
                : "bg-[#132337] hover:bg-[#1B2E45]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* =============================================================== */
/* VALIDITY ROW                                                     */
/* =============================================================== */

function ValidityRow({
  item,
  onToggle,
}: {
  item: ValidityItem;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-[36px] w-full items-center border-b border-[#14202D] text-left transition-colors hover:bg-[#0C1722] last:border-b-0"
    >
      <span
        className={`mr-3 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-all ${
          item.checked
            ? "border-[#19D5A2] bg-[#19D5A2]/10 text-[#19D5A2] shadow-[0_0_9px_rgba(25,213,162,0.4)]"
            : "border-[#304154] text-transparent"
        }`}
      >
        {item.checked ? <Check size={10} strokeWidth={3} /> : null}
      </span>
      <span
        className={`text-[12.5px] ${
          item.checked ? "font-bold text-white" : "font-semibold text-[#87A1B9]"
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}

/* =============================================================== */
/* RESULT PILL                                                      */
/* =============================================================== */

function ResultPill({
  result,
  active,
  onClick,
}: {
  result: "WIN" | "LOSS" | "BE";
  active: boolean;
  onClick: () => void;
}) {
  const label = result === "BE" ? "Breakeven" : result === "WIN" ? "Win" : "Loss";

  const activeClasses =
    result === "WIN"
      ? "border-[#19D5A2]/50 bg-[#19D5A2]/10 text-[#19D5A2]"
      : result === "LOSS"
        ? "border-[#FF5968]/50 bg-[#FF5968]/10 text-[#FF5968]"
        : "border-amber-400/50 bg-amber-400/10 text-amber-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors ${
        active ? activeClasses : "border-[#17304A] bg-[#0A1420] text-[#6D86A0]"
      }`}
    >
      {label}
    </button>
  );
}

/* =============================================================== */
/* PAIR SEARCH INPUT                                                */
/* Free-text pair field with a dropdown of pairs that already have  */
/* saved Direction Engine checklist snapshots. `refreshSignal`      */
/* forces an immediate re-read of storage (used after Delete All).  */
/* =============================================================== */

function PairSearchInput({
  value,
  onChange,
  refreshSignal,
}: {
  value: string;
  onChange: (value: string) => void;
  refreshSignal: number;
}) {
  const [open, setOpen] = useState(false);
  const [savedPairs, setSavedPairs] = useState<string[]>([]);

  const refreshPairs = () => {
    const pairs = Array.from(
      new Set(
        getAllSnapshots()
          .map((snapshot) => snapshot.pair.trim().toUpperCase())
          .filter(Boolean)
      )
    );
    setSavedPairs(pairs);
  };

  useEffect(() => {
    refreshPairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const query = value.trim().toUpperCase();

  const matches = savedPairs.filter((savedPair) => savedPair.includes(query));

  const selectPair = (selectedPair: string) => {
    onChange(selectedPair);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4E718D]"
        />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            refreshPairs();
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Search pair..."
          autoComplete="off"
          className="w-full rounded-lg border border-[#17304A] bg-[#0A1420] py-2 pl-8 pr-3 text-[13px] font-semibold uppercase text-zinc-100 outline-none transition-colors placeholder:normal-case placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-lg border border-[#17304A] bg-[#09111A] shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {matches.length > 0 ? (
            <>
              <div className="border-b border-[#14202D] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#4E718D]">
                Saved Checklist Pairs
              </div>

              <div className="max-h-52 overflow-y-auto p-1">
                {matches.map((savedPair) => (
                  <button
                    key={savedPair}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPair(savedPair)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px] font-bold transition-colors ${
                      savedPair === query
                        ? "bg-[#0D2032] text-[#28D7F5]"
                        : "text-zinc-100 hover:bg-[#0D2032] hover:text-[#28D7F5]"
                    }`}
                  >
                    <span>{savedPair}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#4E718D]">
                      Saved
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="px-3 py-3 text-[11px] font-semibold leading-relaxed text-[#4E718D]">
              {query
                ? `No saved checklist found for ${query}. You can still type this pair.`
                : "Type a pair such as GBPJPY, USDCAD, AUDNZD or XAUUSD."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =============================================================== */
/* PAGE                                                             */
/* =============================================================== */

export default function JournalPage() {
  /* ---- filters (visual only) ------------------------------------ */
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleFilter = (value: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  /* ---- saved journal storage -------------------------------------- */
  const [savedJournals, setSavedJournals] = useState<SavedJournalEntry[]>([]);

  useEffect(() => {
    setSavedJournals(readSavedJournals());
  }, []);

  const filteredSavedJournals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return savedJournals;

    return savedJournals.filter(
      (entry) =>
        entry.pair.toLowerCase().includes(query) ||
        entry.setupType.toLowerCase().includes(query) ||
        entry.session.toLowerCase().includes(query) ||
        entry.direction.toLowerCase().includes(query) ||
        entry.result.toLowerCase().includes(query)
    );
  }, [savedJournals, search]);

  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(
    null
  );

  const selectedJournal = useMemo(
    () => savedJournals.find((entry) => entry.id === selectedJournalId) ?? null,
    [savedJournals, selectedJournalId]
  );

  /* ---- new entry workspace anchor -------------------------------- */
  const entryRef = useRef<HTMLDivElement | null>(null);
  const scrollToEntry = () => {
    entryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---- A. trade identification ----------------------------------- */
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [date, setDate] = useState("");
  const [setupType, setSetupType] = useState("Break & Retest");
  const [session, setSession] = useState("London");

  /* ---- B. market context ------------------------------------------ */
  const biasOptions = ["Bullish", "Bearish", "Neutral", "Range"];
  const [weeklyBias, setWeeklyBias] = useState("Bullish");
  const [dailyBias, setDailyBias] = useState("Bullish");
  const [h4Bias, setH4Bias] = useState("Neutral");
  const [ltfBias, setLtfBias] = useState("Bullish");

  /* ---- C. trade parameters ---------------------------------------- */
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [risk, setRisk] = useState("1.0%");
  const [target, setTarget] = useState("");
  const [riskReward, setRiskReward] = useState("");

  /* ---- Checklist Snapshot bridge ----------------------------------- */
  const [pairSnapshots, setPairSnapshots] = useState<ChecklistSnapshot[]>([]);
  const [attachedSnapshot, setAttachedSnapshot] =
    useState<ChecklistSnapshot | null>(null);

  /*
   * A signal bumped after "Delete All Saved Data" so both this
   * effect and PairSearchInput's own storage read re-run
   * immediately, even if `pair` itself hasn't changed and even if
   * the Pair field isn't focused at the time of deletion.
   */
  const [snapshotRefreshSignal, setSnapshotRefreshSignal] = useState(0);

  useEffect(() => {
    const normalizedPair = pair.trim().toUpperCase();

    if (!normalizedPair) {
      setPairSnapshots([]);
      setAttachedSnapshot(null);
      return;
    }

    setPairSnapshots(getSnapshotsForPair(normalizedPair));
    setAttachedSnapshot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, snapshotRefreshSignal]);

  /* ---- D. trade visual record -------------------------------------- */
  const [beforeSlot, setBeforeSlot] = useState<UploadSlotState>(null);
  const [entrySlot, setEntrySlot] = useState<UploadSlotState>(null);
  const [afterSlot, setAfterSlot] = useState<UploadSlotState>(null);

  const handleSlotSelect =
    (setter: (v: UploadSlotState) => void) => (file: File) => {
      const url = URL.createObjectURL(file);
      setter({ name: file.name, url });
    };

  /* ---- E. long-form notes ------------------------------------------- */
  const [whyTaken, setWhyTaken] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [whatCorrect, setWhatCorrect] = useState("");

  /* ---- F. execution review -------------------------------------------- */
  const [entryQuality, setEntryQuality] = useState(7);
  const [patience, setPatience] = useState(7);
  const [ruleAdherence, setRuleAdherence] = useState(8);
  const [management, setManagement] = useState(6);

  const [emotionBefore, setEmotionBefore] = useState("Calm");
  const [emotionDuring, setEmotionDuring] = useState("Calm");
  const [emotionAfter, setEmotionAfter] = useState("Calm");

  /* ---- G. trade validity ------------------------------------------------ */
  const [validity, setValidity] = useState<ValidityItem[]>(INITIAL_VALIDITY);

  const toggleValidity = (index: number) => {
    setValidity((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  /* ---- H. result / outcome ---------------------------------------------- */
  const [exitPrice, setExitPrice] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [result, setResult] = useState<"WIN" | "LOSS" | "BE">("WIN");
  const [pnl, setPnl] = useState("");
  const [rMultiple, setRMultiple] = useState("");

  /* ---- save / reset -------------------------------------------------------- */
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedPulseKey, setSavedPulseKey] = useState(0);

  const resetEntry = () => {
    setPair("");
    setDirection("Long");
    setDate("");
    setSetupType("Break & Retest");
    setSession("London");
    setWeeklyBias("Bullish");
    setDailyBias("Bullish");
    setH4Bias("Neutral");
    setLtfBias("Bullish");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setRisk("1.0%");
    setTarget("");
    setRiskReward("");
    setAttachedSnapshot(null);
    setBeforeSlot(null);
    setEntrySlot(null);
    setAfterSlot(null);
    setWhyTaken("");
    setWhatHappened("");
    setWhatLearned("");
    setWhatCorrect("");
    setEntryQuality(5);
    setPatience(5);
    setRuleAdherence(5);
    setManagement(5);
    setEmotionBefore("Calm");
    setEmotionDuring("Calm");
    setEmotionAfter("Calm");
    setValidity(INITIAL_VALIDITY.map((item) => ({ ...item })));
    setExitPrice("");
    setExitReason("");
    setResult("WIN");
    setPnl("");
    setRMultiple("");
    setShowResetConfirm(false);
  };

  /*
   * SAVE JOURNAL — writes ONE complete record to real persistence.
   * This replaces the previous version, which only fired a visual
   * pulse and saved nothing.
   */
  const handleSave = () => {
    const entry: SavedJournalEntry = {
      id: createJournalId(),
      savedAt: new Date().toISOString(),

      pair: pair.trim().toUpperCase(),
      direction,
      date,
      setupType,
      session,

      weeklyBias,
      dailyBias,
      h4Bias,
      ltfBias,

      entryPrice,
      stopLoss,
      takeProfit,
      risk,
      target,
      riskReward,

      attachedSnapshot,

      beforeSlot,
      entrySlot,
      afterSlot,

      whyTaken,
      whatHappened,
      whatLearned,
      whatCorrect,

      entryQuality,
      patience,
      ruleAdherence,
      management,

      emotionBefore,
      emotionDuring,
      emotionAfter,

      validity: validity.map((item) => ({ ...item })),

      exitPrice,
      exitReason,
      result,
      pnl,
      rMultiple,
    };

    const next = [entry, ...savedJournals];
    writeSavedJournals(next);
    setSavedJournals(next);

    setSavedPulseKey((k) => k + 1);
  };

  /* ---- delete all saved data (journals + checklist snapshots) --------- */
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const deleteAllSavedData = () => {
    // Journal entries.
    writeSavedJournals([]);
    setSavedJournals([]);
    setSelectedJournalId(null);

    // Checklist snapshots — reuses the existing shared function
    // rather than a second/competing storage system.
    deleteAllSnapshots();
    setPairSnapshots([]);
    setAttachedSnapshot(null);
    setSnapshotRefreshSignal((k) => k + 1);

    setConfirmDeleteAll(false);
  };

  const openSavedJournal = (entry: SavedJournalEntry) => {
    setSelectedJournalId(entry.id);
  };

  /* ---- Trade Case Summary (template overlay) ------------------------ */
  /*
   * View -> preview -> Download PNG. Preview and export call the SAME
   * builder with the SAME text measurer, so they cannot disagree; only
   * the output scale differs. The reference shown in the modal, drawn
   * on the image and used as the filename all come from
   * getTradeReferenceId(entry) — nothing here generates an ID.
   */
  const [summaryEntry, setSummaryEntry] = useState<SavedJournalEntry | null>(
    null
  );
  const [summaryUrl, setSummaryUrl] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);
  const summaryRequestRef = useRef(0);

  // Revokes the previous preview URL whenever it is replaced or on unmount.
  useEffect(() => {
    return () => {
      if (summaryUrl) URL.revokeObjectURL(summaryUrl);
    };
  }, [summaryUrl]);

  const openSummary = async (entry: SavedJournalEntry) => {
    const requestId = ++summaryRequestRef.current;

    setSummaryEntry(entry);
    setSummaryUrl(null);
    setSummaryError(null);
    setSummaryLoading(true);

    try {
      const template = await loadTemplateDataUrl();
      const svg = buildTradeSummarySvg(entry, template, {
        scale: 1,
        measure: createCanvasMeasure(),
      });

      if (requestId !== summaryRequestRef.current) return; // superseded

      setSummaryUrl(
        URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        )
      );
    } catch (error) {
      if (requestId !== summaryRequestRef.current) return;
      setSummaryError(
        error instanceof Error ? error.message : "Could not build the summary."
      );
    } finally {
      if (requestId === summaryRequestRef.current) setSummaryLoading(false);
    }
  };

  const closeSummary = () => {
    summaryRequestRef.current++;
    setSummaryEntry(null);
    setSummaryUrl(null);
    setSummaryError(null);
    setSummaryLoading(false);
  };

  const downloadSummary = async () => {
    if (!summaryEntry) return;

    setSummaryDownloading(true);
    setSummaryError(null);

    try {
      const template = await loadTemplateDataUrl();
      const svg = buildTradeSummarySvg(summaryEntry, template, {
        scale: EXPORT_SCALE,
        measure: createCanvasMeasure(),
      });

      const blob = await svgToPngBlob(
        svg,
        TEMPLATE_WIDTH * EXPORT_SCALE,
        TEMPLATE_HEIGHT * EXPORT_SCALE
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${getTradeReferenceId(summaryEntry)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "PNG export failed."
      );
    } finally {
      setSummaryDownloading(false);
    }
  };

  return (
    <>
      {/* =========================================================
          PERMANENT ANIMATED BACKGROUND — same language as Dashboard
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05090E]">
        <div className="absolute -left-1/4 -top-1/4 h-[140%] w-[140%] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(21,155,255,0.09),transparent_60%)]" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[140%] w-[140%] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(0,229,160,0.05),transparent_60%)]"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-5 py-6">
        {/* =========================================================
            1. JOURNAL HEADER
        ========================================================= */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#4E718D]">
              <span className="flex items-center gap-1.5 text-[#19D5A2]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#19D5A2] shadow-[0_0_8px_rgba(25,213,162,0.8)]" />
                SYSTEM ONLINE
              </span>
              <span className="text-[#233A52]">/</span>
              TRADEWING
            </div>
            <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-100">
              Journal Intelligence
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("saved-journal-log")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="flex items-center gap-2 rounded-lg border border-[#155E92] bg-[#0A1724] px-4 py-2 text-[12px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032]"
            >
              <BookOpen size={15} className="text-[#28D7F5]" />
              Saved Journal
              {savedJournals.length > 0 && (
                <span className="ml-0.5 rounded-full bg-[#159BFF]/20 px-1.5 py-0.5 text-[10px] font-black text-[#28D7F5]">
                  {savedJournals.length}
                </span>
              )}
            </button>

            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4E718D]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trades..."
                className="w-[200px] rounded-lg border border-[#17304A] bg-[#0A1420] py-2 pl-8 pr-3 text-[12.5px] font-semibold text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
              />
            </div>

            <button
              type="button"
              aria-label="Filters"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#17304A] bg-[#0A1420] text-[#8EA2B8] transition-colors hover:border-[#1BA8FF] hover:text-[#28D7F5]"
            >
              <SlidersHorizontal size={15} />
            </button>

            <button
              type="button"
              onClick={scrollToEntry}
              className="flex items-center gap-2 rounded-lg border border-[#155E92] bg-[#0A1724] px-4 py-2 text-[13px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032]"
            >
              <Plus size={15} className="text-[#28D7F5]" />
              New Journal Entry
            </button>
          </div>
        </div>

        {/* =========================================================
            2. PERFORMANCE OVERVIEW — KPI CARDS
        ========================================================= */}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>

        {/* =========================================================
            3. PERFORMANCE ANALYTICS — Equity / R Curve
        ========================================================= */}

        <div>
          <SectionHeading
            eyebrow="Performance Analytics"
            title="Equity & R Curve"
            right={
              <span className="text-[11px] font-bold text-[#19D5A2]">
                +42.8R trailing 90 days
              </span>
            }
          />
          <Card className="px-5 py-5">
            <EquityCurve data={EQUITY_CURVE} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Performance by Pair
            </div>
            <div className="flex flex-col gap-4">
              {PAIR_PERFORMANCE.map((p) => (
                <BarRow
                  key={p.label}
                  label={p.label}
                  trades={p.trades}
                  winRate={p.winRate}
                  netR={p.netR}
                />
              ))}
            </div>
          </Card>

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Performance by Setup
            </div>
            <div className="flex flex-col gap-4">
              {SETUP_PERFORMANCE.map((s) => (
                <BarRow
                  key={s.label}
                  label={s.label}
                  trades={s.trades}
                  winRate={s.winRate}
                  netR={s.netR}
                />
              ))}
            </div>
          </Card>

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Execution / Discipline
            </div>
            <div className="flex flex-col gap-4">
              {EXECUTION_METRICS.map((m) => (
                <ExecutionBar key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          </Card>
        </div>

        {/* =========================================================
            4 + 5. SAVED JOURNAL (real persisted entries)
        ========================================================= */}

        <div id="saved-journal-log">
          <SectionHeading
            eyebrow="Saved Journal"
            title="Trade Log"
            right={
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-[#6D86A0]">
                  {filteredSavedJournals.length} saved
                </span>

                {savedJournals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#FF5968]/30 bg-[#190D10] px-2.5 py-1.5 text-[10px] font-bold text-[#FF5968] transition-colors hover:border-[#FF5968]/60 hover:bg-[#2B1417]"
                  >
                    <Trash2 size={12} />
                    Delete All Saved Data
                  </button>
                )}
              </div>
            }
          />

          <div className="mb-4 flex flex-col gap-3">
            {FILTER_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-wrap items-center gap-2">
                <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4E718D]">
                  {group.label}
                </span>
                {group.options.map((opt) => (
                  <FilterPill
                    key={opt}
                    label={opt}
                    active={activeFilters.has(opt)}
                    onClick={() => toggleFilter(opt)}
                  />
                ))}
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            {filteredSavedJournals.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-[13px] font-bold text-[#8EA2B8]">
                  No saved journal entries yet.
                </div>
                <div className="mt-1 text-[11px] font-medium text-[#4E718D]">
                  Complete a journal below and click{" "}
                  <span className="font-bold text-[#28D7F5]">Save Journal</span>.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#17304A] bg-[#0B141F] text-[10px] font-bold uppercase tracking-[0.1em] text-[#4E718D]">
                      <th className="px-4 py-3">Trade ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Setup</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">SL</th>
                      <th className="px-4 py-3">TP</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">R:R</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">R Multiple</th>
                      <th className="px-4 py-3">Checklist</th>
                      <th className="px-4 py-3">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSavedJournals.map((entry) => {
                      const selected = entry.id === selectedJournalId;
                      const shortId = `J-${entry.id.slice(-6).toUpperCase()}`;

                      return (
                        <tr
                          key={entry.id}
                          onClick={() => openSavedJournal(entry)}
                          className={`cursor-pointer border-b border-[#14202D] text-[12.5px] font-semibold transition-colors last:border-b-0 ${
                            selected ? "bg-[#0D2032]" : "hover:bg-[#0C1722]"
                          }`}
                        >
                          <td
                            className={`px-4 py-3 font-bold ${
                              selected ? "text-[#28D7F5]" : "text-zinc-100"
                            }`}
                          >
                            {shortId}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.date || "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-100">{entry.pair}</td>
                          <td
                            className={`px-4 py-3 ${
                              entry.direction === "Long"
                                ? "text-[#19D5A2]"
                                : "text-[#FF5968]"
                            }`}
                          >
                            {entry.direction}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.setupType}
                          </td>
                          <td className="px-4 py-3 text-zinc-100">
                            {entry.entryPrice || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.stopLoss || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.takeProfit || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.risk || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8EA2B8]">
                            {entry.riskReward || "—"}
                          </td>
                          <td
                            className={`px-4 py-3 font-bold ${
                              entry.result === "WIN"
                                ? "text-[#19D5A2]"
                                : entry.result === "LOSS"
                                  ? "text-[#FF5968]"
                                  : "text-amber-400"
                            }`}
                          >
                            {entry.result === "BE" ? "BE" : entry.result}
                          </td>
                          <td
                            className={`px-4 py-3 font-bold ${
                              entry.rMultiple.startsWith("+")
                                ? "text-[#19D5A2]"
                                : entry.rMultiple.startsWith("-")
                                  ? "text-[#FF5968]"
                                  : "text-[#8EA2B8]"
                            }`}
                          >
                            {entry.rMultiple || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#159BFF]">
                            {entry.attachedSnapshot
                              ? `${entry.attachedSnapshot.overallScore}%`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openSummary(entry);
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-[#155E92] bg-[#0A1724] px-2.5 py-1 text-[11px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032]"
                            >
                              <Eye size={12} className="text-[#28D7F5]" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {selectedJournal && (
            <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#6D86A0]">
              <Circle
                size={7}
                fill="currentColor"
                strokeWidth={0}
                className="text-[#28D7F5]"
              />
              Selected — {selectedJournal.pair} saved{" "}
              {new Date(selectedJournal.savedAt).toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Full Trade Case File view is a future update.
            </div>
          )}
        </div>

        {/* =========================================================
            6. NEW JOURNAL ENTRY WORKSPACE
        ========================================================= */}

        <div ref={entryRef} className="flex flex-col gap-4 pt-2">
          <SectionHeading
            eyebrow="New Record"
            title="New Journal Entry"
            right={
              <span className="text-[11px] font-semibold text-[#6D86A0]">
                Plan → Record → Review → Analyze → Improve
              </span>
            }
          />

          {/* ---- A. Trade Identification ---------------------------- */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Trade Identification
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Field label="Pair">
                <PairSearchInput
                  value={pair}
                  onChange={(value) => setPair(value.toUpperCase())}
                  refreshSignal={snapshotRefreshSignal}
                />
              </Field>

              <div>
                <FieldLabel>Direction</FieldLabel>
                <div className="flex gap-2">
                  {(["Long", "Short"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirection(d)}
                      className={`flex-1 rounded-lg border py-2 text-[12px] font-bold transition-colors ${
                        direction === d
                          ? d === "Long"
                            ? "border-[#19D5A2]/50 bg-[#19D5A2]/10 text-[#19D5A2]"
                            : "border-[#FF5968]/50 bg-[#FF5968]/10 text-[#FF5968]"
                          : "border-[#17304A] bg-[#0A1420] text-[#6D86A0]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2 text-[13px] font-semibold text-zinc-100 outline-none transition-colors focus:border-[#1BA8FF]"
                />
              </Field>

              <Field label="Setup Type">
                <SelectInput
                  value={setupType}
                  onChange={setSetupType}
                  options={SETUP_PERFORMANCE.map((s) => s.label)}
                />
              </Field>

              <Field label="Session">
                <SelectInput
                  value={session}
                  onChange={setSession}
                  options={["London", "New York", "Asia"]}
                />
              </Field>
            </div>
          </Card>

          {/* ---- Checklist Snapshot (Direction Engine bridge) ------------ */}

          <Card className="px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
                Checklist Snapshot
              </span>
              {attachedSnapshot && (
                <button
                  type="button"
                  onClick={() => setAttachedSnapshot(null)}
                  className="text-[11px] font-bold text-[#159BFF] transition-colors hover:text-[#52C4FF]"
                >
                  Change snapshot
                </button>
              )}
            </div>

            {!attachedSnapshot ? (
              pairSnapshots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#233A52] bg-[#0A1420] px-4 py-5 text-center text-[12px] font-semibold leading-relaxed text-[#4E718D]">
                  {pair.trim()
                    ? `No saved Direction Engine snapshots for ${pair.trim().toUpperCase()} yet.`
                    : "Search or type a pair above to load its saved Direction Engine checklist."}
                  <br />
                  {pair.trim() && (
                    <>
                      Complete the checklist in the Direction Engine and use{" "}
                      <span className="font-bold text-[#28D7F5]">
                        Save to Journal
                      </span>{" "}
                      there first.
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pairSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#17304A] bg-[#0A1420] px-4 py-3"
                    >
                      <div>
                        <div className="text-[13px] font-extrabold text-zinc-100">
                          {snap.pair}
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[#6D86A0]">
                          {new Date(snap.createdAt).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[15px] font-black text-white">
                            {snap.overallScore}%
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              snap.setupValid ? "text-[#19D5A2]" : "text-[#63798C]"
                            }`}
                          >
                            {snap.setupValid ? "Setup Valid" : "Not Ready"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAttachedSnapshot(snap)}
                          className="tw-press rounded-lg border border-[#155E92] bg-[#0A1724] px-3 py-1.5 text-[11px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032]"
                        >
                          Use Snapshot
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4">
                {attachedSnapshot.timeframes.map((tf) => (
                  <div key={tf.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-[0.1em] text-[#28D7F5]">
                        {tf.label}
                      </span>
                      <span className="text-[12px] font-black text-white">
                        {tf.score}%
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[#14202D] bg-[#0A1420]">
                      {tf.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex h-[32px] items-center border-b border-[#14202D] px-3 last:border-b-0"
                        >
                          <span
                            className={`mr-2.5 flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full border ${
                              item.done
                                ? "border-[#19D5A2] bg-[#19D5A2]/10 text-[#19D5A2]"
                                : "border-[#304154] text-transparent"
                            }`}
                          >
                            {item.done ? <Check size={9} strokeWidth={3} /> : null}
                          </span>
                          <span
                            className={`flex-1 truncate text-[11.5px] ${
                              item.done
                                ? "font-bold text-white"
                                : "font-semibold text-[#87A1B9]"
                            }`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`ml-2 text-[10px] font-bold ${
                              item.done ? "text-[#19D5A2]" : "text-[#526B82]"
                            }`}
                          >
                            {item.done ? "+" : ""}
                            {item.weight}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#263746] bg-[#0A1119] px-4 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#526D83]">
                    Total Setup Score
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] font-black text-white">
                      {attachedSnapshot.overallScore}%
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.1em] ${
                        attachedSnapshot.setupValid
                          ? "border-[#19D5A2]/40 bg-[#19D5A2]/10 text-[#19D5A2]"
                          : "border-[#334454] bg-[#111B24] text-[#63798C]"
                      }`}
                    >
                      {attachedSnapshot.setupValid ? "SETUP VALID" : "NOT READY"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ---- B. Market Context ------------------------------------ */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Market Context
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Weekly Bias">
                <SelectInput value={weeklyBias} onChange={setWeeklyBias} options={biasOptions} />
              </Field>
              <Field label="Daily Bias">
                <SelectInput value={dailyBias} onChange={setDailyBias} options={biasOptions} />
              </Field>
              <Field label="4H Bias">
                <SelectInput value={h4Bias} onChange={setH4Bias} options={biasOptions} />
              </Field>
              <Field label="Lower TF Bias">
                <SelectInput value={ltfBias} onChange={setLtfBias} options={biasOptions} />
              </Field>
            </div>
          </Card>

          {/* ---- C. Trade Parameters ------------------------------------ */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Trade Parameters
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Entry Price">
                <TextInput value={entryPrice} onChange={setEntryPrice} placeholder="0.0000" />
              </Field>
              <Field label="Stop Loss">
                <TextInput value={stopLoss} onChange={setStopLoss} placeholder="0.0000" />
              </Field>
              <Field label="Take Profit">
                <TextInput value={takeProfit} onChange={setTakeProfit} placeholder="0.0000" />
              </Field>
              <Field label="Risk">
                <TextInput value={risk} onChange={setRisk} placeholder="1.0%" />
              </Field>
              <Field label="Target">
                <TextInput value={target} onChange={setTarget} placeholder="0.0000" />
              </Field>
              <Field label="Risk : Reward">
                <TextInput value={riskReward} onChange={setRiskReward} placeholder="2.0" />
              </Field>
            </div>
          </Card>

          {/* ---- 7. Trade Visual Record --------------------------------- */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Trade Visual Record
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <UploadSlot
                label="Before Trade"
                slot={beforeSlot}
                onSelect={handleSlotSelect(setBeforeSlot)}
                onRemove={() => setBeforeSlot(null)}
              />
              <UploadSlot
                label="Entry / Confirmation"
                slot={entrySlot}
                onSelect={handleSlotSelect(setEntrySlot)}
                onRemove={() => setEntrySlot(null)}
              />
              <UploadSlot
                label="After Trade"
                slot={afterSlot}
                onSelect={handleSlotSelect(setAfterSlot)}
                onRemove={() => setAfterSlot(null)}
              />
            </div>
          </Card>

          {/* ---- 8. Long-form Trade Notes -------------------------------- */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Trade Notes
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Why did I take this trade?</FieldLabel>
                <textarea
                  value={whyTaken}
                  onChange={(e) => setWhyTaken(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
                  placeholder="The confluence, structure and reasoning behind the entry..."
                />
              </div>
              <div>
                <FieldLabel>What happened?</FieldLabel>
                <textarea
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
                  placeholder="How price actually moved once you were in the trade..."
                />
              </div>
              <div>
                <FieldLabel>What did I learn?</FieldLabel>
                <textarea
                  value={whatLearned}
                  onChange={(e) => setWhatLearned(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
                  placeholder="The genuine takeaway, good or bad..."
                />
              </div>
              <div>
                <FieldLabel>What should I correct next time?</FieldLabel>
                <textarea
                  value={whatCorrect}
                  onChange={(e) => setWhatCorrect(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-[#17304A] bg-[#0A1420] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-[#4E718D] focus:border-[#1BA8FF]"
                  placeholder="One concrete adjustment for the next setup..."
                />
              </div>
            </div>
          </Card>

          {/* ---- 9. Execution Review -------------------------------------- */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Execution Review
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <RatingScale label="Entry Quality" value={entryQuality} onChange={setEntryQuality} />
              <RatingScale label="Patience" value={patience} onChange={setPatience} />
              <RatingScale label="Rule Adherence" value={ruleAdherence} onChange={setRuleAdherence} />
              <RatingScale label="Management" value={management} onChange={setManagement} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#17304A] pt-5 md:grid-cols-3">
              <Field label="Emotional State — Before">
                <SelectInput value={emotionBefore} onChange={setEmotionBefore} options={EMOTIONAL_STATES} />
              </Field>
              <Field label="Emotional State — During">
                <SelectInput value={emotionDuring} onChange={setEmotionDuring} options={EMOTIONAL_STATES} />
              </Field>
              <Field label="Emotional State — After">
                <SelectInput value={emotionAfter} onChange={setEmotionAfter} options={EMOTIONAL_STATES} />
              </Field>
            </div>
          </Card>

          {/* ---- 10. Trade Validity / Rule Check ---------------------------- */}

          <Card className="px-5 py-2">
            <div className="px-3 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Trade Validity
            </div>
            <div className="mt-2 grid grid-cols-1 px-3 md:grid-cols-2">
              {validity.map((item, index) => (
                <ValidityRow key={item.label} item={item} onToggle={() => toggleValidity(index)} />
              ))}
            </div>
          </Card>

          {/* ---- 11. Result / Outcome ------------------------------------------ */}

          <Card className="px-5 py-5">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4E718D]">
              Result / Outcome
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Exit Price">
                <TextInput value={exitPrice} onChange={setExitPrice} placeholder="0.0000" />
              </Field>
              <Field label="Exit Reason">
                <TextInput value={exitReason} onChange={setExitReason} placeholder="TP hit, manual close..." />
              </Field>
              <Field label="P&L">
                <TextInput value={pnl} onChange={setPnl} placeholder="$0.00" />
              </Field>
              <Field label="R Multiple">
                <TextInput value={rMultiple} onChange={setRMultiple} placeholder="+0.0R" />
              </Field>
            </div>

            <div className="mt-4">
              <FieldLabel>Result</FieldLabel>
              <div className="flex gap-2">
                <ResultPill result="WIN" active={result === "WIN"} onClick={() => setResult("WIN")} />
                <ResultPill result="LOSS" active={result === "LOSS"} onClick={() => setResult("LOSS")} />
                <ResultPill result="BE" active={result === "BE"} onClick={() => setResult("BE")} />
              </div>
            </div>
          </Card>

          {/* ---- 12. Save / Reset ------------------------------------------------ */}

          <div className="flex items-center justify-end gap-3 pb-2">
            {savedPulseKey > 0 && (
              <span
                key={savedPulseKey}
                className="text-[11px] font-bold text-[#19D5A2]"
                style={{ animation: "signalPulse 900ms ease-out" }}
              >
                Journal saved successfully
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="rounded-lg border border-[#17304A] bg-[#0A1420] px-5 py-2.5 text-[13px] font-bold text-[#8EA2B8] transition-colors hover:border-[#FF5968]/50 hover:text-[#FF5968]"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-[#155E92] bg-[#0A1724] px-6 py-2.5 text-[13px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032]"
            >
              Save Journal
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          RESET CONFIRMATION DIALOG
      ========================================================= */}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <Card className="w-full max-w-[380px] px-6 py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF5968]/40 bg-[#2B1417] text-[#FF5968]">
              <X size={18} />
            </div>
            <h3 className="text-[15px] font-extrabold text-zinc-100">Reset Journal?</h3>
            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-[#8EA2B8]">
              All unsaved information will be cleared.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border border-[#17304A] bg-[#0A1420] py-2.5 text-[13px] font-bold text-zinc-100 transition-colors hover:border-[#2A4562]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetEntry}
                className="flex-1 rounded-lg border border-[#FF5968]/50 bg-[#2B1417] py-2.5 text-[13px] font-bold text-[#FF5968] transition-colors hover:bg-[#3A1A1D]"
              >
                Reset
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          DELETE ALL SAVED DATA CONFIRMATION
      ========================================================= */}

      {confirmDeleteAll && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5">
          <Card className="w-full max-w-[400px] px-6 py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF5968]/40 bg-[#2B1417] text-[#FF5968]">
              <Trash2 size={17} />
            </div>
            <h3 className="text-[15px] font-extrabold text-zinc-100">
              Delete all saved journal entries and checklist snapshots?
            </h3>
            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-[#8EA2B8]">
              This cannot be undone. Every saved Journal entry and every saved
              Direction Engine checklist snapshot, across every pair, will be
              permanently removed from this browser.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                className="flex-1 rounded-lg border border-[#17304A] bg-[#0A1420] py-2.5 text-[13px] font-bold text-zinc-100 transition-colors hover:border-[#2A4562]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAllSavedData}
                className="flex-1 rounded-lg border border-[#FF5968]/50 bg-[#2B1417] py-2.5 text-[13px] font-bold text-[#FF5968] transition-colors hover:bg-[#3A1A1D]"
              >
                Delete All
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          TRADE CASE SUMMARY — preview + PNG download
      ========================================================= */}

      {summaryEntry && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="flex max-h-full w-full max-w-[560px] flex-col rounded-2xl border border-[#17304A] bg-[#09111A]">
            <div className="flex items-center justify-between gap-3 border-b border-[#17304A] px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4E718D]">
                  Trade Case Summary
                </div>
                <div className="mt-0.5 truncate text-[12px] font-bold text-zinc-100">
                  {getTradeReferenceId(summaryEntry)}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadSummary()}
                  disabled={summaryLoading || summaryDownloading || !summaryUrl}
                  className="flex items-center gap-1.5 rounded-lg border border-[#155E92] bg-[#0A1724] px-3 py-1.5 text-[12px] font-bold text-zinc-100 transition-colors hover:border-[#1BA8FF] hover:bg-[#0D2032] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={13} className="text-[#28D7F5]" />
                  {summaryDownloading ? "Exporting…" : "Download PNG"}
                </button>

                <button
                  type="button"
                  onClick={closeSummary}
                  aria-label="Close summary"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#17304A] text-[#8EA2B8] transition-colors hover:border-[#2A4562] hover:text-zinc-100"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
              {summaryLoading && (
                <div className="py-16 text-[12px] font-semibold text-[#6D86A0]">
                  Building summary…
                </div>
              )}

              {summaryError && (
                <div className="max-w-[420px] rounded-lg border border-[#FF5968]/40 bg-[#2B1417] px-4 py-3 text-[12px] font-semibold leading-relaxed text-[#FF8E99]">
                  {summaryError}
                </div>
              )}

              {summaryUrl && !summaryError && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={summaryUrl}
                  alt={`Trade case summary for ${summaryEntry.pair || "trade"}`}
                  className="h-auto max-h-[78vh] w-auto max-w-full rounded-lg"
                  style={{ aspectRatio: `${TEMPLATE_WIDTH} / ${TEMPLATE_HEIGHT}` }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
