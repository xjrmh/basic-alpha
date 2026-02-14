import { NextRequest, NextResponse } from "next/server";
import { calculateExpectedMove } from "@/lib/analytics";
import { badRequest, serverError } from "@/lib/http";
import {
  getEarningsCalendar,
  getRecentDailyCandles,
  isFinnhubAccessDenied,
  mapWithConcurrency
} from "@/lib/finnhub";
import { resolveUniverse } from "@/lib/universe";
import { earningsQuerySchema, parseSearchParams } from "@/lib/validation";
import { EarningsItem, EarningsHour } from "@/types/market";

function normalizeHour(hour?: string): EarningsHour {
  const normalized = (hour ?? "dmh").toLowerCase();
  if (normalized === "bmo" || normalized === "amc") {
    return normalized;
  }
  return "dmh";
}

export async function GET(request: NextRequest) {
  const parsed = earningsQuerySchema.safeParse(parseSearchParams(request.nextUrl.searchParams));

  if (!parsed.success) {
    return badRequest("Invalid earnings query", parsed.error.flatten());
  }

  const { from, to, index, symbol: symbolFilter } = parsed.data;

  try {
    const universeData = await resolveUniverse(index);

    let earningsAccessLimited = false;
    const calendar = await getEarningsCalendar(from, to).catch((error) => {
      if (isFinnhubAccessDenied(error)) {
        earningsAccessLimited = true;
        return [];
      }
      throw error;
    });

    const allowed = new Set(universeData.symbols);
    const filtered = calendar
      .filter((item) => allowed.has(item.symbol.toUpperCase()))
      .filter((item) =>
        symbolFilter ? item.symbol.toUpperCase() === symbolFilter.toUpperCase() : true
      );

    let partial = false;

    const items = await mapWithConcurrency(filtered, 5, async (item): Promise<EarningsItem> => {
      const symbol = item.symbol.toUpperCase();

      try {
        const candles = await getRecentDailyCandles(symbol, 80);
        const { expectedMovePct, expectedMoveAbs } = calculateExpectedMove(candles);

        return {
          symbol,
          companyName: symbol,
          date: item.date,
          hour: normalizeHour(item.hour),
          epsEstimate: item.epsEstimate,
          revenueEstimate: item.revenueEstimate,
          expectedMovePct,
          expectedMoveAbs
        };
      } catch {
        partial = true;
        return {
          symbol,
          companyName: symbol,
          date: item.date,
          hour: normalizeHour(item.hour),
          epsEstimate: item.epsEstimate,
          revenueEstimate: item.revenueEstimate,
          expectedMovePct: 0,
          expectedMoveAbs: 0
        };
      }
    });

    items.sort((a, b) => {
      if (a.date === b.date) {
        return b.expectedMovePct - a.expectedMovePct;
      }
      return a.date.localeCompare(b.date);
    });

    return NextResponse.json({
      items,
      partial: partial || earningsAccessLimited,
      warning: earningsAccessLimited
          ? "Finnhub plan does not include earnings calendar access. Showing no events."
        : partial
          ? "Some expected move values could not be computed due to data limits."
          : undefined
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to load earnings");
  }
}
