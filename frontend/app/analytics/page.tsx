"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import { 
  ArrowLeft, 
  BarChart2, 
  TrendingUp, 
  AlertOctagon, 
  CheckSquare, 
  Activity,
  Layers,
  Database
} from "lucide-react";

export default function AnalyticsDashboard() {
  const { submissions, leaderboard, biasAlerts, loading, refresh } = useStore();

  useEffect(() => {
    refresh();
  }, []);

  // 1. Compute Track Submissions Counts dynamically
  const tracks = [
    "AI & Intelligent Agents",
    "Web3 & Decentralized Systems",
    "Cloud & Developer Platforms"
  ];
  
  const trackStats = tracks.map(trackName => {
    const count = submissions.filter(s => s.track === trackName && s.state !== "FLAGGED_DUPLICATE").length;
    return { name: trackName, count };
  });

  // 2. Compute Bias alert dimensions dynamically
  const biasDimensions = [
    { name: "Gender Bias", count: 0 },
    { name: "Geographic Bias", count: 0 },
    { name: "Language/Accent Bias", count: 0 },
    { name: "Tech Stack Bias", count: 0 }
  ];

  biasAlerts.forEach(alert => {
    if (alert.details.toLowerCase().includes("gender")) biasDimensions[0].count++;
    else if (alert.details.toLowerCase().includes("geographic")) biasDimensions[1].count++;
    else if (alert.details.toLowerCase().includes("language") || alert.details.toLowerCase().includes("accent")) biasDimensions[2].count++;
    else if (alert.details.toLowerCase().includes("tech")) biasDimensions[3].count++;
  });

  const totalBiasAlerts = biasAlerts.length;

  // 3. Compute evaluation completion gauge
  const totalSubmissions = submissions.filter(s => s.state !== "FLAGGED_DUPLICATE").length;
  const scoredSubmissions = submissions.filter(s => s.state === "APPROVED" || s.state === "MATCHED").length; // Evaluated state indicators
  const completionPercentage = totalSubmissions > 0 ? Math.round((scoredSubmissions / totalSubmissions) * 100) : 0;

  // 4. Registration Timeline (Mock timeline points combined with live count)
  const timelineData = [
    { day: "Day 1", count: Math.max(2, Math.round(totalSubmissions * 0.15)) },
    { day: "Day 2", count: Math.max(5, Math.round(totalSubmissions * 0.40)) },
    { day: "Day 3", count: Math.max(9, Math.round(totalSubmissions * 0.65)) },
    { day: "Day 4", count: Math.max(12, Math.round(totalSubmissions * 0.85)) },
    { day: "Day 5 (Today)", count: totalSubmissions }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] flex items-center justify-center font-sans">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#38bdf8]" />
          <span>Synchronizing Analytics Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Ambient Light blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[30%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-modal-open">
        
        {/* Header navigation bar */}
        <header className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <Link 
              href="/organizer"
              className="inline-flex items-center gap-1.5 text-xs text-[#38bdf8] hover:text-sky-400 font-bold transition uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Console
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <BarChart2 className="w-7 h-7 text-[#38bdf8]" />
              OS Metrics & Analytics
            </h1>
          </div>
          <button 
            onClick={refresh}
            className="p-2 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.06] rounded-xl text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Top Metrics Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-white/[0.05]">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Submissions</p>
              <p className="text-2xl font-extrabold font-mono mt-1 text-white">{totalSubmissions}</p>
            </div>
            <Database className="w-7 h-7 text-sky-400 opacity-60" />
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-white/[0.05]">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tracks Represented</p>
              <p className="text-2xl font-extrabold font-mono mt-1 text-white">3</p>
            </div>
            <Layers className="w-7 h-7 text-emerald-400 opacity-60" />
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-white/[0.05]">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Bias Flags</p>
              <p className="text-2xl font-extrabold font-mono mt-1 text-rose-400">{totalBiasAlerts}</p>
            </div>
            <AlertOctagon className="w-7 h-7 text-rose-400 opacity-60" />
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-white/[0.05]">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scoring Completion</p>
              <p className="text-2xl font-extrabold font-mono mt-1 text-[#10b981]">{completionPercentage}%</p>
            </div>
            <CheckSquare className="w-7 h-7 text-[#10b981] opacity-60" />
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Chart 1: Registration Timeline (Line Chart) */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Registration Timeline (Submissions)
            </h2>
            <div className="h-60 w-full relative flex items-end justify-between pt-5 px-3">
              {/* Draw responsive SVG Line */}
              <svg className="absolute inset-0 w-full h-full p-6 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                
                {/* Line Path */}
                <path
                  d={`M 0 90 
                      L 25 ${100 - (timelineData[0].count / (totalSubmissions || 1)) * 80} 
                      L 50 ${100 - (timelineData[1].count / (totalSubmissions || 1)) * 80} 
                      L 75 ${100 - (timelineData[2].count / (totalSubmissions || 1)) * 80} 
                      L 100 ${100 - (timelineData[4].count / (totalSubmissions || 1)) * 80}`}
                  fill="none"
                  stroke="url(#line-glow)"
                  strokeWidth="2.5"
                />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="line-glow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Day markers */}
              {timelineData.map((d, idx) => (
                <div key={idx} className="flex flex-col items-center z-10 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-white bg-[#05080f] px-2 py-0.5 rounded border border-white/[0.06]">
                    {d.count}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{d.day}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Chart 2: Submissions per Track (Bar Chart) */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Submissions per Track Stream
            </h2>
            <div className="space-y-4 pt-2">
              {trackStats.map((track, idx) => {
                const maxVal = Math.max(...trackStats.map(t => t.count), 1);
                const percent = Math.round((track.count / maxVal) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-200">{track.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">{track.count} projects</span>
                    </div>
                    <div className="h-3 bg-[#05080f] rounded-full border border-white/[0.04] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chart 3: Bias Alerts Breakdown (Pie Chart) */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Bias Anomalies Breakdown
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              {/* Circular Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" />
                  
                  {/* Arc layers */}
                  {biasDimensions.map((dim, idx) => {
                    const totalAlertsCount = totalBiasAlerts || 1;
                    const strokePercent = (dim.count / totalAlertsCount) * 100;
                    
                    // Simple cumulative offset calculation
                    let cumulativeOffset = 0;
                    for (let i = 0; i < idx; i++) {
                      cumulativeOffset += (biasDimensions[i].count / totalAlertsCount) * 100;
                    }
                    
                    let strokeColors = ["#f43f5e", "#f59e0b", "#38bdf8", "#a855f7"];
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={strokeColors[idx]}
                        strokeWidth="3"
                        strokeDasharray={`${strokePercent} ${100 - strokePercent}`}
                        strokeDashoffset={-cumulativeOffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute text-center">
                  <p className="text-xl font-extrabold font-mono text-white">{totalBiasAlerts}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Flags</p>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2.5">
                {biasDimensions.map((dim, idx) => {
                  let badgeColors = [
                    "bg-rose-500/10 text-rose-400 border-rose-500/20",
                    "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    "bg-sky-500/10 text-sky-400 border-sky-500/20",
                    "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  ];
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 border rounded text-[9px] font-bold font-mono ${badgeColors[idx]}`}>
                        {dim.count}
                      </span>
                      <span className="text-slate-300 font-semibold">{dim.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Chart 4: Scoring Completion (Gauge Chart) */}
          <section className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[#10b981]" />
              Overall Evaluation Progress
            </h2>
            
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
                {/* Semi-circular gauge */}
                <svg className="w-44 h-44 absolute top-0" viewBox="0 0 36 36">
                  {/* Background track (semi-circle) */}
                  <path
                    d="M 6 18 A 12 12 0 0 1 30 18"
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Active completed track */}
                  <path
                    d="M 6 18 A 12 12 0 0 1 30 18"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (completionPercentage / 100) * 100}
                    className="transition-all duration-700"
                  />
                </svg>
                
                <div className="text-center z-10">
                  <p className="text-3xl font-extrabold font-mono text-white">{completionPercentage}%</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Evaluation Rate</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed max-w-sm">
                {scoredSubmissions} of {totalSubmissions} uniquely registered projects have been matched to reviewers and submitted with normalized criteria evaluations.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Simple React loader/spinner component mapping
function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
