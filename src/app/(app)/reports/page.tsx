"use client";

import { useState, useEffect } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart-dynamic";
import { FileBarChart, Download, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAnalytics } from "@/api/hooks";
import { downloadReport, trackReportViewed } from "@/api";
import { config } from "@/lib/env";

export default function ReportsPage() {
  const { isViewer } = useAuth();
  const { data: analytics, isLoading, error } = useAnalytics();
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    trackReportViewed();
  }, []);

  const handleExportPDF = async () => {
    if (!config.apiUrl) {
      setExportError("API not configured");
      return;
    }
    setExportError(null);
    setExporting("pdf");
    try {
      await downloadReport("pdf");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "No data found or export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = async () => {
    if (!config.apiUrl) {
      setExportError("API not configured");
      return;
    }
    setExportError(null);
    setExporting("csv");
    try {
      await downloadReport("csv");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "No data found or export failed");
    } finally {
      setExporting(null);
    }
  };

  if (isLoading && !analytics) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }
  if (error || !analytics) {
    return (
      <PageTransition>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          {error?.message ?? "Failed to load report data."}
        </div>
      </PageTransition>
    );
  }

  const { reportMetrics, trendData } = analytics;

  return (
    <PageTransition>
      <div className="space-y-8">
        {!config.apiUrl && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <strong>Backend not connected.</strong> Set <strong>NEXT_PUBLIC_API_URL</strong> in <strong>.env.local</strong> (e.g. <code className="rounded bg-muted px-1">http://localhost:8000</code>) and restart the dev server to enable Download PDF and Export CSV.
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-1 text-muted-foreground">
              Compliance analytics and export options
            </p>
          </div>
          {!isViewer && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={!!exporting}
                  variant="gradient"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exporting === "pdf" ? "Generating…" : "Download PDF Report"}
                </Button>
                <Button
                  onClick={handleExportCSV}
                  disabled={!!exporting}
                  variant="outline"
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {exporting === "csv" ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
              {exportError && (
                <p className="text-sm text-destructive">{exportError}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Policies Reviewed"
            value={reportMetrics.policiesReviewed}
            icon={<FileBarChart />}
          />
          <KpiCard
            title="Violations Resolved"
            value={reportMetrics.violationsResolved}
            icon={<FileBarChart />}
          />
          <KpiCard
            title="Avg Resolution Time"
            value={reportMetrics.averageResolutionTime}
            icon={<FileBarChart />}
          />
          <KpiCard
            title="Compliance Trend"
            value={reportMetrics.complianceTrend}
            icon={<FileBarChart />}
            className="capitalize"
          />
        </div>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Trend Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Compliance score and violation trends over time
            </p>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Report Summary</h3>
              <p className="text-sm text-muted-foreground">
                Key metrics for the current period
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total compliance score
                  </span>
                  <span className="font-medium">{analytics.complianceScore}%</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">
                    Active policies
                  </span>
                  <span className="font-medium">{analytics.totalPolicies}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">
                    Open violations
                  </span>
                  <span className="font-medium">{analytics.activeViolations}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">
                    Critical alerts
                  </span>
                  <span className="font-medium text-amber-400">
                    {analytics.criticalAlerts}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {!isViewer && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Export Options</h3>
                <p className="text-sm text-muted-foreground">
                  Download reports in various formats
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/50 p-4">
                  <h4 className="font-medium">Compliance PDF Report</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Full compliance report with charts and metrics
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={handleExportPDF}
                    disabled={!!exporting}
                  >
                    {exporting === "pdf" ? "Generating..." : "Download PDF"}
                  </Button>
                </div>
                <div className="rounded-lg border border-border/50 p-4">
                  <h4 className="font-medium">Violations CSV</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Export all violations for external analysis
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleExportCSV}
                    disabled={!!exporting}
                  >
                    {exporting === "csv" ? "Exporting..." : "Export CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
