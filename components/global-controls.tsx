"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { DATE_PRESETS } from "@/lib/constants";
import { DatePreset, IndexScope } from "@/types/market";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function GlobalControls({
  indexScope,
  onIndexScopeChange,
  datePreset,
  onDatePresetChange,
  universeSymbols,
  selectedSymbols,
  onAddSymbol,
  onRemoveSymbol,
  busy
}: {
  indexScope: IndexScope;
  onIndexScopeChange: (scope: IndexScope) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  universeSymbols: string[];
  selectedSymbols: string[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  busy?: boolean;
}) {
  const [input, setInput] = useState("");

  const upperInput = input.trim().toUpperCase();
  const canAdd = useMemo(
    () => upperInput.length > 0 && universeSymbols.includes(upperInput),
    [upperInput, universeSymbols]
  );

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    onAddSymbol(upperInput);
    setInput("");
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-panel animate-slideUp">
      <div className="grid gap-3 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Universe
          <select
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium"
            value={indexScope}
            onChange={(event) => onIndexScopeChange(event.target.value as IndexScope)}
          >
            <option value="sp500">S&P 500</option>
            <option value="nasdaq100">Nasdaq 100</option>
            <option value="both">Both</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Date Range Preset
          <select
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium"
            value={datePreset}
            onChange={(event) => onDatePresetChange(event.target.value as DatePreset)}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Add Symbol
          <div className="flex gap-2">
            <Input
              list="basic-alpha-symbols"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={busy ? "Loading symbols..." : "Type ticker (e.g., AAPL)"}
            />
            <Button variant="secondary" onClick={handleAdd} disabled={!canAdd || busy}>
              Add
            </Button>
          </div>
          <datalist id="basic-alpha-symbols">
            {universeSymbols.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedSymbols.length === 0 ? (
          <span className="text-sm text-slate-500">No symbols selected. Add at least two for analysis.</span>
        ) : (
          selectedSymbols.map((symbol) => (
            <Badge key={symbol} variant="muted" className="mono gap-1.5 px-2.5 py-1 text-xs">
              {symbol}
              <button
                type="button"
                aria-label={`Remove ${symbol}`}
                className="inline-flex rounded-sm p-0.5 hover:bg-slate-200"
                onClick={() => onRemoveSymbol(symbol)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
