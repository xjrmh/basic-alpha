import { NextRequest, NextResponse } from "next/server";
import { getDailyCandles } from "@/lib/finnhub";
import { badRequest, serverError } from "@/lib/http";
import { parseSearchParams, pricesQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const parsed = pricesQuerySchema.safeParse(parseSearchParams(request.nextUrl.searchParams));

  if (!parsed.success) {
    return badRequest("Invalid prices query", parsed.error.flatten());
  }

  const { symbol, from, to } = parsed.data;

  try {
    const candles = await getDailyCandles(symbol, from, to);
    return NextResponse.json({ symbol: symbol.toUpperCase(), candles });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to load prices");
  }
}
