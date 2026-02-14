import { NextRequest, NextResponse } from "next/server";
import {
  alignSeriesByDate,
  buildCorrelationMatrix,
  toDailyReturns
} from "@/lib/analytics";
import { MIN_OBSERVATIONS } from "@/lib/constants";
import { getDailyCandles, mapWithConcurrency } from "@/lib/finnhub";
import { badRequest, serverError } from "@/lib/http";
import { correlationRequestSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = correlationRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return badRequest("Invalid correlation payload", parsed.error.flatten());
  }

  const symbols = [...new Set(parsed.data.symbols.map((symbol) => symbol.toUpperCase()))];

  try {
    const droppedSymbols: string[] = [];
    const series: Record<string, { date: string; value: number }[]> = {};

    await mapWithConcurrency(symbols, 5, async (symbol) => {
      try {
        const candles = await getDailyCandles(symbol, parsed.data.from, parsed.data.to);
        const returns = toDailyReturns(candles);

        if (returns.length < 2) {
          droppedSymbols.push(symbol);
          return;
        }

        series[symbol] = returns;
      } catch {
        droppedSymbols.push(symbol);
      }
    });

    const aligned = alignSeriesByDate(series);
    if (aligned.symbols.length < 2) {
      return badRequest("Not enough valid symbols with price history");
    }

    if (aligned.dates.length < MIN_OBSERVATIONS) {
      return badRequest(
        `Need at least ${MIN_OBSERVATIONS} overlapping observations. Adjust range or symbols.`
      );
    }

    const matrix = buildCorrelationMatrix(aligned.symbols, aligned.alignedValues);

    return NextResponse.json({
      matrix,
      observations: aligned.dates.length,
      droppedSymbols
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to compute correlation");
  }
}
