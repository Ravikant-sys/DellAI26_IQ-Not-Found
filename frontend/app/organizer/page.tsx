"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useStore, Submission } from "../lib/useStore";
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
  XCircle
} from "lucide-react";

const API_BASE = "http://localhost:8000";

export default function OrganizerDashboard() {
  const { 
    submissions, 
    leaderboard, 
    logs, 
    biasAlerts, 
    loading, 
    refresh, 
    resolveAlert, 
    overrideState 
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [evalStatus, setEvalStatus] = useState<{ evaluation_closed: boolean }>({ evaluation_closed: false });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  
  // Track filtering selection
  const [selectedTrack, setSelectedTrack] = useState("All");

  // Ledger check states
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);
  const [ledgerCheckResult, setLedgerCheckResult] = useState<{ is_valid: boolean; verified_blocks: number; errors?: string[] } | null>(null);

  // Winner modal states
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [winnerCert, setWinnerCert] = useState<{ recipient: string; reason: string; normalized_score: number; verification_hash: string } | null>(null);
  const [winnerAuditTrail, setWinnerAuditTrail] = useState<string>("");

  // Assignments and results states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchAssignmentsAndResults = async () => {
    try {
      const [assignmentsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/api/assignments`),
        fetch(`${API_BASE}/api/results`)
      ]);
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data);
      }
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setResults(data);
      }
    } catch (e) {
      console.error("Failed to fetch assignments and results:", e);
    }
  };

  // Fetch status on startup
  useEffect(() => {
    fetchEvaluationStatus();
    fetchAssignmentsAndResults();
  }, []);

  // Fetch when submissions or leaderboard change
  useEffect(() => {
    fetchAssignmentsAndResults();
  }, [submissions, leaderboard]);

  // Auto-scroll terminal when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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
      const res = await fetch(`${API_BASE}/api/review/assign`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Reviewer assignment task triggered successfully! The assignments will be computed asynchronously.");
        await triggerRefresh();
      } else {
        alert("Failed to assign reviewers.");
      }
    } catch (e) {
      console.error("Error assigning reviewers:", e);
      alert("Error assigning reviewers.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleGenerateResults = async () => {
    setIsGeneratingResults(true);
    try {
      const res = await fetch(`${API_BASE}/api/results/generate`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Results generation task triggered successfully! The standings and feedback will be computed asynchronously.");
        await triggerRefresh();
      } else {
        alert("Failed to generate results. Make sure evaluations are closed first.");
      }
    } catch (e) {
      console.error("Error generating results:", e);
      alert("Error generating results.");
    } finally {
      setIsGeneratingResults(false);
    }
  };

  const fetchEvaluationStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/status`);
      if (res.ok) {
        const data = await res.json();
        setEvalStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch evaluation status:", e);
    }
  };

  const toggleEvaluationStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/config/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation_closed: !evalStatus.evaluation_closed }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvalStatus(data);
        await refresh();
      }
    } catch (e) {
      console.error("Failed to toggle status:", e);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const seedInitialData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: "POST" });
      if (res.ok) {
        await refresh();
      } else {
        alert("Failed to seed initial data.");
      }
    } catch (e) {
      console.error("Error seeding:", e);
      alert("Error seeding database.");
    } finally {
      setIsSeeding(false);
    }
  };

  const runLedgerVerification = async () => {
    setIsVerifyingLedger(true);
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs/verify`);
      if (res.ok) {
        const data = await res.json();
        setLedgerCheckResult(data);
      }
    } catch (e) {
      console.error("Error verifying ledger:", e);
    } finally {
      setIsVerifyingLedger(false);
    }
  };

  const fetchWinnerCertificate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/winner`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setWinnerCert(data.certificate);
        setWinnerAuditTrail(data.audit_trail);
        setIsWinnerModalOpen(true);
      } else {
        alert(data.message || "Leaderboard evaluations are incomplete.");
      }
    } catch (e) {
      console.error("Error getting winner:", e);
      alert("Error generating winner certificate.");
    }
  };

  // Filter lists based on states & track selections
  const flaggedSubmissions = submissions.filter((s) => s.state === "FLAGGED_DUPLICATE");
  
  const filteredRegistrySubmissions = submissions.filter((s) => {
    const matchesUnique = s.state !== "FLAGGED_DUPLICATE";
    const matchesTrack = selectedTrack === "All" || s.track === selectedTrack;
    return matchesUnique && matchesTrack;
  });

  return (
    <div className="min-h-screen relative bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 overflow-x-hidden">
      {/* Ambient Light blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#38bdf8] animate-pulse" />
              State-Driven Agentic OS Console
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
              Autonomous Hackathon Pipeline controller. Recalculates Z-score calibrations, matches judges, and verifies cryptographic logs.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/analytics"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-lg text-xs font-bold text-white shadow shadow-blue-500/15"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              📊 View Analytics
            </Link>
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.06] rounded-lg text-xs font-semibold text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Synchronize
            </button>
          </div>
        </header>
        
        {/* Unstop-style Hackathon Hero Card */}
        <div className="bg-gradient-to-br from-[#101b35] via-[#0e1626] to-[#080d19] rounded-2xl p-6 md:p-8 border border-blue-500/20 text-white relative overflow-hidden shadow-2xl shadow-blue-950/20 animate-modal-open">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow">Featured</span>
                <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Live & Active
                </span>
                <span className="bg-white/10 text-slate-300 font-semibold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-mono border border-white/5">OS Console</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                Dell Future Minds AI Hackathon 2026
              </h1>
              <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
                Autonomous agentic pipeline orchestrating duplicate checks via DBSCAN vectors, expert matches with multi-objective Hungarian optimization solvers, and real-time score bias calibration.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 lg:self-end">
              <button 
                onClick={seedInitialData} 
                disabled={isSeeding}
                className="btn-modern px-5 py-2.5 bg-white text-blue-900 hover:bg-slate-50 hover:shadow-lg rounded-xl text-xs font-bold shadow-md disabled:bg-slate-800 disabled:text-slate-500"
              >
                {isSeeding ? "Seeding..." : "Seed Demo Data"}
              </button>
              <button 
                onClick={toggleEvaluationStatus} 
                disabled={isTogglingStatus}
                className={`btn-modern px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md border ${
                  evalStatus.evaluation_closed 
                    ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30" 
                    : "bg-rose-600 hover:bg-rose-500 border-rose-500/30"
                }`}
              >
                {evalStatus.evaluation_closed ? "Open Evaluations" : "Close Evaluations"}
              </button>
              <button 
                onClick={fetchWinnerCertificate} 
                className="btn-modern px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/20"
              >
                🏆 Winner Certificate
              </button>
            </div>
          </div>
        </div>

        {/* Live Bias Alert Panel */}
        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Bias Alert Panel</h2>
            </div>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
              Real-time WebSockets Stream
            </span>
          </div>

          <div className="space-y-3">
            {biasAlerts.length === 0 ? (
              <p className="text-slate-500 text-xs italic text-center py-6">No evaluation bias outliers detected in active score sets.</p>
            ) : (
              <div className="divide-y divide-white/[0.04] bg-[#05080f] rounded-xl border border-white/[0.06] overflow-hidden">
                {biasAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-[4px] font-bold text-[9px] uppercase tracking-wider">
                          Outlier Detected
                        </span>
                        <span className="text-slate-500 font-mono text-[9px]">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed max-w-3xl">{alert.details}</p>
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 transition text-white font-bold rounded-lg text-[10px] shrink-0"
                    >
                      Resolve Alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Top Row: Terminal and Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Terminal Section */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Autonomous Log Stream</h2>
              </div>
              <span className="text-[9px] font-mono text-slate-500">WebSocket connection active</span>
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

          {/* Leaderboard Section */}
          <section className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col h-[500px]">
            <div className="pb-3 border-b border-white/[0.08] mb-4 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Normalized Leaderboard</h2>
              <span className="text-[9px] text-[#38bdf8] font-bold bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/20 uppercase tracking-wider">Z-Score Calibration</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scroll pr-1">
              {leaderboard.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic">
                  No project evaluations registered.
                </div>
              ) : (
                leaderboard.map((item, idx) => {
                  let rankColor = "text-slate-400 bg-slate-900 border-slate-800";
                  if (idx === 0) rankColor = "text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold";
                  else if (idx === 1) rankColor = "text-slate-300 bg-slate-100/10 border-slate-100/20 font-bold";
                  else if (idx === 2) rankColor = "text-amber-600 bg-amber-700/10 border-amber-700/20 font-bold";

                  return (
                    <div
                      key={item.project_id}
                      className="bg-[#05080f] p-4 rounded-xl border border-white/[0.06] flex justify-between items-center transition hover:border-[#38bdf8]/30 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full border ${rankColor}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-white text-sm group-hover:text-[#38bdf8] transition">{item.title}</h3>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            Evaluations: {item.eval_count} &bull; State: <span className="text-[#38bdf8] font-semibold">{item.state}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#10b981] font-bold text-sm font-mono">{item.normalized_score}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Raw Avg: {item.raw_average}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>

        {/* Reviewer Assignment & Results Generation Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reviewer Assignment Panel */}
          <section className="glass-panel rounded-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reviewer Assignments</h2>
              </div>
              <button
                onClick={handleAssignReviewers}
                disabled={isAssigning}
                className="btn-modern px-4 py-1.5 bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/30 text-[#818cf8] text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition active:scale-95"
              >
                {isAssigning ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Optimize Match
                  </>
                )}
              </button>
            </div>
            
            {/* Assignment List/Grid */}
            <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto custom-scroll pr-1">
              {assignments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic py-12">
                  No reviewer assignments generated. Click "Optimize Match" to run the Hungarian solver.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignments.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#05080f] p-3.5 rounded-xl border border-white/[0.04] space-y-2 hover:border-[#818cf8]/35 transition group"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Reviewer {item.reviewer_id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Judge Name</p>
                        <p className="text-sm font-bold text-white group-hover:text-[#818cf8] transition">{item.reviewer_name}</p>
                      </div>
                      <div className="border-t border-white/[0.04] pt-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Assigned Project</p>
                        <p className="text-sm font-bold text-slate-200 truncate" title={item.project_title}>{item.project_title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Results Generation & Constructive Feedback Panel */}
          <section className="glass-panel rounded-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Final Results Standings</h2>
              </div>
              <button
                onClick={handleGenerateResults}
                disabled={isGeneratingResults}
                className="btn-modern px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition active:scale-95"
              >
                {isGeneratingResults ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Award className="w-3 h-3" />
                    Publish Results
                  </>
                )}
              </button>
            </div>

            {/* Results Standings List */}
            <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto custom-scroll pr-1">
              {results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic py-12">
                  Results not yet generated. Click "Publish Results" after closing evaluations.
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((item) => {
                    let badgeColor = "text-slate-400 bg-slate-900 border-slate-800";
                    if (item.rank === 1) badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold";
                    else if (item.rank === 2) badgeColor = "text-slate-300 bg-slate-100/10 border-slate-100/20 font-bold";
                    else if (item.rank === 3) badgeColor = "text-amber-600 bg-amber-700/10 border-amber-700/20 font-bold";

                    return (
                      <div
                        key={item.id}
                        className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] space-y-3 hover:border-amber-500/30 transition group"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full border ${badgeColor}`}>
                              {item.rank}
                            </span>
                            <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">{item.project_title}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[#10b981] font-bold text-sm font-mono">{item.final_score.toFixed(1)} / 100</p>
                          </div>
                        </div>
                        {item.feedback && (
                          <div className="bg-[#020408] p-3 rounded-lg border border-white/[0.03] text-slate-400 text-xs leading-relaxed italic">
                            <span className="text-[10px] text-amber-500 font-bold uppercase not-italic block mb-1">AI Constructive Feedback:</span>
                            "{item.feedback}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Cryptographic Ledger Verification Box */}
        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Blockchain Ledger Cryptographic Check</h2>
            </div>
            <button 
              onClick={runLedgerVerification}
              disabled={isVerifyingLedger}
              className="btn-modern px-4 py-1.5 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {isVerifyingLedger ? "Verifying..." : "Verify Audit Ledger"}
            </button>
          </div>

          {ledgerCheckResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Chain Status</p>
                <div className="flex items-center gap-2">
                  {ledgerCheckResult.is_valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-500">SECURE & VERIFIED</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-500" />
                      <span className="text-sm font-bold text-rose-500">MUTATED / CORRUPT</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Verified Ledger Blocks</p>
                <p className="text-lg font-mono font-bold text-white">{ledgerCheckResult.verified_blocks} Blocks</p>
              </div>

              <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.04] space-y-2 col-span-1 md:col-span-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Verification Trace Output</p>
                <div className="p-3 bg-[#020408] rounded-lg border border-white/[0.03] text-xs font-mono">
                  {ledgerCheckResult.is_valid ? (
                    <span className="text-emerald-400">✓ Cryptographic chain verification successful. All blocks are recursively linked and intact.</span>
                  ) : (
                    <div className="space-y-1">
                      {ledgerCheckResult.errors?.map((err, idx) => (
                        <p key={idx} className="text-rose-400">✗ {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs italic">
              Run cryptographic check to audit the ledger integrity.
            </div>
          )}
        </section>

        {/* HITL Section */}
        {flaggedSubmissions.length > 0 && (
          <section className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4 animate-modal-open">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Human Intervention Required: Potential Duplicates</h3>
            </div>
            <div className="divide-y divide-white/[0.06] bg-[#05080f] rounded-xl border border-white/[0.06] overflow-hidden">
              {flaggedSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 text-sm"
                >
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-base">{sub.title}</h4>
                    <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">{sub.abstract}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Tech Stack: {sub.tech_stack}</p>
                  </div>
                  <div className="flex gap-2.5 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => overrideState(sub.id, "APPROVE_OVERRIDE")}
                      className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition text-white font-bold rounded-lg text-xs"
                    >
                      Approve Override
                    </button>
                    <button
                      onClick={() => overrideState(sub.id, "CONFIRM_DISQUALIFICATION")}
                      className="flex-1 md:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 transition text-white font-bold rounded-lg text-xs"
                    >
                      Disqualify Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Registry Table Section with Track filters */}
        <section className="glass-panel rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-white/[0.08] mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Submissions Registry</h2>
            </div>
            
            {/* Track Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "AI & Intelligent Agents", "Web3 & Decentralized Systems", "Cloud & Developer Platforms"].map((trackName) => (
                <button
                  key={trackName}
                  onClick={() => setSelectedTrack(trackName)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition ${
                    selectedTrack === trackName
                      ? "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/35"
                      : "bg-[#05080f] text-slate-400 border-white/[0.05] hover:text-slate-200"
                  }`}
                >
                  {trackName === "All" ? "All Tracks" : trackName}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">ID</th>
                  <th className="py-3 px-4 font-bold">Project Title</th>
                  <th className="py-3 px-4 font-bold">Description Abstract</th>
                  <th className="py-3 px-4 font-bold">Track Stream</th>
                  <th className="py-3 px-4 font-bold">Tech Stack</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredRegistrySubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      No matching submissions registered.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrySubmissions.map((sub) => {
                    let badgeClass = "bg-slate-800 text-slate-400 border-slate-700";
                    if (sub.state === "APPROVED") {
                      badgeClass = "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20";
                    } else if (sub.state === "MATCHED") {
                      badgeClass = "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20";
                    } else if (sub.state === "PENDING_REVIEW") {
                      badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    }
                    return (
                      <tr key={sub.id} className="hover:bg-[#0c1220]/40 transition group">
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">{sub.id}</td>
                        <td className="py-3.5 px-4 font-bold text-white group-hover:text-[#38bdf8] transition">{sub.title}</td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={sub.abstract}>
                          {sub.abstract}
                        </td>
                        <td className="py-3.5 px-4 text-[#38bdf8] font-semibold">{sub.track}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">{sub.tech_stack}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                            {sub.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Winner Certificate Modal */}
      {isWinnerModalOpen && winnerCert && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="glass-panel rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 relative animate-modal-open shadow-2xl border border-white/[0.08]">
            <button 
              onClick={() => setIsWinnerModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl transition"
            >
              &times;
            </button>
            
            <div className="space-y-6">
              <div className="cert-glow-border">
                <div className="bg-[#060a15] rounded-[14px] p-6 md:p-8 text-center space-y-5 relative overflow-hidden border border-white/[0.03] shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.04)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider mx-auto shadow shadow-amber-400/5">
                    🏆 DELL AI MERIT AWARD
                  </div>
                  
                  <h4 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 tracking-tight uppercase">Certificate of Excellence</h4>
                  <p className="text-xs text-slate-400 italic">This credential is proudly conferred to</p>
                  
                  <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 tracking-wide my-1">
                    {winnerCert.recipient}
                  </h2>
                  
                  <p className="text-xs text-slate-400 italic">for peerless prototype development of the project</p>
                  <h3 className="text-sm font-bold text-white tracking-normal leading-relaxed">
                    {winnerCert.reason}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Achieved Peak Standings via Bias-Calibrated Score: <span className="text-[#10b981] font-bold font-mono">{winnerCert.normalized_score}</span>
                  </p>
                  
                  <div className="flex justify-between items-end pt-5 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
                    <div className="text-left space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Verification Hash</p>
                      <p className="text-[#38bdf8] truncate max-w-[180px]">{winnerCert.verification_hash}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Issuing Authority</p>
                      <p className="font-bold text-slate-200">Dell Agentic OS Engine</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#04060b] border border-white/[0.06] p-4 rounded-2xl space-y-2.5 shadow-inner">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Fairness Verification Audit Trail</h4>
                <p className="text-slate-300 leading-relaxed font-mono text-[10px] bg-[#020408] p-3 rounded-xl border border-white/[0.03] overflow-x-auto max-h-[80px] custom-scroll">
                  {winnerAuditTrail}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
