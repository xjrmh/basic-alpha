import { correlationRequestSchema, laggedCorrelationRequestSchema } from "@/lib/validation";

describe("validation", () => {
  test("rejects correlation requests with more than 20 symbols", () => {
    const symbols = Array.from({ length: 21 }, (_, index) => `SYM${index}`);

    const parsed = correlationRequestSchema.safeParse({
      symbols,
      from: "2025-01-01",
      to: "2025-12-31",
      metric: "pearson_daily_returns"
    });

    expect(parsed.success).toBe(false);
  });

  test("rejects correlation lookback longer than 5 years", () => {
    const parsed = correlationRequestSchema.safeParse({
      symbols: ["AAPL", "MSFT"],
      from: "2018-01-01",
      to: "2025-12-31",
      metric: "pearson_daily_returns"
    });

    expect(parsed.success).toBe(false);
  });

  test("rejects invalid lag range", () => {
    const parsed = laggedCorrelationRequestSchema.safeParse({
      symbols: ["AAPL", "MSFT"],
      from: "2025-01-01",
      to: "2025-12-31",
      lags: [0, 5]
    });

    expect(parsed.success).toBe(false);
  });

  test("accepts valid lagged payload", () => {
    const parsed = laggedCorrelationRequestSchema.safeParse({
      symbols: ["AAPL", "MSFT", "NVDA"],
      from: "2024-01-01",
      to: "2025-12-31",
      lags: [1, 5, 7, 30]
    });

    expect(parsed.success).toBe(true);
  });
});
