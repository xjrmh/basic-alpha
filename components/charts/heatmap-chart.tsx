"use client";

import { EChart } from "@/components/charts/echart";
import { CorrCell } from "@/types/market";

export function HeatmapChart({
  cells,
  symbols,
  onCellClick,
  height = 420
}: {
  cells: CorrCell[];
  symbols: string[];
  onCellClick?: (x: string, y: string, value: number) => void;
  height?: number;
}) {
  const index = new Map(symbols.map((symbol, i) => [symbol, i]));

  const heatData = cells
    .map((cell) => {
      const xIndex = index.get(cell.x);
      const yIndex = index.get(cell.y);

      if (xIndex === undefined || yIndex === undefined) {
        return null;
      }

      return [xIndex, yIndex, Number(cell.value.toFixed(4)), cell.x, cell.y] as const;
    })
    .filter((value): value is readonly [number, number, number, string, string] => value !== null);

  const option = {
    animationDuration: 200,
    tooltip: {
      formatter: (params: { data: [number, number, number, string, string] }) => {
        const [, , value, x, y] = params.data;
        return `${x} vs ${y}<br/>Correlation: ${value.toFixed(3)}`;
      }
    },
    grid: {
      left: 80,
      right: 12,
      top: 20,
      bottom: 80
    },
    xAxis: {
      type: "category",
      data: symbols,
      axisLabel: {
        rotate: 35,
        fontFamily: "var(--font-plex-mono)",
        fontSize: 11
      }
    },
    yAxis: {
      type: "category",
      data: symbols,
      axisLabel: {
        fontFamily: "var(--font-plex-mono)",
        fontSize: 11
      }
    },
    visualMap: {
      min: -1,
      max: 1,
      orient: "horizontal",
      left: "center",
      bottom: 20,
      calculable: true,
      inRange: {
        color: ["#b91c1c", "#f8fafc", "#0f766e"]
      }
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        progressive: 500,
        emphasis: {
          itemStyle: {
            borderColor: "#0f172a",
            borderWidth: 1
          }
        }
      }
    ]
  };

  return (
    <EChart
      option={option}
      height={height}
      onEvents={
        onCellClick
            ? {
              click: (params: unknown) => {
                const data = (params as { data?: [number, number, number, string, string] }).data;
                if (!data) {
                  return;
                }
                const [, , value, x, y] = data;
                onCellClick(x, y, value);
              }
            }
          : undefined
      }
    />
  );
}
