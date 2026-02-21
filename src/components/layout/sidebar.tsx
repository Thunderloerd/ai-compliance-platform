"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useAuth, type Role } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  FileUp,
  ScrollText,
  AlertTriangle,
  ClipboardCheck,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Settings,
  GitCompare,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TOOLTIP_DELAY_MS = 1000;

const allNavItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "compliance", "viewer"] },
    { href: "/profile", label: "Profile", icon: User, roles: ["admin", "compliance", "viewer"] },
    { href: "/upload", label: "Upload Policy", icon: FileUp, roles: ["admin", "compliance"] },
    { href: "/rules", label: "Rules", icon: ScrollText, roles: ["admin", "compliance"] },
    { href: "/ask-policy", label: "Ask policy", icon: MessageCircle, roles: ["admin", "compliance"] },
    { href: "/policy-impact", label: "Policy Impact", icon: GitCompare, roles: ["admin", "compliance"] },
    { href: "/violations", label: "Violations", icon: AlertTriangle, roles: ["admin", "compliance"] },
    { href: "/review", label: "Review", icon: ClipboardCheck, roles: ["admin", "compliance"] },
    { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin", "compliance", "viewer"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  ];

function SidebarInner() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { user } = useAuth();
  const [tooltipHref, setTooltipHref] = React.useState<string | null>(null);
  const [tooltipBounds, setTooltipBounds] = React.useState<{ left: number; top: number } | null>(null);
  const tooltipTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredElementRef = React.useRef<HTMLElement | null>(null);
  const collapseButtonRef = React.useRef<HTMLDivElement | null>(null);

  const navItems = React.useMemo(
    () => (user ? allNavItems.filter((item) => item.roles.includes(user.role)) : []),
    [user]
  );

  const clearTooltipTimeout = React.useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  }, []);

  const handleNavMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!collapsed) return;
      clearTooltipTimeout();
      hoveredElementRef.current = e.currentTarget;
      tooltipTimeoutRef.current = setTimeout(() => {
        const el = hoveredElementRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          setTooltipBounds({ left: rect.right + 8, top: rect.top + rect.height / 2 });
        }
        setTooltipHref(href);
      }, TOOLTIP_DELAY_MS);
    },
    [collapsed, clearTooltipTimeout]
  );

  const handleNavMouseLeave = React.useCallback(() => {
    clearTooltipTimeout();
    hoveredElementRef.current = null;
    setTooltipHref(null);
    setTooltipBounds(null);
  }, [clearTooltipTimeout]);

  React.useEffect(() => () => clearTooltipTimeout(), [clearTooltipTimeout]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b border-border/50 px-4 shrink-0">
        {collapsed ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">AI Compliance</p>
              <p className="text-xs text-muted-foreground leading-tight">Intelligence</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setCollapsed(true)}
              onMouseEnter={(e) => handleNavMouseEnter(e, item.href)}
              onMouseLeave={handleNavMouseLeave}
              className="block relative"
            >
              <div
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-sm" />
                )}
                <Icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div ref={collapseButtonRef} className="border-t border-border/50 p-3 shrink-0 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          onMouseEnter={() => {
            if (!collapsed) return;
            clearTooltipTimeout();
            tooltipTimeoutRef.current = setTimeout(() => {
              const el = collapseButtonRef.current;
              if (el) {
                const rect = el.getBoundingClientRect();
                setTooltipBounds({ left: rect.right + 8, top: rect.top + rect.height / 2 });
              }
              setTooltipHref("__collapse");
            }, TOOLTIP_DELAY_MS);
          }}
          onMouseLeave={() => { clearTooltipTimeout(); setTooltipHref(null); setTooltipBounds(null); }}
          className="w-full hover:bg-accent/50 transition-colors duration-150"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {typeof document !== "undefined" &&
        collapsed &&
        tooltipHref &&
        tooltipBounds &&
        createPortal(
          <div
            className="fixed z-[100] px-2.5 py-1.5 rounded-md bg-popover border border-border shadow-md text-sm text-popover-foreground whitespace-nowrap pointer-events-none"
            style={{
              left: tooltipBounds.left,
              top: tooltipBounds.top,
              transform: "translateY(-50%)",
            }}
            role="tooltip"
          >
            {tooltipHref === "__collapse"
              ? "Expand sidebar"
              : navItems.find((i) => i.href === tooltipHref)?.label ?? ""}
          </div>,
          document.body
        )}
    </aside>
  );
}

export const Sidebar = React.memo(SidebarInner);
