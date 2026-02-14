import { DatePreset } from "@/types/market";

export const MAX_SYMBOLS = 20;
export const MAX_LOOKBACK_YEARS = 5;
export const MIN_OBSERVATIONS = 30;

export const DEFAULT_LAGS = [1, 5, 7, 30];
export const LAG_MIN = 1;
export const LAG_MAX = 60;

export const DATE_PRESETS: DatePreset[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y"];

export const INDEX_SYMBOLS = {
  sp500: "^GSPC",
  nasdaq100: "^NDX"
} as const;

export const TTL = {
  universeMs: 24 * 60 * 60 * 1000,
  earningsMs: 6 * 60 * 60 * 1000,
  priceMs: 24 * 60 * 60 * 1000
} as const;
