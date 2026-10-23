
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_SYMBOLS = /^[A-Z]{6}$/;

export async function GET(request: Request) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Market data API key is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedSymbols = searchParams.get("symbols") ?? "EUR/USD";

  const symbols = [...new Set(
    requestedSymbols.split(",").map((symbol) => symbol.trim().toUpperCase())
  )];

  if (
    symbols.length < 1 ||
    symbols.length > 5 ||
    symbols.some((symbol) => !ALLOWED_SYMBOLS.test(symbol.replace("/", "")))
  ) {
    return NextResponse.json(
      { error: "Use 1–5 valid forex pairs, such as EUR/USD,GBP/JPY." },
      { status: 400 }
    );
  }

  const normalizedSymbols = symbols.map((symbol) => {
    const clean = symbol.replace("/", "");
    return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  });

  try {
    const url = new URL("https://api.twelvedata.com/price");
    url.searchParams.set("symbol", normalizedSymbols.join(","));
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Market data provider request failed." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.status === "error") {
      return NextResponse.json(
        { error: data.message ?? "Market data provider returned an error." },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve market prices." },
      { status: 502 }
    );
  }
}
