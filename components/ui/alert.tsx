import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900", className)}>
      {children}
    </div>
  );
}
