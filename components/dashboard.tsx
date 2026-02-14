"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { GlobalControls } from "@/components/global-controls";
import { EarningsTab } from "@/components/tabs/earnings-tab";
import { PriceChartTab } from "@/components/tabs/price-chart-tab";
import { CorrelationTab } from "@/components/tabs/correlation-tab";
import { LaggedCorrelationTab } from "@/components/tabs/lagged-correlation-tab";
import { DEFAULT_LAGS, MAX_SYMBOLS } from "@/lib/constants";
import { DashboardTab, DatePreset, IndexScope } from "@/types/market";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "basic-alpha:v1-state";

type StoredState = {
  activeTab: DashboardTab;
  indexScope: IndexScope;
  datePreset: DatePreset;
  selectedSymbols: string[];
  chartSymbol: string;
  lags: number[];
};

const DEFAULT_STATE: StoredState = {
  activeTab: "earnings",
  indexScope: "both",
  datePreset: "1Y",
  selectedSymbols: ["AAPL", "MSFT", "NVDA", "SPY"],
  chartSymbol: "AAPL",
  lags: DEFAULT_LAGS
};

const TAB_ITEMS: { id: DashboardTab; label: string }[] = [
  { id: "earnings", label: "Earnings" },
  { id: "price", label: "Price Chart" },
  { id: "correlation", label: "Correlation" },
  { id: "lagged", label: "Delayed Correlation" }
];

export function Dashboard() {
  const [state, setState] = useState<StoredState>(DEFAULT_STATE);
  const [universeSymbols, setUniverseSymbols] = useState<string[]>([]);
  const [universeLoading, setUniverseLoading] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);

  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        setState((prev) => ({
          ...prev,
          ...parsed,
          selectedSymbols: Array.isArray(parsed.selectedSymbols)
            ? parsed.selectedSymbols.slice(0, MAX_SYMBOLS)
            : prev.selectedSymbols,
          lags: Array.isArray(parsed.lags) && parsed.lags.length > 0 ? parsed.lags : prev.lags
        }));
      }
    } catch {
      // No-op, fallback to defaults.
    }

    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let active = true;
    setUniverseLoading(true);
    setUniverseError(null);

    fetch(`/api/universe?index=${state.indexScope}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Failed to load universe symbols");
        }
        return (await response.json()) as { symbols: string[] };
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setUniverseSymbols(data.symbols);

        setState((prev) => {
          const filtered = prev.selectedSymbols.filter((symbol) => data.symbols.includes(symbol));
          const selectedSymbols = filtered.length > 0 ? filtered : data.symbols.slice(0, 4);
          const chartSymbol = data.symbols.includes(prev.chartSymbol)
            ? prev.chartSymbol
            : selectedSymbols[0] ?? "";

          return {
            ...prev,
            selectedSymbols,
            chartSymbol
          };
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setUniverseError(error instanceof Error ? error.message : "Failed to load universe symbols");
      })
      .finally(() => {
        if (active) {
          setUniverseLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [state.indexScope]);

  const selectedSymbolCount = state.selectedSymbols.length;

  function setActiveTab(tab: DashboardTab): void {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }

  function addSymbol(symbol: string): void {
    setState((prev) => {
      if (prev.selectedSymbols.includes(symbol) || prev.selectedSymbols.length >= MAX_SYMBOLS) {
        return prev;
      }

      return {
        ...prev,
        selectedSymbols: [...prev.selectedSymbols, symbol],
        chartSymbol: prev.chartSymbol || symbol
      };
    });
  }

  function removeSymbol(symbol: string): void {
    setState((prev) => {
      const selectedSymbols = prev.selectedSymbols.filter((item) => item !== symbol);
      const chartSymbol =
        prev.chartSymbol === symbol ? (selectedSymbols[0] ?? prev.chartSymbol) : prev.chartSymbol;

      return {
        ...prev,
        selectedSymbols,
        chartSymbol
      };
    });
  }

  const statusBadge = useMemo(() => {
    if (universeLoading) {
      return <Badge variant="muted">Loading universe...</Badge>;
    }

    if (universeError) {
      return <Badge variant="danger">Universe unavailable</Badge>;
    }

    return <Badge variant="default">{universeSymbols.length} symbols in scope</Badge>;
  }, [universeError, universeLoading, universeSymbols.length]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 pb-8 pt-6 md:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">BasicAlpha</h1>
          <p className="mt-1 text-sm text-slate-600">
            Earnings tracker, event-annotated charts, and correlation analytics for S&P 500 and Nasdaq-100 stocks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Badge variant="muted">{selectedSymbolCount}/20 selected</Badge>
        </div>
      </header>

      <GlobalControls
        indexScope={state.indexScope}
        onIndexScopeChange={(indexScope) => setState((prev) => ({ ...prev, indexScope }))}
        datePreset={state.datePreset}
        onDatePresetChange={(datePreset) => setState((prev) => ({ ...prev, datePreset }))}
        universeSymbols={universeSymbols}
        selectedSymbols={state.selectedSymbols}
        onAddSymbol={addSymbol}
        onRemoveSymbol={removeSymbol}
        busy={universeLoading}
      />

      <nav
        className="mt-4 flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-1 scrollbar-thin"
        aria-label="Dashboard tabs"
      >
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              state.activeTab === tab.id
                ? "bg-primary text-white"
                : "text-slate-700 hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="mt-4 animate-fadeIn">
        {state.activeTab === "earnings" ? (
          <EarningsTab
            indexScope={state.indexScope}
            onSelectSymbol={(symbol) => {
              addSymbol(symbol);
              setState((prev) => ({ ...prev, chartSymbol: symbol, activeTab: "price" }));
            }}
          />
        ) : null}

        {state.activeTab === "price" ? (
          <PriceChartTab
            symbol={state.chartSymbol}
            onSymbolChange={(symbol) => setState((prev) => ({ ...prev, chartSymbol: symbol }))}
            universeSymbols={universeSymbols}
            datePreset={state.datePreset}
          />
        ) : null}

        {state.activeTab === "correlation" ? (
          <CorrelationTab selectedSymbols={state.selectedSymbols} datePreset={state.datePreset} />
        ) : null}

        {state.activeTab === "lagged" ? (
          <LaggedCorrelationTab
            selectedSymbols={state.selectedSymbols}
            datePreset={state.datePreset}
            lags={state.lags}
            onLagsChange={(lags) => setState((prev) => ({ ...prev, lags }))}
          />
        ) : null}
      </section>
    </main>
  );
}
