"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

const LOGIN_TIMEOUT_MS = 15000;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login, loginError, clearLoginError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginError();
    setSubmitError(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      return; // validation message shown below
    }
    setIsSubmitting(true);
    try {
      const ok = await Promise.race([
        login(trimmedEmail, trimmedPassword),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error("Connection timed out. Check that the backend is running.")),
            LOGIN_TIMEOUT_MS
          )
        ),
      ]);
      if (!ok) setIsSubmitting(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setSubmitError(msg);
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;
  const showRequiredError = email.length > 0 || password.length > 0;
  const missingFields: string[] = [];
  if (showRequiredError && !email.trim()) missingFields.push("Email");
  if (showRequiredError && !password.trim()) missingFields.push("Password");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Layered background for depth */}
      <div className="absolute inset-0 -z-10 bg-gradient-mesh bg-mesh-animate" />
      <div className="absolute inset-0 -z-10 mesh-layer bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(15,118,110,0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,212,191,0.08),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(15,118,110,0.04)_1px,transparent_0)] bg-[length:28px_28px]" aria-hidden />
      {/* Soft decorative blobs - fill empty space */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-primary/5 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-3xl" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/40 via-primary/25 to-primary/20 shadow-[0_25px_50px_-12px_rgba(15,118,110,0.2)] dark:from-primary/30 dark:via-primary/20 dark:to-primary/15 dark:shadow-none dark:border dark:border-border/60"
        >
          {/* Card: light theme depth, dark theme matches surface */}
          <div className="relative rounded-2xl bg-white p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_4px_6px_-2px_rgba(0,0,0,0.05),0_12px_24px_-4px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(15,118,110,0.12)] dark:bg-card dark:shadow-none dark:border dark:border-border/50 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-5 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12, duration: 0.35, type: "spring", stiffness: 200 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 ring-2 ring-primary/20 ring-offset-4 ring-offset-white dark:ring-offset-card animate-float"
              >
                <Shield className="h-7 w-7 text-primary-foreground" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
              >
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  AI Compliance Intelligence Platform
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Secure access to your compliance dashboard
                </p>
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {(submitError || loginError || missingFields.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {submitError || loginError || (missingFields.length > 0 ? `${missingFields.join(" and ")} required` : null)}
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22, duration: 0.3 }}
              >
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-border/80 bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28, duration: 0.3 }}
              >
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border-border/80 bg-background pr-11 text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.25 }}
                className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5"
              >
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  Use the email and password from your admin to sign in.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="submit"
                  variant="default"
                  className="btn-gradient h-11 w-full rounded-lg font-medium text-primary-foreground transition-all duration-200 hover:opacity-95 hover:shadow-glow active:scale-[0.99]"
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <Link
            href="/"
            className="rounded-full border border-border/80 bg-muted/30 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            prefetch
          >
            ← Back to home
          </Link>
          <p className="max-w-xs text-center text-xs text-muted-foreground/80">
            New to the platform? Contact your admin for access.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
