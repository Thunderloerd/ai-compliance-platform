"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      <h1
        className={cn(
          "text-heading-1 font-bold tracking-tight text-foreground",
          titleClassName
        )}
      >
        {title}
      </h1>
      {description != null && (
        <p
          className={cn(
            "text-sm text-muted-foreground",
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
