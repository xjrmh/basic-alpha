"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false
});

export function EChart({
  option,
  height = 360,
  className,
  onEvents
}: {
  option: Record<string, unknown>;
  height?: number;
  className?: string;
  onEvents?: Record<string, (params: unknown) => void>;
}) {
  return (
    <div className={cn("w-full", className)}>
      <ReactECharts
        option={option}
        style={{ width: "100%", height }}
        onEvents={onEvents}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
