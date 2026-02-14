import { getOrSetCache } from "@/lib/cache";
import { TTL } from "@/lib/constants";
import { toUnixSeconds } from "@/lib/dates";
import { Candle } from "@/types/market";

const BASE_URL = "https://finnhub.io/api/v1";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class FinnhubHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Finnhub request failed (${status}): ${body}`);
    this.name = "FinnhubHttpError";
    this.status = status;
    this.body = body;
  }
}

export function isFinnhubAccessDenied(error: unknown): boolean {
  return error instanceof FinnhubHttpError && error.status === 403;
}

type FinnhubEarningsItem = {
  symbol: string;
  date: string;
  hour?: string;
  epsEstimate?: number;
  revenueEstimate?: number;
};

type CandlePayload = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: string;
  t: number[];
  v: number[];
};

function parseStooqCsv(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const candles: Candle[] = [];

  for (const row of lines.slice(1)) {
    const [date, open, high, low, close, volume] = row.split(",");
    if (!date || !open || !high || !low || !close || !volume) {
      continue;
    }

    const parsed = [open, high, low, close, volume].map((value) => Number(value));
    if (parsed.some((value) => Number.isNaN(value))) {
      continue;
    }

    candles.push({
      date,
      open: parsed[0],
      high: parsed[1],
      low: parsed[2],
      close: parsed[3],
      volume: parsed[4]
    });
  }

  return candles;
}

async function fetchStooqDailyCandles(symbol: string, from: string, to: string): Promise<Candle[]> {
  const stooqSymbol = `${symbol.toLowerCase().replace(/\./g, "-")}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`Stooq request failed (${response.status})`);
  }

  const csv = await response.text();
  return parseStooqCsv(csv).filter((candle) => candle.date >= from && candle.date <= to);
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is missing");
  }
  return key;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, { cache: "no-store" });

    if (!RETRYABLE_STATUS.has(response.status) || attempt >= retries) {
      return response;
    }

    const backoffMs = 250 * 2 ** attempt;
    await sleep(backoffMs);
    attempt += 1;
  }
}

async function fetchFinnhub<T>(
  path: string,
  params: Record<string, string | number | boolean>
): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  search.set("token", getApiKey());

  const url = `${BASE_URL}${path}?${search.toString()}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const text = await response.text();
    throw new FinnhubHttpError(response.status, text);
  }

  return (await response.json()) as T;
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (values.length === 0) {
    return [];
  }

  const output: R[] = new Array(values.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < values.length) {
      const current = index;
      index += 1;
      output[current] = await mapper(values[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, values.length) }, () => worker());
  await Promise.all(workers);
  return output;
}

export async function getIndexConstituents(indexSymbol: "^GSPC" | "^NDX"): Promise<string[]> {
  const cacheKey = `finnhub:index:${indexSymbol}`;

  return getOrSetCache(cacheKey, TTL.universeMs, async () => {
    const data = await fetchFinnhub<{ constituents?: string[] }>("/index/constituents", {
      symbol: indexSymbol
    });

    return (data.constituents ?? []).map((symbol) => symbol.toUpperCase());
  });
}

export async function getEarningsCalendar(from: string, to: string): Promise<FinnhubEarningsItem[]> {
  const cacheKey = `finnhub:earnings:${from}:${to}`;

  return getOrSetCache(cacheKey, TTL.earningsMs, async () => {
    const payload = await fetchFinnhub<{ earningsCalendar?: FinnhubEarningsItem[] }>(
      "/calendar/earnings",
      { from, to }
    );

    return payload.earningsCalendar ?? [];
  });
}

export async function getDailyCandles(
  symbol: string,
  from: string,
  to: string
): Promise<Candle[]> {
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `finnhub:candles:${upperSymbol}:${from}:${to}`;

  return getOrSetCache(cacheKey, TTL.priceMs, async () => {
    try {
      const payload = await fetchFinnhub<CandlePayload>("/stock/candle", {
        symbol: upperSymbol,
        resolution: "D",
        from: toUnixSeconds(from),
        to: toUnixSeconds(to),
        adjusted: true
      });

      if (payload.s !== "ok") {
        return [];
      }

      const candles: Candle[] = [];
      for (let i = 0; i < payload.t.length; i += 1) {
        candles.push({
          date: new Date(payload.t[i] * 1000).toISOString().slice(0, 10),
          open: payload.o[i],
          high: payload.h[i],
          low: payload.l[i],
          close: payload.c[i],
          volume: payload.v[i]
        });
      }

      return candles;
    } catch (error) {
      if (!isFinnhubAccessDenied(error)) {
        throw error;
      }

      return fetchStooqDailyCandles(upperSymbol, from, to);
    }
  });
}

export async function getRecentDailyCandles(symbol: string, lookbackDays = 60): Promise<Candle[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - lookbackDays);

  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  return getDailyCandles(symbol, from, to);
}
