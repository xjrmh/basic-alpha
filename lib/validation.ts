import { z } from "zod";
import { LAG_MAX, LAG_MIN, MAX_LOOKBACK_YEARS, MAX_SYMBOLS } from "@/lib/constants";
import { isValidIsoDate, yearsBetween } from "@/lib/dates";

const dateSchema = z
  .string()
  .refine((value) => isValidIsoDate(value), "Invalid ISO date format (YYYY-MM-DD)");

export const indexScopeSchema = z.enum(["sp500", "nasdaq100", "both"]);

export const pricesQuerySchema = z.object({
  symbol: z.string().min(1).max(10),
  from: dateSchema,
  to: dateSchema
});

export const earningsQuerySchema = z.object({
  from: dateSchema,
  to: dateSchema,
  index: indexScopeSchema,
  symbol: z.string().min(1).max(10).optional()
});

export const eventsQuerySchema = z.object({
  from: dateSchema,
  to: dateSchema
});

export const correlationRequestSchema = z
  .object({
    symbols: z.array(z.string().min(1).max(10)).min(2).max(MAX_SYMBOLS),
    from: dateSchema,
    to: dateSchema,
    metric: z.literal("pearson_daily_returns")
  })
  .superRefine((data, ctx) => {
    if (yearsBetween(data.from, data.to) > MAX_LOOKBACK_YEARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Lookback cannot exceed ${MAX_LOOKBACK_YEARS} years`
      });
    }
  });

export const laggedCorrelationRequestSchema = z
  .object({
    symbols: z.array(z.string().min(1).max(10)).min(2).max(MAX_SYMBOLS),
    from: dateSchema,
    to: dateSchema,
    lags: z.array(z.number().int().min(LAG_MIN).max(LAG_MAX)).min(1).max(12)
  })
  .superRefine((data, ctx) => {
    if (yearsBetween(data.from, data.to) > MAX_LOOKBACK_YEARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Lookback cannot exceed ${MAX_LOOKBACK_YEARS} years`
      });
    }
  });

export const macroEventSchema = z.object({
  date: dateSchema,
  type: z.enum(["FOMC", "CPI", "NFP"]),
  title: z.string().min(1),
  importance: z.enum(["high", "medium"]),
  source: z.string().min(1)
});

export function parseSearchParams(
  searchParams: URLSearchParams
): Record<string, string | undefined> {
  const output: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}
