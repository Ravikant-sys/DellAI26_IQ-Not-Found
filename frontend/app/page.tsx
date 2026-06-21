"use client";

import Link from "next/link";
import {
  ArrowRight, Terminal, Users, Send, Star,
  Trophy, ShieldAlert, BarChart2, Cpu, Zap, Shield, Activity,
} from "lucide-react";

const modules = [
  {
    href: "/dashboard",
    icon: Terminal,
    label: "Organizer",
    title: "Control Center",
    desc: "Live agent logs, reviewer matrix, ledger verification and event management in one place.",
    accent: "indigo",
  },
  {
    href: "/register",
    icon: Users,
    label: "Registration",
    title: "Join the Hackathon",
    desc: "Multi-step onboarding with DBSCAN vector deduplication and spaCy NER skill extraction.",
    accent: "emerald",
  },
  {
    href: "/submit",
    icon: Send,
    label: "Submission",
    title: "Submit a Project",
    desc: "Submit your build and instantly trigger cosine similarity plagiarism detection.",
    accent: "sky",
  },
  {
    href: "/review",
    icon: Star,
    label: "Evaluation",
    title: "Judge Scorecard",
    desc: "Score submissions on four criteria. Z-score bias calibration fires automatically.",
    accent: "amber",
  },
  {
    href: "/results",
    icon: Trophy,
    label: "Results",
    title: "Live Leaderboard",
    desc: "Animated podium with Z-score normalized rankings and cryptographic winner certificates.",
    accent: "amber",
  },
  {
    href: "/bias",
    icon: ShieldAlert,
    label: "Fairness",
    title: "Bias Monitor",
    desc: "Real-time WebSocket stream of scoring anomalies with gender, geographic and tech-stack flags.",
    accent: "rose",
  },
  {
    href: "/analytics",
    icon: BarChart2,
    label: "Analytics",
    title: "Platform Insights",
    desc: "Registration timeline, track distribution, bias breakdown and evaluation completion.",
    accent: "violet",
  },
];

const accentMap: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  indigo:  { dot: "bg-indigo-400",  text: "text-indigo-400",  bg: "bg-indigo-500/8",  border: "border-indigo-500/20" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
  sky:     { dot: "bg-sky-400",     text: "text-sky-400",     bg: "bg-sky-500/8",     border: "border-sky-500/20" },
  amber:   { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/8",   border: "border-amber-500/20" },
  rose:    { dot: "bg-rose-400",    text: "text-rose-400",    bg: "bg-rose-500/8",    border: "border-rose-500/20" },
  violet:  { dot: "bg-violet-400",  text: "text-violet-400",  bg: "bg-violet-500/8",  border: "border-violet-500/20" },
};

const techStack = ["FastAPI", "Next.js 14", "SQLModel", "ChromaDB", "LangGraph", "SciPy", "spaCy", "WebSockets", "PostgreSQL"];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="ambient" />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="font-outfit font-bold text-sm text-white tracking-tight">HackOS</span>
          <span className="badge badge-muted text-[10px]">Dell 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn btn-ghost text-xs">Dashboard</Link>
          <Link href="/register" className="btn btn-primary text-xs">Register Now <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 badge badge-indigo mb-6 text-xs">
            <span className="live-dot">Live</span>
          </div>

          <h1 className="font-outfit text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]" style={{ color: "#fff" }}>
            The Hackathon Platform<br />
            that <span className="text-shimmer">runs itself.</span>
          </h1>

          <p className="max-w-xl mx-auto text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
            Autonomous agents handle registration deduplication, judge matching, bias detection,
            and ranking — so you can focus on building, not administrating.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link href="/register" className="btn btn-primary px-6 py-3 text-sm">
              Register as Participant <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="btn btn-ghost px-6 py-3 text-sm">
              Open Organizer Dashboard
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { value: "18", label: "Projects" },
              { value: "3",  label: "Judges" },
              { value: "<2m", label: "Results" },
            ].map(({ value, label }) => (
              <div key={label} className="card py-4 animate-fade-up">
                <p className="font-outfit text-2xl font-extrabold text-white tracking-tight">{value}</p>
                <p className="section-label mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <p className="section-label text-center mb-8">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
          {[
            { icon: Cpu,    title: "DBSCAN Deduplication",   desc: "Cosine similarity on sentence embeddings catches plagiarism before it reaches judges.", color: "text-sky-400",     bg: "bg-sky-500/8" },
            { icon: Zap,    title: "Hungarian Matching",      desc: "Optimal bipartite assignment pairs judges to projects, minimising conflict-of-interest.", color: "text-amber-400",   bg: "bg-amber-500/8" },
            { icon: Shield, title: "Z-Score Calibration",     desc: "Per-judge score distributions are normalised, eliminating lenient and harsh outliers.", color: "text-emerald-400", bg: "bg-emerald-500/8" },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="card p-6 animate-fade-up">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 border border-white/5`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-outfit text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modules Grid ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <p className="section-label text-center mb-8">Platform modules</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {modules.map(({ href, icon: Icon, label, title, desc, accent }) => {
            const a = accentMap[accent];
            return (
              <Link key={href} href={href}
                className={`card card-lift p-5 group flex flex-col gap-4 cursor-pointer hover:${a.border} animate-fade-up`}>
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${a.text}`} />
                  </div>
                  <span className="section-label">{label}</span>
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-white text-base mb-1.5 group-hover:text-white/90 transition">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${a.text} mt-auto`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                  Open module
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="card p-6">
          <p className="section-label mb-4">Built with</p>
          <div className="flex flex-wrap gap-2">
            {techStack.map(tech => (
              <span key={tech} className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t text-center py-8 px-6"
        style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        <p className="text-xs font-mono">HackOS · Dell Future Minds AI Hackathon 2026 · PS1 Submission</p>
      </footer>
    </div>
  );
}
