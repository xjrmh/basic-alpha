import {
  calculateExpectedMove,
  computeLaggedCorrelation,
  pearsonCorrelation,
  toDailyReturns
} from "@/lib/analytics";
import { Candle } from "@/types/market";

describe("analytics", () => {
  test("toDailyReturns handles non-contiguous dates", () => {
    const candles: Candle[] = [
      { date: "2025-01-02", open: 100, high: 101, low: 99, close: 100, volume: 1_000 },
      { date: "2025-01-06", open: 100, high: 112, low: 99, close: 110, volume: 1_200 },
      { date: "2025-01-07", open: 110, high: 111, low: 95, close: 99, volume: 1_400 }
    ];

    const returns = toDailyReturns(candles);

    expect(returns).toHaveLength(2);
    expect(returns[0].value).toBeCloseTo(0.1, 6);
    expect(returns[1].value).toBeCloseTo(-0.1, 6);
  });

  test("pearsonCorrelation returns expected extremes", () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    expect(pearsonCorrelation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 6);
  });

  test("computeLaggedCorrelation preserves leader->follower direction", () => {
    const leader = [1, 2, 3, 4, 5, 6];
    const follower = [0, 1, 2, 3, 4, 5];

    const lagged = computeLaggedCorrelation(leader, follower, 1);

    expect(lagged).toBeCloseTo(1, 6);
  });

  test("calculateExpectedMove follows trailing average range formula", () => {
    const candles: Candle[] = [];

    for (let i = 0; i < 21; i += 1) {
      candles.push({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1_000
      });
    }

    const move = calculateExpectedMove(candles);

    expect(move.expectedMovePct).toBeCloseTo(10, 6);
    expect(move.expectedMoveAbs).toBeCloseTo(10, 6);
  });
});
