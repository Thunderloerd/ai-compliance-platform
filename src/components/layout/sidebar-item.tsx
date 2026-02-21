"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: () => void;
  activeIndicator?: React.ReactNode;
  className?: string;
}

export function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
  onMouseEnter,
  onMouseLeave,
  activeIndicator,
  className,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn("block relative", className)}
    >
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
        )}
      >
        {activeIndicator}
        <Icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
    </Link>
  );
}
