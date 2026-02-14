"use client";

import { useEffect, useMemo, useState } from "react";
import { EChart } from "@/components/charts/echart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_OBSERVATIONS } from "@/lib/constants";
import { rangeFromPreset } from "@/lib/dates";
import { rollingCorrelation, toDailyReturns } from "@/lib/analytics";
import { CorrelationResponse, DatePreset, PricesResponse } from "@/types/market";

function alignNormalizedSeries(left: PricesResponse, right: PricesResponse) {
  const leftMap = new Map(left.candles.map((candle) => [candle.date, candle.close]));
  const rightMap = new Map(right.candles.map((candle) => [candle.date, candle.close]));
  const dates = [...leftMap.keys()].filter((date) => rightMap.has(date)).sort();

  if (dates.length === 0) {
    return null;
  }

  const firstLeft = leftMap.get(dates[0]) ?? 1;
  const firstRight = rightMap.get(dates[0]) ?? 1;

  return {
    dates,
    left: dates.map((date) => ((leftMap.get(date) ?? firstLeft) / firstLeft) * 100),
    right: dates.map((date) => ((rightMap.get(date) ?? firstRight) / firstRight) * 100)
  };
}

export function CorrelationTab({
  selectedSymbols,
  datePreset
}: {
  selectedSymbols: string[];
  datePreset: DatePreset;
}) {
  const [from, setFrom] = useState(rangeFromPreset(datePreset).from);
  const [to, setTo] = useState(rangeFromPreset(datePreset).to);

  const [result, setResult] = useState<CorrelationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pair, setPair] = useState<{ x: string; y: string; corr: number } | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairData, setPairData] = useState<
    | {
        symbols: [string, string];
        dates: string[];
        normalizedLeft: number[];
        normalizedRight: number[];
        rollingDates: string[];
        rollingValues: number[];
      }
    | null
  >(null);

  useEffect(() => {
    const range = rangeFromPreset(datePreset);
    setFrom(range.from);
    setTo(range.to);
  }, [datePreset]);

  async function runAnalysis() {
    if (selectedSymbols.length < 2) {
      setError("Add at least two symbols before running correlation.");
      return;
    }

    setLoading(true);
    setError(null);
    setPair(null);
    setPairData(null);

    try {
      const response = await fetch("/api/correlation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbols: selectedSymbols,
          from,
          to,
          metric: "pearson_daily_returns"
        })
      });

      const body = (await response.json()) as CorrelationResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Correlation request failed");
      }

      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correlation request failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadPairDetail(x: string, y: string, corr: number) {
    if (x === y) {
      return;
    }

    setPair({ x, y, corr });
    setPairLoading(true);
    setPairError(null);

    try {
      const [left, right] = await Promise.all([
        fetch(`/api/prices?symbol=${x}&from=${from}&to=${to}`).then((res) => res.json() as Promise<PricesResponse>),
        fetch(`/api/prices?symbol=${y}&from=${from}&to=${to}`).then((res) => res.json() as Promise<PricesResponse>)
      ]);

      const normalized = alignNormalizedSeries(left, right);
      if (!normalized) {
        throw new Error("No overlapping price points for selected pair");
      }

      const rolling = rollingCorrelation(toDailyReturns(left.candles), toDailyReturns(right.candles), 60);

      setPairData({
        symbols: [x, y],
        dates: normalized.dates,
        normalizedLeft: normalized.left,
        normalizedRight: normalized.right,
        rollingDates: rolling.map((point) => point.date),
        rollingValues: rolling.map((point) => point.value)
      });
    } catch (err) {
      setPairError(err instanceof Error ? err.message : "Failed to load pair details");
    } finally {
      setPairLoading(false);
    }
  }

  const matrixSymbols = useMemo(() => {
    if (!result) {
      return [];
    }

    const set = new Set<string>();
    result.matrix.forEach((cell) => {
      set.add(cell.x);
    });

    return selectedSymbols.filter((symbol) => set.has(symbol));
  }, [result, selectedSymbols]);

  const normalizedOption = useMemo(() => {
    if (!pairData) {
      return null;
    }

    return {
      tooltip: { trigger: "axis" },
      legend: { top: 0 },
      grid: { left: 60, right: 20, top: 50, bottom: 50 },
      xAxis: { type: "category", data: pairData.dates },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => value.toFixed(0)
        }
      },
      series: [
        {
          name: `${pairData.symbols[0]} (norm=100)` ,
          type: "line",
          showSymbol: false,
          data: pairData.normalizedLeft,
          lineStyle: { color: "#1d4ed8", width: 2 }
        },
        {
          name: `${pairData.symbols[1]} (norm=100)` ,
          type: "line",
          showSymbol: false,
          data: pairData.normalizedRight,
          lineStyle: { color: "#0f766e", width: 2 }
        }
      ]
    };
  }, [pairData]);

  const rollingOption = useMemo(() => {
    if (!pairData) {
      return null;
    }

    return {
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      xAxis: { type: "category", data: pairData.rollingDates },
      yAxis: {
        type: "value",
        min: -1,
        max: 1
      },
      series: [
        {
          name: "Rolling 60D Corr",
          type: "line",
          data: pairData.rollingValues,
          showSymbol: false,
          lineStyle: { width: 2, color: "#b45309" }
        }
      ]
    };
  }, [pairData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correlation Analyzer</CardTitle>
        <CardDescription>
          Pearson correlation on aligned daily returns. Minimum {MIN_OBSERVATIONS} overlapping observations required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 rounded-md border border-border px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 rounded-md border border-border px-3 text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button onClick={runAnalysis} disabled={loading || selectedSymbols.length < 2}>
              {loading ? "Running..." : "Run Correlation"}
            </Button>
          </div>
        </div>

        {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}
        {result?.droppedSymbols.length ? (
          <Alert>Dropped symbols with insufficient data: {result.droppedSymbols.join(", ")}</Alert>
        ) : null}

        {result && matrixSymbols.length >= 2 ? (
          <>
            <HeatmapChart
              cells={result.matrix}
              symbols={matrixSymbols}
              onCellClick={(x, y, value) => loadPairDetail(x, y, value)}
            />
            <p className="text-xs text-slate-500">Observations: {result.observations}</p>
          </>
        ) : null}

        {pair ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">
              Pair Detail: <span className="mono">{pair.x}</span> vs <span className="mono">{pair.y}</span> ({pair.corr.toFixed(3)})
            </h4>
            {pairLoading ? <p className="text-sm text-slate-600">Loading pair detail...</p> : null}
            {pairError ? <Alert className="border-red-300 bg-red-50 text-red-800">{pairError}</Alert> : null}
            {!pairLoading && !pairError && normalizedOption && rollingOption ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <EChart option={normalizedOption} height={300} />
                <EChart option={rollingOption} height={300} />
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
