"use client";

import { useState, lazy, Suspense } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageContainer } from "@/components/layout/page-container";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ComplianceScore } from "@/components/dashboard/compliance-score";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, ShieldAlert, Bell, PlayCircle } from "lucide-react";
import { useAnalytics } from "@/api/hooks";
import { runScan } from "@/api";
import { config } from "@/lib/env";
import DashboardLoading from "./loading";

const TrendChart = lazy(() =>
  import("@/components/dashboard/trend-chart-dynamic").then((m) => ({ default: m.TrendChart }))
);
const RiskHeatmap = lazy(() =>
  import("@/components/dashboard/risk-heatmap").then((m) => ({ default: m.RiskHeatmap }))
);
const RecentViolations = lazy(() =>
  import("@/components/dashboard/recent-violations").then((m) => ({ default: m.RecentViolations }))
);

export default function DashboardPage() {
  const { data: analytics, isLoading, error, refetch } = useAnalytics();
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleRunScan = async () => {
    if (!config.apiUrl) return;
    setScanning(true);
    setScanMessage(null);
    setScanError(null);
    try {
      const result = await runScan();
      const msg = (result as { message?: string }).message;
      if (msg && result.rules_checked === 0) {
        setScanMessage(msg);
      } else {
        setScanMessage(
          `Scan complete: ${result.total_violations} violation(s) found (${result.rules_checked} rules checked${result.scan_duration_seconds != null ? ` in ${result.scan_duration_seconds}s` : ""}).`
        );
      }
      refetch();
    } catch (e) {
      const err = e as { message?: string };
      setScanError(err?.message ?? (e instanceof Error ? e.message : "Scan failed"));
    } finally {
      setScanning(false);
    }
  };

  if (isLoading && !analytics) {
    return <DashboardLoading />;
  }
  if (error || !analytics) {
    return (
      <PageTransition>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          {error?.message ?? "Failed to load dashboard data."}
        </div>
      </PageTransition>
    );
  }

  const { complianceScore, totalPolicies, activeViolations, criticalAlerts, trendData, departmentRiskHeatmap, recentViolations } = analytics;

  return (
    <PageTransition>
      <PageContainer className="space-y-8">
        <SectionHeader
          title="Dashboard"
          description="AI-powered compliance monitoring and analytics overview"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Compliance Score"
            value={`${complianceScore}%`}
            icon={<ShieldAlert />}
            delay={0}
            gradient
            accent="primary"
          />
          <KpiCard
            title="Total Policies"
            value={totalPolicies}
            icon={<FileText />}
            delay={0}
            accent="muted"
          />
          <KpiCard
            title="Active Violations"
            value={activeViolations}
            icon={<AlertTriangle />}
            delay={0}
            accent="danger"
          />
          <KpiCard
            title="Critical Alerts"
            value={criticalAlerts}
            icon={<Bell />}
            delay={0}
            accent="danger"
          />
        </div>

        {config.apiUrl && (
          <Card glass={false} className="border-primary/30 bg-primary/5 rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Scan database
                </h3>
                <p className="text-sm text-muted-foreground">
                  Run a compliance scan against your connected company database. Rules from uploaded policies are executed; violations appear below and in Review.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleRunScan}
                  disabled={scanning || (analytics?.totalPolicies ?? 0) === 0}
                  variant="default"
                >
                  {scanning ? "Scanning…" : "Run scan now"}
                </Button>
                {scanMessage && (
                  <p className="text-sm text-success">{scanMessage}</p>
                )}
                {scanError && (
                  <p className="text-sm text-destructive">{scanError}</p>
                )}
                {(analytics?.totalPolicies ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">Upload at least one policy first, and connect your database via Settings or API.</p>
                )}
                {(analytics?.totalPolicies ?? 0) > 0 && !scanMessage && !scanError && (
                  <p className="text-xs text-muted-foreground">
                    Your company database must have tables and columns that match the rules from your policies (e.g. policy_docs with compliance_verified, retention_period_years). Create them in pgAdmin if the scan fails.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card glass={false} variant="elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-subheading font-semibold">30-Day Compliance Trend</h3>
                    <p className="text-sm text-muted-foreground">
                      Score progression over the last 30 days
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <ComplianceScore score={complianceScore} size={80} strokeWidth={8} />
                  </div>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <div className="flex h-[300px] min-h-[300px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                      <p className="text-sm text-muted-foreground">No trend data yet. Run scans over time to see score progression.</p>
                    </div>
                  ) : (
                    <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-muted/30" />}>
                      <TrendChart data={trendData} />
                    </Suspense>
                  )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card glass={false} variant="elevated">
              <CardHeader>
                <h3 className="text-subheading font-semibold">Risk Heatmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Department-based risk distribution. Each bar shows a department&apos;s risk score; higher % means more risk (more violations or severity).
                  </p>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[200px] animate-pulse rounded-lg bg-muted/30" />}>
                    <RiskHeatmap data={departmentRiskHeatmap} />
                  </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="h-[240px] animate-pulse rounded-2xl bg-muted/30" />}>
              <RecentViolations violations={recentViolations} />
            </Suspense>
          </div>
        </div>
      </PageContainer>
    </PageTransition>
  );
}
