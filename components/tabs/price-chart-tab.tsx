"use client";

import { useEffect, useMemo, useState } from "react";
import { EChart } from "@/components/charts/echart";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePreset, EarningsResponse, MacroEvent, MacroType, PricesResponse } from "@/types/market";
import { rangeFromPreset } from "@/lib/dates";

const macroColors: Record<MacroType, string> = {
  FOMC: "#d97706",
  CPI: "#0f766e",
  NFP: "#1d4ed8"
};

function normalizeEarningsResponse(payload: unknown): EarningsResponse {
  const candidate = (payload ?? {}) as Partial<EarningsResponse>;
  return {
    items: Array.isArray(candidate.items) ? candidate.items : [],
    partial: Boolean(candidate.partial),
    warning: typeof candidate.warning === "string" ? candidate.warning : undefined
  };
}

export function PriceChartTab({
  symbol,
  onSymbolChange,
  universeSymbols,
  datePreset
}: {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  universeSymbols: string[];
  datePreset: DatePreset;
}) {
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEarnings, setShowEarnings] = useState(true);
  const [macroEnabled, setMacroEnabled] = useState<Record<MacroType, boolean>>({
    FOMC: true,
    CPI: false,
    NFP: false
  });

  const range = useMemo(() => rangeFromPreset(datePreset), [datePreset]);

  useEffect(() => {
    if (!symbol) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/prices?symbol=${symbol}&from=${range.from}&to=${range.to}`).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to load prices");
        }
        return (await res.json()) as PricesResponse;
      }),
      fetch(`/api/events?from=${range.from}&to=${range.to}`).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to load events");
        }
        const payload = (await res.json()) as { events: MacroEvent[] };
        return payload.events;
      }),
      fetch(
        `/api/earnings?from=${range.from}&to=${range.to}&index=both&symbol=${symbol}`
      ).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to load symbol earnings");
        }
        const payload = (await res.json()) as unknown;
        return normalizeEarningsResponse(payload);
      })
    ])
      .then(([pricesPayload, eventsPayload, earningsPayload]) => {
        if (!active) {
          return;
        }

        setPrices(pricesPayload);
        setEvents(eventsPayload);
        setEarnings(earningsPayload);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load chart data");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [range.from, range.to, symbol]);

  const chartOption = useMemo(() => {
    const candles = prices?.candles ?? [];
    const dates = candles.map((candle) => candle.date);
    const closeByDate = new Map(candles.map((candle) => [candle.date, candle.close]));

    const earningsSeries = showEarnings
      ? (earnings?.items ?? [])
          .map((item) => {
            const y = closeByDate.get(item.date);
            if (y === undefined) {
              return null;
            }
            return {
              name: "Earnings",
              value: [item.date, y],
              detail: `${item.symbol} earnings (${item.hour.toUpperCase()})`,
              source: "Finnhub earnings calendar"
            };
          })
          .filter(
            (
              value
            ): value is NonNullable<{
              name: string;
              value: [string, number];
              detail: string;
              source: string;
            } | null> => value !== null
          )
      : [];

    const macroSeries = (Object.keys(macroEnabled) as MacroType[])
      .filter((type) => macroEnabled[type])
      .map((type) => {
        const data = events
          .filter((event) => event.type === type)
          .map((event) => {
            const y = closeByDate.get(event.date);
            if (y === undefined) {
              return null;
            }
            return {
              name: event.type,
              value: [event.date, y],
              detail: event.title,
              source: event.source
            };
          })
          .filter(
            (
              value
            ): value is NonNullable<{
              name: MacroType;
              value: [string, number];
              detail: string;
              source: string;
            } | null> => value !== null
          );

        return {
          name: type,
          type: "scatter",
          data,
          symbolSize: type === "FOMC" ? 10 : 8,
          itemStyle: { color: macroColors[type] },
          tooltip: {
            formatter: (params: { data: { detail: string; source: string; value: [string, number] } }) =>
              `${type}: ${params.data.detail}<br/>${params.data.value[0]}<br/>Source: ${params.data.source}`
          }
        };
      });

    return {
      animationDuration: 200,
      tooltip: {
        trigger: "axis"
      },
      legend: {
        top: 0
      },
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 60
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLabel: {
          formatter: (value: string) => value.slice(2),
          fontSize: 11
        }
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          formatter: (value: number) => `$${value.toFixed(0)}`
        }
      },
      series: [
        {
          name: symbol,
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: "#1d4ed8"
          },
          data: candles.map((candle) => candle.close)
        },
        showEarnings
          ? {
              name: "Earnings",
              type: "scatter",
              data: earningsSeries,
              symbolSize: 10,
              itemStyle: { color: "#dc2626" },
              tooltip: {
                formatter: (params: { data: { detail: string; source: string; value: [string, number] } }) =>
                  `Earnings: ${params.data.detail}<br/>${params.data.value[0]}<br/>Source: ${params.data.source}`
              }
            }
          : null,
        ...macroSeries
      ].filter(Boolean)
    };
  }, [earnings?.items, events, macroEnabled, prices?.candles, showEarnings, symbol]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Chart with Events</CardTitle>
        <CardDescription>
          Daily close series with earnings and macro markers (FOMC/CPI/NFP).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Symbol
            <select
              value={symbol}
              onChange={(event) => onSymbolChange(event.target.value)}
              className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium"
            >
              {universeSymbols.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showEarnings}
                onChange={(event) => setShowEarnings(event.target.checked)}
              />
              Earnings
            </label>
            {(Object.keys(macroEnabled) as MacroType[]).map((type) => (
              <label key={type} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={macroEnabled[type]}
                  onChange={(event) =>
                    setMacroEnabled((prev) => ({ ...prev, [type]: event.target.checked }))
                  }
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {earnings?.partial ? <Alert>{earnings.warning ?? "Some marker data is partial."}</Alert> : null}
        {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}
        {loading ? <p className="text-sm text-slate-600">Loading chart data...</p> : null}

        {!loading && !error ? (
          prices?.candles.length ? (
            <EChart option={chartOption} height={460} />
          ) : (
            <p className="text-sm text-slate-500">No candle data available for this symbol and range.</p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
