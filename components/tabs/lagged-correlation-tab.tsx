"use client";

import { useEffect, useMemo, useState } from "react";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_LAGS, LAG_MAX, LAG_MIN, MIN_OBSERVATIONS } from "@/lib/constants";
import { rangeFromPreset } from "@/lib/dates";
import { DatePreset, LaggedCorrelationResponse } from "@/types/market";

export function LaggedCorrelationTab({
  selectedSymbols,
  datePreset,
  lags,
  onLagsChange
}: {
  selectedSymbols: string[];
  datePreset: DatePreset;
  lags: number[];
  onLagsChange: (lags: number[]) => void;
}) {
  const [from, setFrom] = useState(rangeFromPreset(datePreset).from);
  const [to, setTo] = useState(rangeFromPreset(datePreset).to);
  const [lagInput, setLagInput] = useState("");

  const [result, setResult] = useState<LaggedCorrelationResponse | null>(null);
  const [selectedLag, setSelectedLag] = useState<number>(lags[0] ?? DEFAULT_LAGS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const range = rangeFromPreset(datePreset);
    setFrom(range.from);
    setTo(range.to);
  }, [datePreset]);

  useEffect(() => {
    if (!lags.length) {
      onLagsChange(DEFAULT_LAGS);
      return;
    }

    if (!lags.includes(selectedLag)) {
      setSelectedLag(lags[0]);
    }
  }, [lags, onLagsChange, selectedLag]);

  async function runAnalysis() {
    if (selectedSymbols.length < 2) {
      setError("Add at least two symbols before running lagged correlation.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/correlation/lagged", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbols: selectedSymbols,
          from,
          to,
          lags
        })
      });

      const body = (await response.json()) as LaggedCorrelationResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Lagged correlation request failed");
      }

      setResult(body);
      setSelectedLag(body.results[0]?.lagDays ?? selectedLag);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lagged correlation request failed");
    } finally {
      setLoading(false);
    }
  }

  function addLag() {
    const parsed = Number(lagInput);

    if (!Number.isInteger(parsed) || parsed < LAG_MIN || parsed > LAG_MAX) {
      setError(`Lag must be an integer from ${LAG_MIN} to ${LAG_MAX}.`);
      return;
    }

    if (lags.includes(parsed)) {
      setLagInput("");
      return;
    }

    onLagsChange([...lags, parsed].sort((a, b) => a - b));
    setLagInput("");
  }

  function removeLag(lag: number) {
    if (lags.length === 1) {
      return;
    }

    onLagsChange(lags.filter((item) => item !== lag));
  }

  const symbols = useMemo(() => {
    const set = new Set<string>();
    result?.results.forEach((entry) => {
      entry.matrix.forEach((cell) => set.add(cell.x));
    });
    return selectedSymbols.filter((symbol) => set.has(symbol));
  }, [result, selectedSymbols]);

  const currentLag = result?.results.find((entry) => entry.lagDays === selectedLag) ?? result?.results[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delayed Correlation Analyzer</CardTitle>
        <CardDescription>
          Positive lag means leader moves first. Requires {MIN_OBSERVATIONS} overlapping observations after lag shift.
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
              {loading ? "Running..." : "Run Lagged Correlation"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-2">
            {lags.map((lag) => (
              <Badge key={lag} variant="muted" className="mono gap-2 px-2.5 py-1">
                {lag}D
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-800"
                  onClick={() => removeLag(lag)}
                  aria-label={`Remove ${lag} day lag`}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>

          <input
            type="number"
            min={LAG_MIN}
            max={LAG_MAX}
            value={lagInput}
            onChange={(event) => setLagInput(event.target.value)}
            className="h-9 w-28 rounded-md border border-border px-3 text-sm"
            placeholder="Add lag"
          />
          <Button variant="secondary" onClick={addLag}>
            Add Lag
          </Button>
        </div>

        {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}
        {result?.droppedSymbols.length ? (
          <Alert>Dropped symbols with insufficient data: {result.droppedSymbols.join(", ")}</Alert>
        ) : null}

        {result && currentLag && symbols.length >= 2 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {result.results.map((entry) => (
                <button
                  key={entry.lagDays}
                  type="button"
                  onClick={() => setSelectedLag(entry.lagDays)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    selectedLag === entry.lagDays
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-slate-700"
                  }`}
                >
                  {entry.lagDays}D
                </button>
              ))}
            </div>

            <HeatmapChart cells={currentLag.matrix} symbols={symbols} height={420} />

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Leader</th>
                    <th className="px-3 py-2">Follower</th>
                    <th className="px-3 py-2">Correlation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentLag.topLeadLagPairs.map((pairItem) => (
                    <tr key={`${pairItem.leader}-${pairItem.follower}`}>
                      <td className="mono px-3 py-2">{pairItem.leader}</td>
                      <td className="mono px-3 py-2">{pairItem.follower}</td>
                      <td className="mono px-3 py-2">{pairItem.corr.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">Observations before lag shift: {result.observations}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
