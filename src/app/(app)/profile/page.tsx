"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/page-transition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { Activity, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/env";
import {
  fetchProfileActivity,
  fetchProfileMetrics,
  type ProfileActivityItem,
} from "@/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<ProfileActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [metrics, setMetrics] = useState<{ logins: number; reports_viewed: number; exports: number } | null>(null);

  const RECENT_ACTIVITY_INITIAL = 4;
  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, RECENT_ACTIVITY_INITIAL);
  const hasMoreActivity = recentActivity.length > RECENT_ACTIVITY_INITIAL;

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    fetchProfileActivity(50, 24)
      .then((list) => {
        if (!cancelled) setRecentActivity(list);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchProfileMetrics().then(setMetrics);
  }, []);

  // Refetch metrics when user returns to this tab (e.g. after exporting on Reports) so Exports count updates
  useEffect(() => {
    const onFocus = () => fetchProfileMetrics().then(setMetrics);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = user.role === "admin" ? "Admin" : user.role === "compliance" ? "Compliance Officer" : "Viewer";

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Your account and activity
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-xl border-2 border-primary/20 bg-card/95 p-6 shadow-lg shadow-primary/5",
            "dark:border-primary/30 dark:shadow-primary/10"
          )}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarFallback className="text-xl bg-primary/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">{roleLabel}</Badge>
                <Badge variant="outline">{user.department}</Badge>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <Card className="border-primary/10 bg-card/90 shadow-md">
              <CardHeader className="border-b border-border/50 pb-4">
                <h3 className="font-semibold flex items-center gap-2 text-foreground">
                  <span className="rounded-lg bg-primary/15 p-1.5">
                    <Activity className="h-4 w-4 text-primary" />
                  </span>
                  Activity metrics
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your usage this month
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Logins</span>
                  <span className="font-medium">{metrics?.logins ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reports viewed</span>
                  <span className="font-medium">{metrics?.reports_viewed ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exports</span>
                  <span className="font-medium">{metrics?.exports ?? "—"}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <Card className="border-primary/10 bg-card/90 shadow-md">
            <CardHeader className="border-b border-border/50 pb-4">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <span className="rounded-lg bg-primary/15 p-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                </span>
                Recent activity
              </h3>
              <p className="text-sm text-muted-foreground">
                Your latest actions (last 24 hours)
              </p>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity…</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {config.apiUrl
                    ? "No recent activity yet. Login, upload policies, run scans, or change your password to see activity here."
                    : "Connect the backend (NEXT_PUBLIC_API_URL) to see real activity (login, uploads, scans, password changes)."}
                </p>
              ) : (
                <>
                  <ul className="space-y-4">
                    {displayedActivity.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                      >
                        <span className="text-sm">{item.action}</span>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </li>
                    ))}
                  </ul>
                  {hasMoreActivity && !showAllActivity && (
                    <button
                      type="button"
                      onClick={() => setShowAllActivity(true)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <span>See all history (24 hours)</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                  {hasMoreActivity && showAllActivity && (
                    <button
                      type="button"
                      onClick={() => setShowAllActivity(false)}
                      className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronUp className="h-4 w-4" />
                      <span>Show less</span>
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
