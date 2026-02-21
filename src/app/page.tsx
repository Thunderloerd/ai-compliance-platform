"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, FileSearch, BarChart3, Zap, ArrowRight, FileText, Gauge, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const stagger = 0.08;
const container = { animate: { transition: { staggerChildren: stagger, delayChildren: 0.1 } } };
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Animated background layers - subtle "breathing" feel */}
      <div className="fixed inset-0 -z-10 bg-gradient-mesh bg-mesh-animate" />
      <div className="fixed inset-0 -z-10 mesh-layer bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(15,118,110,0.18),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,212,191,0.1),transparent_55%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_50%_50%_at_85%_50%,rgba(15,118,110,0.06),transparent_50%)] dark:opacity-80" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20"
            >
              <Shield className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="font-semibold">AI Compliance</span>
          </Link>
          <nav className="flex items-center gap-1">
            <a href="#features" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted/80 hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted/80 hover:text-foreground">
              How It Works
            </a>
            <Link href="/login">
              <Button variant="ghost" className="transition-smooth hover:bg-muted/80">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button className="transition-smooth hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]">Get Started</Button>
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative px-6 pb-16 pt-20 md:pb-20 md:pt-28">
        {/* Subtle dot pattern */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(15,118,110,0.06)_1px,transparent_0)] bg-[length:24px_24px]" aria-hidden />

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            className="text-center lg:text-left"
            initial="initial"
            animate="animate"
            variants={container}
          >
            <motion.h1
              variants={item}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            >
              AI-Powered Continuous{" "}
              <span className="gradient-text">Compliance Monitoring</span>
            </motion.h1>
            <motion.p
              variants={item}
              transition={{ duration: 0.5 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0"
            >
              Automate policy analysis and rule extraction with AI. Monitor compliance in real time, reduce risk, and keep your organization audit-ready.
            </motion.p>
            <motion.div
              variants={item}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            >
              <Link href="/login">
                <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="inline-block">
                  <Button size="lg" variant="gradient" className="btn-glow-pulse gap-2 shadow-lg shadow-primary/25 transition-smooth hover:shadow-xl hover:shadow-primary/30">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.span>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="transition-smooth hover:bg-muted/60 hover:border-primary/30 active:scale-[0.98]">
                  View Features
                </Button>
              </a>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              variants={item}
              className="mt-14 flex flex-wrap items-center justify-center gap-8 lg:justify-start lg:gap-12"
            >
              {[
                { icon: FileText, value: "500+", label: "Policies analyzed" },
                { icon: Gauge, value: "Real-time", label: "Monitoring" },
                { icon: ClipboardCheck, value: "Audit-ready", label: "Reports" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero visual - dashboard preview (fixed, intentional metrics) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl border border-border/80 bg-card/95 p-5 shadow-xl shadow-primary/10 backdrop-blur-sm">
              <div className="absolute -right-2 -top-2 -z-10 h-full w-full rounded-2xl border border-border/50 bg-card/90 shadow-lg" aria-hidden />
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="ml-2 text-xs font-medium text-muted-foreground">Live overview</span>
              </div>
              {/* KPIs - consistent snapshot */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">94</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Policies</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Issues</p>
                </div>
              </div>
              {/* Trend label + mini chart */}
              <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Compliance trend</p>
              <div className="mt-2 flex items-end gap-1.5 h-12">
                {[60, 75, 82, 78, 88, 94].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-0 rounded-t bg-primary/20 transition-all duration-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              {/* Risk breakdown - fixed counts */}
              <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3">
                <span className="text-[10px] font-medium text-muted-foreground">Critical: <strong className="text-foreground">0</strong></span>
                <span className="text-[10px] font-medium text-muted-foreground">High: <strong className="text-foreground">1</strong></span>
                <span className="text-[10px] font-medium text-muted-foreground">Medium: <strong className="text-foreground">2</strong></span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-border/50 bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="text-center text-3xl font-bold tracking-tight"
          >
            Enterprise-Grade Compliance, Simplified
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground"
          >
            From policy upload to violation tracking, one platform for continuous compliance.
          </motion.p>
          <motion.div
            className="mt-16 grid gap-8 md:grid-cols-3"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            variants={container}
          >
            {[
              { icon: FileSearch, title: "AI Rule Extraction", description: "Upload policies and let AI identify compliance rules, severity, and requirements automatically." },
              { icon: BarChart3, title: "Real-Time Monitoring", description: "Track compliance scores, violations, and trends across departments with live dashboards." },
              { icon: Zap, title: "Review & Remediation", description: "Approve or reject findings, add comments, and maintain a full audit trail for regulators." },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={item}
                transition={{ duration: 0.35 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-border/60 bg-card/90 p-6 shadow-md backdrop-blur-sm transition-smooth hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200 group-hover:bg-primary/15">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="text-center text-3xl font-bold tracking-tight"
          >
            How It Works
          </motion.h2>
          <motion.div
            className="mt-16 space-y-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            variants={container}
          >
            {[
              { step: 1, title: "Upload policies", text: "Drag and drop PDF policy documents into the platform." },
              { step: 2, title: "AI extracts rules", text: "Our AI identifies compliance rules, clauses, and severity levels." },
              { step: 3, title: "Monitor & detect", text: "Track violations, compliance scores, and risk by department." },
              { step: 4, title: "Review & report", text: "Approve findings, add comments, and export audit-ready reports." },
            ].map((row) => (
              <motion.div
                key={row.step}
                variants={item}
                transition={{ duration: 0.35 }}
                className="flex gap-6"
                whileHover={{ x: 4 }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-smooth">
                  {row.step}
                </div>
                <div>
                  <h3 className="font-semibold">{row.title}</h3>
                  <p className="mt-1 text-muted-foreground">{row.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Enterprise trust */}
      <section className="border-t border-border/50 bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center text-sm font-medium text-muted-foreground"
          >
            Trusted by compliance teams at leading enterprises
          </motion.p>
          <motion.div
            initial={{ opacity: 0.5 }}
            whileInView={{ opacity: 0.7 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-12"
          >
            {["Acme Corp", "GlobalTech", "SecureBank", "DataFirst", "CloudScale"].map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 0.7, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="text-lg font-semibold text-muted-foreground"
              >
                {name}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="border-t border-border/50 px-6 py-12"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Compliance Intelligence Platform</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">How It Works</a>
            <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AI Compliance Intelligence Platform. Enterprise compliance monitoring.
        </p>
      </motion.footer>
    </div>
  );
}
