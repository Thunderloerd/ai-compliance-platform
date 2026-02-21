"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full max-w-7xl mx-auto px-4 sm:px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
