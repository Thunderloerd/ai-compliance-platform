"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarContext, useSidebar } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className={cn("flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-in-out", collapsed ? "ml-16" : "ml-64")}>
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(true);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  const sidebarValue = useMemo(
    () => ({ collapsed, setCollapsed }),
    [collapsed]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <aside className="w-16 shrink-0 border-r border-border/50 flex flex-col items-center py-4 gap-2 bg-background">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-9 rounded-lg bg-muted/60 animate-pulse" />
          ))}
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/50 flex items-center px-6">
            <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
          </header>
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarContext.Provider value={sidebarValue}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarContext.Provider>
  );
}
