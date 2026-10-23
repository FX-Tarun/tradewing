/**
 * Trade Case Summary — template overlay.
 *
 * The exported summary is the supplied TradeWing template image used
 * UNCHANGED as the background (768 x 1376 px). This module only draws
 * saved Journal / Checklist data *into the template's blank fields*.
 * It never draws backgrounds, panels, masks or labels of its own, so
 * every pre-printed heading, ring, border and icon stays visible.
 *
 * Every coordinate below was measured from the template's pixels (the
 * blank value boxes were detected by their fill colour, the rings by
 * their dark inner discs), not estimated by eye.
 *
 * ONE reference ID: `getTradeReferenceId(entry)` is the single source
 * for the displayed reference AND the downloaded filename.
 */

export const TEMPLATE_WIDTH = 768;
export const TEMPLATE_HEIGHT = 1376;
export const TEMPLATE_PUBLIC_PATH = "/tradewing-journal-template.jpg";
export const EXPORT_SCALE = 2;

export const FONT_STACK =
  "'Segoe UI', Roboto, Arial, 'Liberation Sans', Helvetica, sans-serif";

/* =============================================================== */
/* INPUT TYPE — structural subset of the saved Journal entry        */
/* =============================================================== */

export type TradeSummarySnapshot = {
  timeframes: { label: string; score: number }[];
  overallScore?: number;
  setupValid?: boolean;
} | null;

export type TradeSummaryInput = {
  id: string;
  savedAt: string;

  pair: string;
  direction: "Long" | "Short";
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

  attachedSnapshot: TradeSummarySnapshot;

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

  exitPrice: string;
  exitReason: string;
  result: "WIN" | "LOSS" | "BE";
  pnl: string;
  rMultiple: string;
};

/** The single source of the displayed reference and the filename. */
export function getTradeReferenceId(entry: { id: string }): string {
  return entry.id;
}

/* =============================================================== */
/* MEASURED TEMPLATE GEOMETRY                                       */
/* =============================================================== */

export type Box = { x0: number; y0: number; x1: number; y1: number };

export const BOX = {
  pair: { x0: 178, y0: 126, x1: 362, y1: 148 },
  direction: { x0: 180, y0: 160, x1: 361, y1: 183 },
  setup: { x0: 180, y0: 196, x1: 361, y1: 217 },
  session: { x0: 178, y0: 229, x1: 363, y1: 253 },

  entry: { x0: 178, y0: 302, x1: 362, y1: 325 },
  stop: { x0: 178, y0: 337, x1: 362, y1: 361 },
  takeProfit: { x0: 180, y0: 372, x1: 363, y1: 394 },
  rrr: { x0: 178, y0: 406, x1: 363, y1: 429 },
  risk: { x0: 181, y0: 437, x1: 362, y1: 463 },
  target: { x0: 178, y0: 475, x1: 362, y1: 499 },

  weekly: { x0: 178, y0: 519, x1: 362, y1: 544 },
  daily: { x0: 178, y0: 557, x1: 362, y1: 583 },
  h4: { x0: 178, y0: 595, x1: 362, y1: 621 },
  ltf: { x0: 178, y0: 634, x1: 361, y1: 659 },

  pnl: { x0: 531, y0: 507, x1: 726, y1: 529 },
  exitPrice: { x0: 531, y0: 542, x1: 726, y1: 564 },
  exitReason: { x0: 531, y0: 577, x1: 725, y1: 601 },
  outcome: { x0: 530, y0: 613, x1: 726, y1: 659 },

  emoTL: { x0: 37, y0: 739, x1: 193, y1: 769 },
  emoTR: { x0: 208, y0: 740, x1: 364, y1: 769 },
  emoBL: { x0: 37, y0: 784, x1: 193, y1: 817 },
  emoBR: { x0: 208, y0: 785, x1: 364, y1: 815 },

  happened: { x0: 37, y0: 874, x1: 367, y1: 992 },
  learned: { x0: 37, y0: 1043, x1: 367, y1: 1132 },
  notes: { x0: 401, y0: 1040, x1: 733, y1: 1132 },

  before: { x0: 37, y0: 1180, x1: 263, y1: 1280 },
  during: { x0: 271, y0: 1180, x1: 497, y1: 1280 },
  after: { x0: 505, y0: 1180, x1: 730, y1: 1280 },
} satisfies Record<string, Box>;

/** Inner dark discs of the rings (cx, cy, inner radius). */
export const CHECKLIST_RINGS = [
  { key: "W", cx: 684, cy: 160, r: 23 },
  { key: "D", cx: 684, cy: 239, r: 23 },
  { key: "4H", cx: 684, cy: 318, r: 23 },
  { key: "LTF", cx: 684, cy: 397, r: 23 },
] as const;

export const EXEC_RINGS = {
  entry: { cx: 687.5, cy: 761.5, r: 25 },
  exit: { cx: 687.5, cy: 854, r: 25 },
  review: { cx: 687.5, cy: 946.5, r: 25 },
} as const;

/**
 * Interior of the empty 0-10 score slots in Execution Review.
 * Each slot is a capsule: bright outline, a 1px dark gap row, then the
 * dark interior (rows 754-760 / 807-813 / 864-870 / 947-953, columns
 * 409-628, measured from the template). These boxes sit 1px INSIDE that
 * interior so a fill can never touch the printed outline.
 */
export const EXEC_TRACKS = {
  entry: { x0: 410, y0: 755, x1: 627, y1: 760 },
  management: { x0: 410, y0: 808, x1: 627, y1: 813 },
  exit: { x0: 410, y0: 865, x1: 627, y1: 870 },
  review: { x0: 410, y0: 948, x1: 627, y1: 953 },
} satisfies Record<string, Box>;

/** Free, artwork-free strip under the footer title. */
export const FOOTER_REF = { cx: 384, baseline: 1369, maxWidth: 252 };

/** Value slot to the right of the "Overall Execution" label. */
export const OVERALL_VALUE = { xStart: 688, baseline: 1172, maxWidth: 42 };

/* =============================================================== */
/* TEXT MEASUREMENT + FITTING                                       */
/* =============================================================== */

export type Measure = (
  text: string,
  size: number,
  weight: number,
  letterSpacing?: number
) => number;

/** Fallback only; the browser path uses canvas measureText instead. */
export const approxMeasure: Measure = (text, size, weight, letterSpacing = 0) => {
  let em = 0;
  for (const ch of Array.from(text)) {
    if (ch === " ") em += 0.28;
    else if ("ijlI!.,:;'|()[]ft".includes(ch)) em += 0.32;
    else if ("mwMW@%".includes(ch)) em += 0.86;
    else if (ch >= "A" && ch <= "Z") em += 0.68;
    else if (ch >= "0" && ch <= "9") em += 0.56;
    else em += 0.53;
  }
  const bold = weight >= 600 ? 1.07 : 1;
  return em * size * bold + letterSpacing * Array.from(text).length;
};

/** Accurate measurement with the real font stack, in the browser. */
export function createCanvasMeasure(): Measure {
  if (typeof document === "undefined") return approxMeasure;

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return approxMeasure;

  return (text, size, weight, letterSpacing = 0) => {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    return (
      ctx.measureText(text).width + letterSpacing * Array.from(text).length
    );
  };
}

/** XML-safe text: strips characters that make an SVG fail to load. */
function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/\r\n?/g, "\n");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneLine(value: unknown): string {
  return clean(value).replace(/\s+/g, " ").trim();
}

function ellipsize(
  text: string,
  maxW: number,
  size: number,
  weight: number,
  measure: Measure
): string {
  if (measure(text, size, weight) <= maxW) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && measure(chars.join("") + "…", size, weight) > maxW) {
    chars.pop();
  }
  return chars.join("").trimEnd() + "…";
}

function fitLine(
  text: string,
  maxW: number,
  sizes: number[],
  weight: number,
  measure: Measure
): { text: string; size: number } {
  for (const size of sizes) {
    if (measure(text, size, weight) <= maxW) return { text, size };
  }
  const size = sizes[sizes.length - 1];
  return { text: ellipsize(text, maxW, size, weight, measure), size };
}

function wrapLines(
  text: string,
  maxW: number,
  size: number,
  weight: number,
  measure: Measure
): string[] {
  const out: string[] = [];

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/[ \t]+/).filter(Boolean);

    if (words.length === 0) {
      out.push("");
      continue;
    }

    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (measure(candidate, size, weight) <= maxW) {
        line = candidate;
        continue;
      }

      if (line) {
        out.push(line);
        line = "";
      }

      if (measure(word, size, weight) <= maxW) {
        line = word;
        continue;
      }

      // A single token wider than the box (e.g. a long URL): break it.
      let chunk = "";
      for (const ch of Array.from(word)) {
        if (measure(chunk + ch, size, weight) <= maxW) {
          chunk += ch;
        } else {
          out.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    }

    out.push(line);
  }

  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

type Paragraph = { size: number; lineHeight: number; lines: string[] };

function fitParagraph(
  text: string,
  w: number,
  h: number,
  sizes: number[],
  lhRatio: number,
  weight: number,
  measure: Measure
): Paragraph {
  for (const size of sizes) {
    const lines = wrapLines(text, w, size, weight, measure);
    const maxLines = Math.floor(h / (size * lhRatio));
    if (lines.length <= maxLines) {
      return { size, lineHeight: size * lhRatio, lines };
    }
  }

  const size = sizes[sizes.length - 1];
  const maxLines = Math.max(1, Math.floor(h / (size * lhRatio)));
  const lines = wrapLines(text, w, size, weight, measure).slice(0, maxLines);
  const last = lines.length - 1;
  lines[last] = ellipsize(lines[last] + "…", w, size, weight, measure);
  if (!lines[last].endsWith("…")) lines[last] += "…";
  return { size, lineHeight: size * lhRatio, lines };
}

/* =============================================================== */
/* COLOURS                                                          */
/* =============================================================== */

/** Shared text x for the two value columns of the template. */
const LEFT_TEXT_X = 188;
const RIGHT_TEXT_X = 541;

const INK = "#EAF6FF";
const MUTED = "#7FA6C0";
const CYAN = "#28D7F5";
const GREEN = "#19D5A2";
const RED = "#FF5968";
const AMBER = "#FBBF24";

function biasColor(value: string): string {
  const v = value.toLowerCase();
  if (v === "bullish") return GREEN;
  if (v === "bearish") return RED;
  return "#B4C7D8";
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =============================================================== */
/* BUILDER                                                          */
/* =============================================================== */

export type BuildOptions = {
  /** Output pixel scale. The viewBox stays 768 x 1376. */
  scale?: number;
  measure?: Measure;
};

/**
 * Builds the complete SVG: the template image as background plus text
 * overlays in the blank fields. `templateDataUrl` MUST be a data: URL —
 * an SVG rendered through <img>/canvas cannot load external images.
 */
export function buildTradeSummarySvg(
  entry: TradeSummaryInput,
  templateDataUrl: string,
  options: BuildOptions = {}
): string {
  const scale = options.scale ?? 1;
  const measure = options.measure ?? approxMeasure;
  const out: string[] = [];

  const text = (
    x: number,
    y: number,
    size: number,
    weight: number,
    fill: string,
    value: string,
    anchor: "start" | "middle" | "end" = "start",
    extra = ""
  ) => {
    if (!value) return;
    out.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" ` +
        `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${extra}>` +
        `${esc(value)}</text>`
    );
  };

  /* A single-line value inside a blank field box. */
  const field = (
    box: Box,
    raw: unknown,
    color: string = INK,
    textX?: number
  ) => {
    const value = oneLine(raw);
    if (!value) return;
    // Detected box edges vary by a few px, so columns pass one shared x.
    const x = textX ?? box.x0 + 10;
    const maxW = box.x1 - 8 - x;
    const fitted = fitLine(value, maxW, [13, 12, 11, 10, 9], 600, measure);
    const cy = (box.y0 + box.y1) / 2;
    text(x, cy + fitted.size * 0.35, fitted.size, 600, color, fitted.text);
  };

  /* A wrapped paragraph inside a rectangular area. */
  const paragraph = (
    area: Box,
    raw: unknown,
    sizes: number[],
    fill: string = INK
  ) => {
    const value = clean(raw).trim();
    if (!value) return;
    const w = area.x1 - area.x0;
    const h = area.y1 - area.y0;
    const p = fitParagraph(value, w, h, sizes, 1.28, 500, measure);
    p.lines.forEach((line, i) => {
      text(
        area.x0,
        area.y0 + p.size * 0.9 + i * p.lineHeight,
        p.size,
        500,
        fill,
        line
      );
    });
  };

  /* ------------------------------------------------------------ */
  /* svg + background                                              */
  /* ------------------------------------------------------------ */

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `width="${TEMPLATE_WIDTH * scale}" height="${TEMPLATE_HEIGHT * scale}" ` +
      `viewBox="0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}" ` +
      `font-family="${FONT_STACK}">`
  );

  out.push(
    `<defs><linearGradient id="twFill" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0%" stop-color="#087BDA"/>` +
      `<stop offset="100%" stop-color="#28D7F5"/>` +
      `</linearGradient></defs>`
  );

  out.push(
    `<image x="0" y="0" width="${TEMPLATE_WIDTH}" height="${TEMPLATE_HEIGHT}" ` +
      `preserveAspectRatio="none" xlink:href="${templateDataUrl}"/>`
  );

  /* ------------------------------------------------------------ */
  /* TRADE IDENTIFICATION                                          */
  /* ------------------------------------------------------------ */

  field(BOX.pair, entry.pair, INK, LEFT_TEXT_X);
  field(
    BOX.direction,
    entry.direction,
    entry.direction === "Long" ? GREEN : RED,
    LEFT_TEXT_X
  );
  field(BOX.setup, entry.setupType, INK, LEFT_TEXT_X);
  field(BOX.session, entry.session, INK, LEFT_TEXT_X);

  /* ------------------------------------------------------------ */
  /* TRADE PARAMETERS                                              */
  /* ------------------------------------------------------------ */

  field(BOX.entry, entry.entryPrice, INK, LEFT_TEXT_X);
  field(BOX.stop, entry.stopLoss, INK, LEFT_TEXT_X);
  field(BOX.takeProfit, entry.takeProfit, INK, LEFT_TEXT_X);
  field(BOX.rrr, entry.riskReward, INK, LEFT_TEXT_X);
  field(BOX.risk, entry.risk, INK, LEFT_TEXT_X);
  field(BOX.target, entry.target, INK, LEFT_TEXT_X);

  field(BOX.weekly, entry.weeklyBias, biasColor(entry.weeklyBias), LEFT_TEXT_X);
  field(BOX.daily, entry.dailyBias, biasColor(entry.dailyBias), LEFT_TEXT_X);
  field(BOX.h4, entry.h4Bias, biasColor(entry.h4Bias), LEFT_TEXT_X);
  field(BOX.ltf, entry.ltfBias, biasColor(entry.ltfBias), LEFT_TEXT_X);

  /* ------------------------------------------------------------ */
  /* CHECKLIST SNAPSHOT — score inside each ring                   */
  /* Only drawn when a snapshot is attached; otherwise rings stay  */
  /* exactly as printed (no "0%" placeholders).                    */
  /* ------------------------------------------------------------ */

  if (entry.attachedSnapshot) {
    const labelToKey: Record<string, string> = {
      WEEKLY: "W",
      DAILY: "D",
      "4H": "4H",
      "LOWER TF": "LTF",
    };

    for (const ring of CHECKLIST_RINGS) {
      const tf = entry.attachedSnapshot.timeframes.find(
        (t) => labelToKey[t.label.trim().toUpperCase()] === ring.key
      );
      if (!tf) continue;

      const score = Math.max(0, Math.min(100, Math.round(tf.score)));
      const color = score >= 70 ? GREEN : CYAN;
      text(ring.cx, ring.cy + 5, 14, 800, color, `${score}%`, "middle");
    }
  }

  /* ------------------------------------------------------------ */
  /* RESULT / OUTCOME                                              */
  /* ------------------------------------------------------------ */

  field(BOX.pnl, entry.pnl, INK, RIGHT_TEXT_X);
  field(BOX.exitPrice, entry.exitPrice, INK, RIGHT_TEXT_X);
  field(BOX.exitReason, entry.exitReason, INK, RIGHT_TEXT_X);

  {
    const b = BOX.outcome;
    const cy = (b.y0 + b.y1) / 2;
    const label =
      entry.result === "WIN"
        ? "WIN"
        : entry.result === "LOSS"
          ? "LOSS"
          : "BREAKEVEN";
    const color =
      entry.result === "WIN" ? GREEN : entry.result === "LOSS" ? RED : AMBER;

    text(b.x0 + 12, cy + 6, 17, 800, color, label);

    const r = oneLine(entry.rMultiple);
    if (r) {
      const fitted = fitLine(r, 80, [15, 13, 11], 800, measure);
      text(b.x1 - 10, cy + 5.5, fitted.size, 800, CYAN, fitted.text, "end");
    }
  }

  /* ------------------------------------------------------------ */
  /* EXECUTION REVIEW                                              */
  /* Entry Execution <- Entry Quality, Trade Mgmt <- Management,   */
  /* Review Summary <- average of the four saved ratings.          */
  /* Exit Execution has no saved counterpart and stays blank.      */
  /* ------------------------------------------------------------ */

  const ratings = [
    entry.entryQuality,
    entry.patience,
    entry.ruleAdherence,
    entry.management,
  ].map((n) => (Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0));
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  const fillTrack = (t: Box, value: number) => {
    const ratio = Math.max(0, Math.min(1, value / 10));
    if (ratio <= 0) return;
    const h = t.y1 - t.y0;
    const w = (t.x1 - t.x0) * ratio;
    out.push(
      `<rect x="${t.x0}" y="${t.y0}" width="${w.toFixed(1)}" ` +
        `height="${h}" rx="${(h / 2).toFixed(1)}" fill="url(#twFill)"/>`
    );
  };

  fillTrack(EXEC_TRACKS.entry, entry.entryQuality);
  fillTrack(EXEC_TRACKS.management, entry.management);
  fillTrack(EXEC_TRACKS.review, average);

  const ringScore = (
    ring: { cx: number; cy: number },
    main: string
  ) => {
    text(ring.cx, ring.cy + 3, 17, 800, INK, main, "middle");
    text(ring.cx, ring.cy + 14, 8, 700, MUTED, "/10", "middle");
  };

  // A rating of 0 / missing means "not rated" — draw nothing, never "0/10".
  if (entry.entryQuality > 0) {
    ringScore(EXEC_RINGS.entry, String(Math.round(entry.entryQuality)));
  }

  if (average > 0) {
    ringScore(EXEC_RINGS.review, average.toFixed(1));
    text(
      OVERALL_VALUE.xStart,
      OVERALL_VALUE.baseline,
      14,
      800,
      CYAN,
      average.toFixed(1)
    );
  }

  /* ------------------------------------------------------------ */
  /* EMOTIONAL STATE                                               */
  /* Icons sit at the left of each box, so text starts after them. */
  /* Before -> top-left, During -> top-right, After -> bottom-left.*/
  /* ------------------------------------------------------------ */

  const emotion = (box: Box, iconRight: number, label: string, raw: unknown) => {
    const value = oneLine(raw);
    if (!value) return;
    const x = iconRight + 8;
    const maxW = box.x1 - 8 - x;
    const fitted = fitLine(value, maxW, [12.5, 11.5, 10.5, 9.5], 700, measure);
    text(x, box.y0 + 11, 7.5, 700, MUTED, label, "start", ' letter-spacing="0.8"');
    text(x, box.y0 + 24, fitted.size, 700, INK, fitted.text);
  };

  emotion(BOX.emoTL, 67, "BEFORE", entry.emotionBefore);
  emotion(BOX.emoTR, 237, "DURING", entry.emotionDuring);
  emotion(BOX.emoBL, 67, "AFTER", entry.emotionAfter);

  /* ------------------------------------------------------------ */
  /* LONG-FORM TEXT                                                */
  /* ------------------------------------------------------------ */

  // WHAT HAPPENED (JOURNAL): top edge of the box has a 4px glow.
  paragraph(
    { x0: 47, y0: 887, x1: 357, y1: 984 },
    entry.whatHappened,
    [12.5, 12, 11.5, 11, 10.5, 10, 9.5]
  );

  // WHAT I LEARNED
  paragraph(
    { x0: 47, y0: 1053, x1: 357, y1: 1125 },
    entry.whatLearned,
    [12.5, 12, 11.5, 11, 10.5, 10, 9.5]
  );

  // GENERAL NOTES <- "why I took this trade" (labelled so it is unambiguous)
  {
    const why = clean(entry.whyTaken).trim();
    if (why) {
      text(411, 1054, 7.5, 700, MUTED, "WHY I TOOK THIS TRADE", "start", ' letter-spacing="0.8"');
      paragraph(
        { x0: 411, y0: 1060, x1: 723, y1: 1126 },
        why,
        [12, 11.5, 11, 10.5, 10, 9.5]
      );
    }
  }

  // WHAT I CORRECT NEXT TIME: one saved text, flowed top-to-bottom through
  // the three boxes. The printed "Before / During / After" labels occupy
  // the top ~25px of each box, so text starts below them.
  {
    const value = clean(entry.whatCorrect).trim();
    if (value) {
      const colW = 208;
      const colH = 58;
      const slots = [BOX.before, BOX.during, BOX.after];
      let chosen: { size: number; lines: string[]; per: number } | null = null;

      for (const size of [12, 11.5, 11, 10.5, 10, 9.5]) {
        const per = Math.floor(colH / (size * 1.25));
        const lines = wrapLines(value, colW, size, 500, measure);
        if (lines.length <= per * 3) {
          chosen = { size, lines, per };
          break;
        }
        if (size === 9.5) {
          const per2 = Math.max(1, per);
          const cut = lines.slice(0, per2 * 3);
          const last = cut.length - 1;
          cut[last] = ellipsize(cut[last] + "…", colW, size, 500, measure);
          chosen = { size, lines: cut, per: per2 };
        }
      }

      if (chosen) {
        chosen.lines.forEach((line, i) => {
          const col = Math.floor(i / chosen!.per);
          const row = i % chosen!.per;
          const slot = slots[col];
          text(
            slot.x0 + 9,
            1215 + chosen!.size * 0.9 + row * chosen!.size * 1.25,
            chosen!.size,
            500,
            INK,
            line
          );
        });
      }
    }
  }

  /* ------------------------------------------------------------ */
  /* REFERENCE (clean strip under the footer title)                */
  /* ------------------------------------------------------------ */

  {
    const ref = getTradeReferenceId(entry);
    const stamp = formatStamp(entry.savedAt);
    const label = oneLine(`REF ${ref}${stamp ? `  ·  ${stamp}` : ""}`);
    const fitted = fitLine(label, FOOTER_REF.maxWidth, [8.5, 8, 7.5, 7, 6.5], 600, measure);
    text(
      FOOTER_REF.cx,
      FOOTER_REF.baseline,
      fitted.size,
      600,
      MUTED,
      fitted.text,
      "middle",
      ' letter-spacing="0.3"'
    );
  }

  out.push("</svg>");
  return out.join("");
}

/* =============================================================== */
/* BROWSER HELPERS                                                  */
/* =============================================================== */

let templatePromise: Promise<string> | null = null;

/** Loads the template once and returns it as a data: URL. */
export function loadTemplateDataUrl(): Promise<string> {
  if (!templatePromise) {
    templatePromise = (async () => {
      const response = await fetch(TEMPLATE_PUBLIC_PATH);
      if (!response.ok) {
        throw new Error(
          `Template image not found at ${TEMPLATE_PUBLIC_PATH}. ` +
            `Copy tradewing-journal-template.jpg into the project's public/ folder.`
        );
      }
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the template image."));
        reader.readAsDataURL(blob);
      });
    })().catch((error) => {
      templatePromise = null; // allow retry
      throw error;
    });
  }
  return templatePromise;
}

/** Rasterises the SVG to a PNG at its own pixel size. */
export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number
): Promise<Blob> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  );

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The summary image failed to render."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PNG encoding failed.")),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
