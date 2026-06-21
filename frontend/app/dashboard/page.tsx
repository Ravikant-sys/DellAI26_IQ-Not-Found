"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import BiasPanel from "../../components/BiasPanel";
import Leaderboard from "../../components/Leaderboard";
import AnalyticsCharts from "../../components/AnalyticsCharts";
import {
  Terminal,
  ShieldAlert,
  RefreshCw,
  Award,
  Play,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileText,
  Database,
  Layers,
  BarChart2,
  XCircle,
  Users,
  Send,
  Star,
  Trophy,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

type ActiveTab = "overview" | "assignments" | "bias" | "analytics";

export default function DashboardPage() {
  const {
    submissions,
    leaderboard,
    logs,
    biasAlerts,
    loading,
    refresh,
    resolveAlert,
    overrideState,
  } = useStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [evalStatus, setEvalStatus] = useState<{ evaluation_closed: boolean }>({ evaluation_closed: false });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState("All");
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);
  const [ledgerResult, setLedgerResult] = useState<{ is_valid: boolean; verified_blocks: number; errors?: string[] } | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [winnerCert, setWinnerCert] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchAssignmentsAndResults = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/api/assignments`),
        fetch(`${API_BASE}/api/results`),
      ]);
      if (aRes.ok) setAssignments(await aRes.json());
      if (rRes.ok) setResults(await rRes.json());
    } catch {}
  };

  const fetchEvaluationStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/status`);
      if (res.ok) setEvalStatus(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchEvaluationStatus();
    fetchAssignmentsAndResults();
  }, []);

  useEffect(() => {
    fetchAssignmentsAndResults();
  }, [submissions, leaderboard]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    await fetchEvaluationStatus();
    await fetchAssignmentsAndResults();
    setIsRefreshing(false);
  };

  const handleAssignReviewers = async () => {
    setIsAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/review/assign`, { method: "POST" });
      if (res.ok) await triggerRefresh();
      else alert("Failed to assign reviewers.");
    } catch { alert("Error assigning reviewers."); }
    finally { setIsAssigning(false); }
  };

  const handleGenerateResults = async () => {
    setIsGeneratingResults(true);
    try {
      const res = await fetch(`${API_BASE}/api/results/generate`, { method: "POST" });
      if (res.ok) await triggerRefresh();
      else alert("Failed to generate results.");
    } catch { alert("Error generating results."); }
    finally { setIsGeneratingResults(false); }
  };

  const toggleEvaluationStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/config/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation_closed: !evalStatus.evaluation_closed }),
      });
      if (res.ok) { setEvalStatus(await res.json()); await refresh(); }
    } catch {}
    finally { setIsTogglingStatus(false); }
  };

  const seedInitialData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: "POST" });
      if (res.ok) await refresh();
      else alert("Failed to seed initial data.");
    } catch { alert("Error seeding database."); }
    finally { setIsSeeding(false); }
  };

  const runLedgerVerification = async () => {
    setIsVerifyingLedger(true);
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs/verify`);
      if (res.ok) setLedgerResult(await res.json());
    } catch {}
    finally { setIsVerifyingLedger(false); }
  };

  const fetchWinnerCertificate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/winner`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setWinnerCert(data.certificate);
        setIsWinnerModalOpen(true);
      } else alert(data.message || "Leaderboard is incomplete.");
    } catch { alert("Error generating winner certificate."); }
  };

  const flaggedSubmissions = submissions.filter(s => s.state === "FLAGGED_DUPLICATE");
  const filteredSubmissions = submissions.filter(s => {
    const notFlagged = s.state !== "FLAGGED_DUPLICATE";
    const trackMatch = selectedTrack === "All" || s.track === selectedTrack;
    return notFlagged && trackMatch;
  });

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview",     label: "Overview",    icon: <Activity className="w-4 h-4" /> },
    { key: "assignments",  label: "Assignments", icon: <Layers className="w-4 h-4" /> },
    { key: "bias",         label: "Bias Alerts", icon: <ShieldAlert className="w-4 h-4" />, badge: biasAlerts.length },
    { key: "analytics",   label: "Analytics",   icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* ── Top Header ── */}
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#38bdf8] animate-pulse" />
              Organizer Dashboard
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
              Dell Future Minds AI Hackathon 2026 · Agentic OS Console
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Quick links */}
            <Link href="/register" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-xl transition">
              <Users className="w-3.5 h-3.5" /> Register
            </Link>
            <Link href="/submit" className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 text-xs font-bold rounded-xl transition">
              <Send className="w-3.5 h-3.5" /> Submit
            </Link>
            <Link href="/review" className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs font-bold rounded-xl transition">
              <Star className="w-3.5 h-3.5" /> Review
            </Link>
            <Link href="/results" className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-xs font-bold rounded-xl transition">
              <Trophy className="w-3.5 h-3.5" /> Results
            </Link>
            <button onClick={triggerRefresh} disabled={isRefreshing}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.06] rounded-xl text-xs font-bold text-slate-200 transition">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Sync
            </button>
          </div>
        </header>

        {/* ── Hero Card ── */}
        <div className="bg-gradient-to-br from-[#101b35] via-[#0e1626] to-[#080d19] rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden shadow-2xl shadow-blue-950/20 animate-modal-open">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">Featured</span>
                <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {evalStatus.evaluation_closed ? "Evaluations Closed" : "Live & Active"}
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                Dell Future Minds AI Hackathon 2026
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Submissions", value: submissions.filter(s => s.state !== "FLAGGED_DUPLICATE").length, color: "text-sky-400" },
                  { label: "Bias Flags", value: biasAlerts.length, color: "text-rose-400" },
                  { label: "Leaderboard", value: leaderboard.length, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/[0.04]">
                    <p className={`text-xl font-extrabold font-mono ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:self-end">
              <button onClick={seedInitialData} disabled={isSeeding}
                className="px-5 py-2.5 bg-white text-blue-900 hover:bg-slate-50 rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50">
                {isSeeding ? "Seeding..." : "Seed Demo Data"}
              </button>
              <button onClick={toggleEvaluationStatus} disabled={isTogglingStatus}
                className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md border transition ${evalStatus.evaluation_closed
                  ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
                  : "bg-rose-600 hover:bg-rose-500 border-rose-500/30"}`}>
                {evalStatus.evaluation_closed ? "Open Evaluations" : "Close Evaluations"}
              </button>
              <button onClick={fetchWinnerCertificate}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-slate-900 rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/20 transition">
                🏆 Winner Certificate
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-[#0e1626] border border-white/[0.06] p-1.5 rounded-2xl gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-slate-900 border border-white/[0.08] text-[#38bdf8]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6 tab-content-active">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Terminal */}
              <section className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Autonomous Log Stream</h2>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">WebSocket active</span>
                </div>
                <div className="flex-1 overflow-y-auto bg-[#04060b] p-4 rounded-xl border border-white/[0.04] font-mono text-[11px] text-emerald-400 space-y-2.5 custom-scroll">
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic">[System] Awaiting pipeline events...</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5 leading-relaxed animate-slide-in">
                        <span className="text-slate-500 font-semibold shrink-0">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        <span className="break-all">{log.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </section>

              {/* Leaderboard */}
              <section className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col h-[500px]">
                <div className="pb-3 border-b border-white/[0.08] mb-4 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Leaderboard</h2>
                  <span className="text-[9px] text-[#38bdf8] font-bold bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/20 uppercase tracking-wider">Z-Score</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scroll pr-1">
                  <Leaderboard items={leaderboard} compact />
                </div>
              </section>
            </div>

            {/* HITL duplicates */}
            {flaggedSubmissions.length > 0 && (
              <section className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4 animate-modal-open">
                <div className="flex items-center gap-2 text-rose-400">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Human Intervention Required — Duplicates</h3>
                </div>
                <div className="divide-y divide-white/[0.06] bg-[#05080f] rounded-xl border border-white/[0.06] overflow-hidden">
                  {flaggedSubmissions.map(sub => (
                    <div key={sub.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-white">{sub.title}</h4>
                        <p className="text-slate-400 text-xs mt-1 max-w-2xl">{sub.abstract}</p>
                      </div>
                      <div className="flex gap-2.5">
                        <button onClick={() => overrideState(sub.id, "APPROVE_OVERRIDE")}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition">
                          Approve
                        </button>
                        <button onClick={() => overrideState(sub.id, "CONFIRM_DISQUALIFICATION")}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition">
                          Disqualify
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Registry table */}
            <section className="glass-panel rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-white/[0.08] mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#38bdf8]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Submissions Registry</h2>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["All", "AI & Intelligent Agents", "Web3 & Decentralized Systems", "Cloud & Developer Platforms"].map(t => (
                    <button key={t} onClick={() => setSelectedTrack(t)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition ${
                        selectedTrack === t
                          ? "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/35"
                          : "bg-[#05080f] text-slate-400 border-white/[0.05] hover:text-slate-200"
                      }`}>
                      {t === "All" ? "All Tracks" : t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider">
                      {["ID", "Project Title", "Abstract", "Track", "Tech Stack", "Status"].map(h => (
                        <th key={h} className="py-3 px-4 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-slate-300">
                    {filteredSubmissions.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">No matching submissions.</td></tr>
                    ) : (
                      filteredSubmissions.map(sub => {
                        let badge = "bg-slate-800 text-slate-400 border-slate-700";
                        if (sub.state === "APPROVED") badge = "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20";
                        else if (sub.state === "MATCHED") badge = "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20";
                        else if (sub.state === "PENDING_REVIEW") badge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        return (
                          <tr key={sub.id} className="hover:bg-[#0c1220]/40 transition">
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">{sub.id}</td>
                            <td className="py-3.5 px-4 font-bold text-white">{sub.title}</td>
                            <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={sub.abstract}>{sub.abstract}</td>
                            <td className="py-3.5 px-4 text-[#38bdf8] font-semibold">{sub.track}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">{sub.tech_stack}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${badge}`}>{sub.state}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Ledger verification */}
            <section className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Blockchain Ledger Check</h2>
                </div>
                <button onClick={runLedgerVerification} disabled={isVerifyingLedger}
                  className="px-4 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] text-xs font-bold rounded-lg disabled:opacity-50 transition">
                  {isVerifyingLedger ? "Verifying..." : "Verify Audit Ledger"}
                </button>
              </div>
              {ledgerResult ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Chain Status</p>
                    <div className="flex items-center gap-2">
                      {ledgerResult.is_valid ? (
                        <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="text-sm font-bold text-emerald-500">SECURE & VERIFIED</span></>
                      ) : (
                        <><XCircle className="w-5 h-5 text-rose-500" /><span className="text-sm font-bold text-rose-500">CORRUPT</span></>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Verified Blocks</p>
                    <p className="text-lg font-mono font-bold text-white">{ledgerResult.verified_blocks}</p>
                  </div>
                  <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] md:col-span-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Trace Output</p>
                    <div className="p-3 bg-[#020408] rounded-lg font-mono text-xs">
                      {ledgerResult.is_valid
                        ? <span className="text-emerald-400">✓ Chain verification successful. All blocks recursively linked.</span>
                        : ledgerResult.errors?.map((e, i) => <p key={i} className="text-rose-400">✗ {e}</p>)
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs italic">Run check to audit ledger integrity.</div>
              )}
            </section>
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ── */}
        {activeTab === "assignments" && (
          <div className="space-y-6 tab-content-active">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Reviewer assignments */}
              <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reviewer Assignments</h2>
                  </div>
                  <button onClick={handleAssignReviewers} disabled={isAssigning}
                    className="px-4 py-1.5 bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/30 text-[#818cf8] text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition">
                    {isAssigning ? <><RefreshCw className="w-3 h-3 animate-spin" />Assigning...</> : <><Play className="w-3 h-3" />Optimize Match</>}
                  </button>
                </div>
                <div className="min-h-[250px] max-h-[400px] overflow-y-auto custom-scroll space-y-3">
                  {assignments.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-slate-500 text-xs italic">
                      Click "Optimize Match" to run the Hungarian algorithm solver.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assignments.map(a => (
                        <div key={a.id} className="bg-[#05080f] p-3.5 rounded-xl border border-white/[0.04] space-y-2 hover:border-[#818cf8]/30 transition">
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Reviewer {a.reviewer_id}
                          </span>
                          <p className="text-sm font-bold text-white">{a.reviewer_name}</p>
                          <div className="border-t border-white/[0.04] pt-2">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Project</p>
                            <p className="text-sm font-semibold text-slate-200 truncate">{a.project_title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Results panel */}
              <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Final Results Standings</h2>
                  </div>
                  <button onClick={handleGenerateResults} disabled={isGeneratingResults}
                    className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition">
                    {isGeneratingResults ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating...</> : <><Award className="w-3 h-3" />Publish Results</>}
                  </button>
                </div>
                <div className="min-h-[250px] max-h-[400px] overflow-y-auto custom-scroll space-y-3">
                  {results.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-slate-500 text-xs italic">
                      Click "Publish Results" after closing evaluations.
                    </div>
                  ) : (
                    results.map(item => {
                      let badge = "text-slate-400 bg-slate-900 border-slate-800";
                      if (item.rank === 1) badge = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      else if (item.rank === 2) badge = "text-slate-300 bg-slate-100/10 border-slate-100/20";
                      else if (item.rank === 3) badge = "text-amber-600 bg-amber-700/10 border-amber-700/20";
                      return (
                        <div key={item.id} className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] space-y-2 hover:border-amber-500/25 transition">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full border ${badge}`}>{item.rank}</span>
                              <span className="font-bold text-white text-sm">{item.project_title}</span>
                            </div>
                            <span className="text-[#10b981] font-bold font-mono text-sm">{item.final_score?.toFixed(1)}/100</span>
                          </div>
                          {item.feedback && (
                            <div className="bg-[#020408] p-3 rounded-lg border border-white/[0.03] text-slate-400 text-xs italic leading-relaxed">
                              <span className="text-[10px] text-amber-500 font-bold uppercase not-italic block mb-1">AI Feedback:</span>
                              "{item.feedback}"
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── BIAS TAB ── */}
        {activeTab === "bias" && (
          <div className="space-y-6 tab-content-active">
            <section className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Bias Alert Panel</h2>
                </div>
                <Link href="/bias" className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider transition">
                  Full Panel →
                </Link>
              </div>
              <BiasPanel alerts={biasAlerts} onResolve={resolveAlert} />
            </section>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === "analytics" && (
          <div className="tab-content-active">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Platform Analytics</h2>
              <Link href="/analytics" className="text-[10px] text-[#38bdf8] hover:text-sky-400 font-bold uppercase tracking-wider transition">
                Full Analytics →
              </Link>
            </div>
            <AnalyticsCharts submissions={submissions} leaderboard={leaderboard} biasAlerts={biasAlerts} />
          </div>
        )}

      </div>

      {/* Winner Modal */}
      {isWinnerModalOpen && winnerCert && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 relative animate-modal-open shadow-2xl border border-white/[0.08]">
            <button onClick={() => setIsWinnerModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-xl">×</button>
            <div className="cert-glow-border">
              <div className="bg-[#060a15] rounded-[14px] p-6 md:p-8 text-center space-y-5 relative overflow-hidden border border-white/[0.03]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.04)_0%,transparent_70%)] pointer-events-none" />
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  🏆 DELL AI MERIT AWARD
                </div>
                <h4 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase">
                  Certificate of Excellence
                </h4>
                <p className="text-xs text-slate-400 italic">Conferred to</p>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
                  {winnerCert.recipient}
                </h2>
                <h3 className="text-sm font-bold text-white">{winnerCert.reason}</h3>
                <p className="text-xs text-slate-300">
                  Score: <span className="text-[#10b981] font-bold font-mono">{winnerCert.normalized_score}</span>
                </p>
                <div className="flex justify-between items-end pt-4 border-t border-white/[0.06] text-[10px] font-mono text-slate-400">
                  <div>
                    <p className="text-[9px] uppercase text-slate-500 font-bold">Hash</p>
                    <p className="text-[#38bdf8] truncate max-w-[180px]">{winnerCert.verification_hash}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-slate-500 font-bold">Issued by</p>
                    <p className="font-bold text-slate-200">Dell Agentic OS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
