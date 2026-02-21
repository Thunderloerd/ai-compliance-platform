"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function DataTableWrapper({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
