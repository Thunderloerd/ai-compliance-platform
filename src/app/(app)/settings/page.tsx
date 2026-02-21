"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/page-transition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { Bell, FileText, Users, Sliders, Database, UserPlus, Trash2 } from "lucide-react";
import { config } from "@/lib/env";
import { connectDatabase, fetchDatabaseStatus, getSettings, updateSettings, fetchUsers, createUser, setUserPassword, deleteUser } from "@/api";

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [scanFreq, setScanFreq] = useState("daily");
  const [severity, setSeverity] = useState(70);
  const [riskThreshold, setRiskThreshold] = useState(60);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [aiModel, setAiModel] = useState("llama-3.3-70b-versatile");
  const [confidence, setConfidence] = useState(85);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [maxUploadsPerHour, setMaxUploadsPerHour] = useState(30);
  const [maxZipSizeGb, setMaxZipSizeGb] = useState(15);
  const [dbHost, setDbHost] = useState("");
  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbConnected, setDbConnected] = useState(false);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbMessage, setDbMessage] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ id: number; email: string; name: string; role: string; department: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserName, setAddUserName] = useState("");
  const [addUserRole, setAddUserRole] = useState("Viewer");
  const [addUserDept, setAddUserDept] = useState("");
  const [addUserPassword, setAddUserPassword] = useState("");
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [setPasswordUserId, setSetPasswordUserId] = useState<number | null>(null);
  const [setPasswordValue, setSetPasswordValue] = useState("");
  const [setPasswordSubmitting, setSetPasswordSubmitting] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!config.apiUrl) {
      setSettingsLoading(false);
      return;
    }
    setSettingsLoading(true);
    try {
      const s = await getSettings();
      if (s.scan_frequency) setScanFreq(s.scan_frequency);
      if (s.severity_threshold) setSeverity(Number(s.severity_threshold) || 70);
      if (s.risk_threshold) setRiskThreshold(Number(s.risk_threshold) || 60);
      setEmailAlerts(s.email_alerts !== "false");
      setSlackWebhook(s.slack_webhook ?? "");
      if (s.ai_model) setAiModel(s.ai_model);
      if (s.confidence_threshold) setConfidence(Number(s.confidence_threshold) || 85);
      if ("policy_upload_max_file_size_mb" in s) setMaxFileSizeMb(Math.max(1, Number(s.policy_upload_max_file_size_mb) || 10));
      if ("policy_upload_max_per_hour" in s) setMaxUploadsPerHour(Math.max(0, Number(s.policy_upload_max_per_hour) || 0));
      if ("zip_upload_max_size_gb" in s) setMaxZipSizeGb(Math.max(1, Math.min(100, Number(s.zip_upload_max_size_gb) || 15)));
      const status = await fetchDatabaseStatus();
      setDbConnected(status.connected);
      if (status.host) setDbHost(status.host);
      if (status.username) setDbUsername(status.username);
      if (status.db_name) setDbName(status.db_name);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!config.apiUrl) return;
    setUsersLoading(true);
    try {
      const list = await fetchUsers();
      setUsersList(list);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // When backend is not connected, load max ZIP size from localStorage (set by user in Policy tab)
  useEffect(() => {
    if (config.apiUrl) return;
    try {
      const stored = localStorage.getItem("compliance_zip_max_size_gb");
      if (stored !== null) {
        const val = Number(stored);
        if (Number.isFinite(val) && val >= 1 && val <= 100) setMaxZipSizeGb(val);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">Access denied</p>
          <p className="mt-1 text-sm">Settings are available to administrators only.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.replace("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-8 max-w-5xl">
        <div className="select-none-static">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            System, notifications, policy, and user management
          </p>
        </div>

        {!config.apiUrl && (
          <div className="select-none-static rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <strong>Backend not connected.</strong> Set <strong>NEXT_PUBLIC_API_URL</strong> in <strong>.env.local</strong> (e.g. <code className="rounded bg-muted px-1">http://localhost:8000</code>) and restart the dev server to load and save settings. All values below are from the backend when connected.
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
            <Tabs defaultValue="system" className="space-y-4 sm:space-y-6">
            <TabsList className="flex w-full flex-nowrap overflow-x-auto gap-1 p-1 rounded-lg bg-muted/50 min-h-10 sm:grid sm:grid-cols-5 sm:max-w-3xl sm:overflow-visible">
              <TabsTrigger value="system" className="gap-1.5 sm:gap-2 shrink-0 px-3">
                <Sliders className="h-4 w-4" />
                System
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-1.5 sm:gap-2 shrink-0 px-3">
                <Database className="h-4 w-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 sm:gap-2 shrink-0 px-3">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="policy" className="gap-1.5 sm:gap-2 shrink-0 px-3">
                <FileText className="h-4 w-4" />
                Policy
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 sm:gap-2 shrink-0 px-3">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-6">
              <Card className="bg-card/80 backdrop-blur border-border/80">
                <CardHeader>
                  <h3 className="font-semibold">System Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan frequency, severity, and risk threshold (saved to backend)
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!config.apiUrl ? (
                    <p className="text-sm text-muted-foreground">Connect the backend to load and save system settings.</p>
                  ) : settingsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading settings…</p>
                  ) : (
                    <>
                  <div>
                    <label className="text-sm font-medium">Scan frequency</label>
                    <select
                      value={scanFreq}
                      onChange={(e) => setScanFreq(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Severity threshold: {severity}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Risk threshold: {riskThreshold}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={riskThreshold}
                      onChange={(e) => setRiskThreshold(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                  <Button
                    disabled={settingsSaving}
                    onClick={async () => {
                      setSettingsSaving(true);
                      try {
                        await updateSettings({
                          scan_frequency: scanFreq,
                          severity_threshold: severity,
                          risk_threshold: riskThreshold,
                        });
                        toast("Saved");
                      } catch {
                        toast("Could not save. Check backend connection.");
                      } finally {
                        setSettingsSaving(false);
                      }
                    }}
                  >
                    {settingsSaving ? "Saving…" : "Save system settings"}
                  </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <Card className="bg-card/80 backdrop-blur border-border/80">
                <CardHeader>
                  <h3 className="font-semibold">Company database connection</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect the database to scan for compliance violations. After connecting, go to Dashboard and click &quot;Run scan now&quot;.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!config.apiUrl ? (
                    <p className="text-sm text-muted-foreground">
                      Set NEXT_PUBLIC_API_URL to use database connection.
                    </p>
                  ) : (
                    <>
                      {dbConnected && (
                        <p className="text-sm text-success font-medium">
                          Connected to {dbHost || "—"} / {dbName || "—"}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        After a backend restart you must reconnect (password is not saved). Form is pre-filled with last-used host and database name.
                      </p>
                      <div>
                        <label className="text-sm font-medium">Host</label>
                        <Input
                          placeholder="localhost or 192.168.1.10"
                          value={dbHost}
                          onChange={(e) => { setDbHost(e.target.value); setDbMessage(null); setDbError(null); }}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Username</label>
                        <Input
                          placeholder="postgres"
                          value={dbUsername}
                          onChange={(e) => { setDbUsername(e.target.value); setDbMessage(null); setDbError(null); }}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={dbPassword}
                          onChange={(e) => { setDbPassword(e.target.value); setDbMessage(null); setDbError(null); }}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Database name</label>
                        <Input
                          placeholder="compliance_db"
                          value={dbName}
                          onChange={(e) => { setDbName(e.target.value); setDbMessage(null); setDbError(null); }}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use the actual PostgreSQL database name (e.g. compliance_db), not the server name (e.g. Pratham).
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          if (!dbHost.trim() || !dbUsername.trim() || !dbName.trim()) return;
                          setDbConnecting(true);
                          setDbMessage(null);
                          setDbError(null);
                          try {
                            await connectDatabase({
                              host: dbHost.trim(),
                              username: dbUsername.trim(),
                              password: dbPassword,
                              db_name: dbName.trim(),
                            });
                            setDbConnected(true);
                            setDbMessage("Connected successfully. Go to Dashboard and click Run scan now.");
                          } catch (e) {
                            setDbError(e instanceof Error ? e.message : "Connection failed");
                          } finally {
                            setDbConnecting(false);
                          }
                        }}
                        disabled={dbConnecting || !dbHost.trim() || !dbUsername.trim() || !dbName.trim()}
                      >
                        {dbConnecting ? "Connecting…" : "Connect database"}
                      </Button>
                      {dbMessage && (
                        <p className="text-sm text-success">{dbMessage}</p>
                      )}
                      {dbError && (
                        <p className="text-sm text-destructive">{dbError}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-card/80 backdrop-blur border-border/80">
                <CardHeader>
                  <h3 className="font-semibold">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Email alerts and Slack webhook URL (saved to backend)
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!config.apiUrl ? (
                    <p className="text-sm text-muted-foreground">Connect the backend to load and save notification settings.</p>
                  ) : settingsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading settings…</p>
                  ) : (
                    <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email alerts</span>
                    <Button
                      variant={emailAlerts ? "default" : "outline"}
                      size="sm"
                      disabled={settingsSaving}
                      onClick={async () => {
                        if (!config.apiUrl) return;
                        const next = !emailAlerts;
                        setEmailAlerts(next);
                        setSettingsSaving(true);
                        try {
                          await updateSettings({ email_alerts: next });
                          toast("Saved");
                        } catch {
                          toast("Could not save. Check backend connection.");
                        } finally {
                          setSettingsSaving(false);
                        }
                      }}
                    >
                      {emailAlerts ? "On" : "Off"}
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Slack webhook URL</label>
                    <Input
                      placeholder="https://hooks.slack.com/..."
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      onBlur={async () => {
                        if (!config.apiUrl) return;
                        setSettingsSaving(true);
                        try {
                          await updateSettings({ slack_webhook: slackWebhook });
                          toast("Saved");
                        } catch {
                          toast("Could not save. Check backend connection.");
                        } finally {
                          setSettingsSaving(false);
                        }
                      }}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Saved when you leave the field.</p>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policy" className="space-y-6">
              {!config.apiUrl && (
                <Card className="bg-card/80 backdrop-blur border-border/80">
                  <CardHeader>
                    <h3 className="font-semibold">Max ZIP file size (no backend)</h3>
                    <p className="text-sm text-muted-foreground">
                      Set the maximum ZIP file size for the Upload page. Stored in your browser.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="text-sm font-medium">Max ZIP file size (GB)</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={maxZipSizeGb}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(100, Number(e.target.value) || 15));
                          setMaxZipSizeGb(val);
                          try {
                            localStorage.setItem("compliance_zip_max_size_gb", String(val));
                          } catch {
                            // ignore
                          }
                        }}
                        className="mt-2 max-w-[120px]"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Upload page will reject ZIPs larger than this (default 15 GB).</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="bg-card/80 backdrop-blur border-border/80">
                <CardHeader>
                  <h3 className="font-semibold">Policy Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    AI extraction model and confidence threshold (saved to backend)
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!config.apiUrl ? (
                    <p className="text-sm text-muted-foreground">Connect the backend to load and save policy settings.</p>
                  ) : settingsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading settings…</p>
                  ) : (
                    <>
                  <div>
                    <label className="text-sm font-medium">AI extraction model</label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence threshold: {confidence}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max policy upload file size (MB)</label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={maxFileSizeMb}
                      onChange={(e) => setMaxFileSizeMb(Math.max(1, Math.min(500, Number(e.target.value) || 10)))}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Prevents single huge PDFs from exhausting memory (DoS protection).</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max policy uploads per hour</label>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      value={maxUploadsPerHour}
                      onChange={(e) => setMaxUploadsPerHour(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">0 = no limit. Prevents many uploads from bloating DB or burning quota.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max ZIP file size (GB)</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={maxZipSizeGb}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(100, Number(e.target.value) || 15));
                        setMaxZipSizeGb(val);
                        try {
                          localStorage.setItem("compliance_zip_max_size_gb", String(val));
                        } catch {
                          // ignore
                        }
                      }}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Maximum size for a single ZIP upload on the Upload page (e.g. 15 GB). Also saved locally when backend is not connected.</p>
                  </div>
                  <Button
                    disabled={settingsSaving}
                    onClick={async () => {
                      setSettingsSaving(true);
                      try {
                        try {
                          localStorage.setItem("compliance_zip_max_size_gb", String(maxZipSizeGb));
                        } catch {
                          // ignore
                        }
                        await updateSettings({
                          ai_model: aiModel,
                          confidence_threshold: confidence,
                          policy_upload_max_file_size_mb: maxFileSizeMb,
                          policy_upload_max_per_hour: maxUploadsPerHour,
                          zip_upload_max_size_gb: maxZipSizeGb,
                        });
                        toast("Saved");
                      } catch {
                        toast("Could not save. Check backend connection.");
                      } finally {
                        setSettingsSaving(false);
                      }
                    }}
                  >
                    {settingsSaving ? "Saving…" : "Save policy settings"}
                  </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card className="bg-card/80 backdrop-blur border-border/80">
                <CardHeader>
                  <h3 className="font-semibold">User Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Add users and assign roles (stored in backend)
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {config.apiUrl ? (
                    <>
                      <Button onClick={() => { setAddUserOpen(true); setAddUserError(null); setAddUserEmail(""); setAddUserName(""); setAddUserRole("Viewer"); setAddUserDept(""); setAddUserPassword(""); }} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add user
                      </Button>
                      {usersLoading ? (
                        <p className="text-sm text-muted-foreground">Loading users…</p>
                      ) : usersList.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No users yet. Add a user above.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border/50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50 bg-muted/30">
                                <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                                <th className="px-4 py-3 text-left font-medium text-foreground">Role</th>
                                <th className="px-4 py-3 text-left font-medium text-foreground">Department</th>
                                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersList.map((u) => (
                                <tr key={u.id} className="border-b border-border/30 last:border-0">
                                  <td className="px-4 py-3 font-medium">{u.name}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                  <td className="px-4 py-3">
                                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{u.role}</span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{u.department || "—"}</td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => { setSetPasswordUserId(u.id); setSetPasswordValue(""); setSetPasswordError(null); }}>
                                        Set password
                                      </Button>
                                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteConfirmUser({ id: u.id, name: u.name, email: u.email })}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_API_URL to manage users.</p>
                  )}
                </CardContent>
              </Card>

              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add user</DialogTitle>
                    <DialogDescription>Create a new user. Set a password so they can log in with their email and this password; their role (Admin, Compliance Officer, Viewer) determines what they can do.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        placeholder="user@company.com"
                        value={addUserEmail}
                        onChange={(e) => setAddUserEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="Full name"
                        value={addUserName}
                        onChange={(e) => setAddUserName(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <select
                        value={addUserRole}
                        onChange={(e) => setAddUserRole(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Compliance Officer">Compliance Officer</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input
                        type="password"
                        placeholder="Set login password (required to sign in)"
                        value={addUserPassword}
                        onChange={(e) => setAddUserPassword(e.target.value)}
                        className="mt-2"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">They will sign in with this email and password. You can change it later with Set password.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Department (optional)</label>
                      <Input
                        placeholder="Operations"
                        value={addUserDept}
                        onChange={(e) => setAddUserDept(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    {addUserError && <p className="text-sm text-destructive">{addUserError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
                    <Button
                      disabled={!addUserEmail.trim() || addUserSubmitting}
                      onClick={async () => {
                        if (!addUserEmail.trim()) return;
                        setAddUserSubmitting(true);
                        setAddUserError(null);
                        try {
                          await createUser({
                            email: addUserEmail.trim(),
                            name: addUserName.trim() || addUserEmail.trim().split("@")[0],
                            role: addUserRole,
                            department: addUserDept.trim() || undefined,
                            password: addUserPassword.trim() || undefined,
                          });
                          setAddUserOpen(false);
                          loadUsers();
                        } catch (e) {
                          setAddUserError(e instanceof Error ? e.message : "Failed to create user");
                        } finally {
                          setAddUserSubmitting(false);
                        }
                      }}
                    >
                      {addUserSubmitting ? "Creating…" : "Create user"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={deleteConfirmUser != null} onOpenChange={(open) => { if (!open) { setDeleteConfirmUser(null); setDeleteError(null); } }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete user</DialogTitle>
                    <DialogDescription>
                      Delete <strong>{deleteConfirmUser?.name}</strong> ({deleteConfirmUser?.email})? This cannot be undone. They will no longer be able to sign in.
                    </DialogDescription>
                  </DialogHeader>
                  {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDeleteConfirmUser(null); setDeleteError(null); }}>Cancel</Button>
                    <Button
                      variant="destructive"
                      disabled={deleteSubmitting}
                      onClick={async () => {
                        if (deleteConfirmUser == null) return;
                        setDeleteSubmitting(true);
                        setDeleteError(null);
                        try {
                          await deleteUser(deleteConfirmUser.id);
                          setDeleteConfirmUser(null);
                          loadUsers();
                        } catch (e) {
                          setDeleteError(e instanceof Error ? e.message : "Failed to delete user");
                        } finally {
                          setDeleteSubmitting(false);
                        }
                      }}
                    >
                      {deleteSubmitting ? "Deleting…" : "Delete user"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={setPasswordUserId != null} onOpenChange={(open) => { if (!open) setSetPasswordUserId(null); setSetPasswordError(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set password</DialogTitle>
                    <DialogDescription>
                      Set or change this user&apos;s login password. They will sign in with their email and this password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="text-sm font-medium">New password</label>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        value={setPasswordValue}
                        onChange={(e) => setSetPasswordValue(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    {setPasswordError && <p className="text-sm text-destructive">{setPasswordError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSetPasswordUserId(null)}>Cancel</Button>
                    <Button
                      disabled={!setPasswordValue.trim() || setPasswordSubmitting}
                      onClick={async () => {
                        if (setPasswordUserId == null || !setPasswordValue.trim()) return;
                        setSetPasswordSubmitting(true);
                        setSetPasswordError(null);
                        try {
                          await setUserPassword(setPasswordUserId, setPasswordValue.trim());
                          setSetPasswordUserId(null);
                          setSetPasswordValue("");
                          loadUsers();
                        } catch (e) {
                          setSetPasswordError(e instanceof Error ? e.message : "Failed to set password");
                        } finally {
                          setSetPasswordSubmitting(false);
                        }
                      }}
                    >
                      {setPasswordSubmitting ? "Saving…" : "Set password"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </PageTransition>
  );
}
