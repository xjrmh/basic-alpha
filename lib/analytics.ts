import { CorrCell, Candle, LagPair } from "@/types/market";

export type ReturnPoint = {
  date: string;
  value: number;
};

export function toDailyReturns(candles: Candle[]): ReturnPoint[] {
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const returns: ReturnPoint[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const prevClose = sorted[i - 1].close;
    const currentClose = sorted[i].close;

    if (prevClose === 0) {
      continue;
    }

    returns.push({
      date: sorted[i].date,
      value: (currentClose - prevClose) / prevClose
    });
  }

  return returns;
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) {
    return 0;
  }

  const n = a.length;
  const meanA = a.reduce((acc, x) => acc + x, 0) / n;
  const meanB = b.reduce((acc, x) => acc + x, 0) / n;

  let numerator = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    sumSqA += da * da;
    sumSqB += db * db;
  }

  const denom = Math.sqrt(sumSqA) * Math.sqrt(sumSqB);
  if (denom === 0) {
    return 0;
  }

  return numerator / denom;
}

export function alignSeriesByDate(series: Record<string, ReturnPoint[]>): {
  symbols: string[];
  dates: string[];
  alignedValues: Record<string, number[]>;
} {
  const symbols = Object.keys(series);
  if (symbols.length === 0) {
    return { symbols: [], dates: [], alignedValues: {} };
  }

  let commonDates = new Set(series[symbols[0]].map((point) => point.date));

  for (const symbol of symbols.slice(1)) {
    const dates = new Set(series[symbol].map((point) => point.date));
    commonDates = new Set([...commonDates].filter((date) => dates.has(date)));
  }

  const orderedDates = [...commonDates].sort();
  const alignedValues: Record<string, number[]> = {};

  for (const symbol of symbols) {
    const map = new Map(series[symbol].map((point) => [point.date, point.value]));
    alignedValues[symbol] = orderedDates.map((date) => map.get(date) ?? 0);
  }

  return { symbols, dates: orderedDates, alignedValues };
}

export function buildCorrelationMatrix(
  symbols: string[],
  alignedValues: Record<string, number[]>
): CorrCell[] {
  const cells: CorrCell[] = [];

  for (const x of symbols) {
    for (const y of symbols) {
      if (x === y) {
        cells.push({ x, y, value: 1 });
        continue;
      }

      cells.push({
        x,
        y,
        value: pearsonCorrelation(alignedValues[x], alignedValues[y])
      });
    }
  }

  return cells;
}

export function calculateExpectedMove(candles: Candle[]): {
  expectedMovePct: number;
  expectedMoveAbs: number;
} {
  if (candles.length < 21) {
    return { expectedMovePct: 0, expectedMoveAbs: 0 };
  }

  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const ratios: number[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const prevClose = sorted[i - 1].close;
    if (prevClose === 0) {
      continue;
    }

    const sessionRange = sorted[i].high - sorted[i].low;
    ratios.push(sessionRange / prevClose);
  }

  const trailing = ratios.slice(-20);
  if (trailing.length < 20) {
    return { expectedMovePct: 0, expectedMoveAbs: 0 };
  }

  const expectedMovePct =
    (trailing.reduce((sum, ratio) => sum + ratio, 0) / trailing.length) * 100;

  const latestClose = sorted[sorted.length - 1].close;
  const expectedMoveAbs = latestClose * (expectedMovePct / 100);

  return { expectedMovePct, expectedMoveAbs };
}

export function computeLaggedCorrelation(a: number[], b: number[], lag: number): number {
  if (lag < 1 || a.length <= lag || b.length <= lag) {
    return 0;
  }

  const left = a.slice(0, a.length - lag);
  const right = b.slice(lag);
  return pearsonCorrelation(left, right);
}

export function buildLaggedResults(
  symbols: string[],
  alignedValues: Record<string, number[]>,
  lags: number[]
): { lagDays: number; matrix: CorrCell[]; topLeadLagPairs: LagPair[] }[] {
  return lags.map((lagDays) => {
    const matrix: CorrCell[] = [];
    const candidates: LagPair[] = [];

    for (const x of symbols) {
      for (const y of symbols) {
        if (x === y) {
          matrix.push({ x, y, value: 1 });
          continue;
        }

        const corr = computeLaggedCorrelation(alignedValues[x], alignedValues[y], lagDays);
        matrix.push({ x, y, value: corr });
        candidates.push({ leader: x, follower: y, corr });
      }
    }

    const topLeadLagPairs = candidates
      .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))
      .slice(0, 12);

    return { lagDays, matrix, topLeadLagPairs };
  });
}

export function rollingCorrelation(
  left: ReturnPoint[],
  right: ReturnPoint[],
  windowSize = 60
): { date: string; value: number }[] {
  const leftMap = new Map(left.map((p) => [p.date, p.value]));
  const rightMap = new Map(right.map((p) => [p.date, p.value]));
  const dates = [...leftMap.keys()].filter((date) => rightMap.has(date)).sort();

  const alignedLeft = dates.map((date) => leftMap.get(date) ?? 0);
  const alignedRight = dates.map((date) => rightMap.get(date) ?? 0);

  const output: { date: string; value: number }[] = [];

  for (let i = windowSize - 1; i < dates.length; i += 1) {
    const sliceLeft = alignedLeft.slice(i - windowSize + 1, i + 1);
    const sliceRight = alignedRight.slice(i - windowSize + 1, i + 1);
    output.push({
      date: dates[i],
      value: pearsonCorrelation(sliceLeft, sliceRight)
    });
  }

  return output;
}
