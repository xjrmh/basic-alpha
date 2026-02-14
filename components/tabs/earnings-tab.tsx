"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, toIsoDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import { EarningsResponse, IndexScope } from "@/types/market";

function normalizeEarningsResponse(payload: unknown): EarningsResponse {
  const candidate = (payload ?? {}) as Partial<EarningsResponse>;
  return {
    items: Array.isArray(candidate.items) ? candidate.items : [],
    partial: Boolean(candidate.partial),
    warning: typeof candidate.warning === "string" ? candidate.warning : undefined
  };
}

export function EarningsTab({
  indexScope,
  onSelectSymbol
}: {
  indexScope: IndexScope;
  onSelectSymbol: (symbol: string) => void;
}) {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = toIsoDate(new Date());
    const to = addDays(new Date(), 30);
    return { from, to };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/earnings?from=${range.from}&to=${range.to}&index=${indexScope}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to load earnings");
        }

        const payload = (await response.json()) as unknown;
        return normalizeEarningsResponse(payload);
      })
      .then((payload) => {
        if (active) {
          setData(payload);
        }
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load earnings");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [indexScope, range.from, range.to]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Earnings (Next 30 Days)</CardTitle>
        <CardDescription>
          Sorted by date, then expected movement. Click a row to open the symbol in the Price Chart tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.partial ? <Alert>{data.warning ?? "Partial results due to data limits."}</Alert> : null}

        {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}

        {loading ? <p className="text-sm text-slate-600">Loading earnings tracker...</p> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Earnings Date</th>
                  <th className="px-3 py-2">Session</th>
                  <th className="px-3 py-2">EPS Est.</th>
                  <th className="px-3 py-2">Revenue Est.</th>
                  <th className="px-3 py-2">Expected Move %</th>
                  <th className="px-3 py-2">Expected Move $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.isArray(data?.items) && data.items.length ? (
                  data.items.map((item, index) => (
                    <tr
                      key={`${item.symbol}-${item.date}-${index}`}
                      className="cursor-pointer transition hover:bg-slate-50"
                      onClick={() => onSelectSymbol(item.symbol)}
                    >
                      <td className="mono px-3 py-2 font-semibold">{item.symbol}</td>
                      <td className="px-3 py-2">{item.companyName}</td>
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2 uppercase">{item.hour}</td>
                      <td className="mono px-3 py-2">
                        {item.epsEstimate !== undefined ? item.epsEstimate.toFixed(2) : "-"}
                      </td>
                      <td className="mono px-3 py-2">
                        {item.revenueEstimate !== undefined
                          ? formatCurrency(item.revenueEstimate)
                          : "-"}
                      </td>
                      <td className="mono px-3 py-2">{item.expectedMovePct.toFixed(2)}%</td>
                      <td className="mono px-3 py-2">{formatCurrency(item.expectedMoveAbs)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                      No earnings events found for this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
