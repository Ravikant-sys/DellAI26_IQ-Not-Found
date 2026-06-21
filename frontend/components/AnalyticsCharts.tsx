"use client";

import React from "react";
import { TrendingUp, Layers, AlertOctagon, CheckSquare, BarChart2 } from "lucide-react";
import { Submission, LeaderboardItem, BiasAlert } from "../app/lib/useStore";

interface AnalyticsChartsProps {
  submissions: Submission[];
  leaderboard: LeaderboardItem[];
  biasAlerts: BiasAlert[];
}

const TRACK_COLORS = [
  { from: "#38bdf8", to: "#818cf8", label: "bg-sky-400" },
  { from: "#10b981", to: "#34d399", label: "bg-emerald-400" },
  { from: "#f59e0b", to: "#fbbf24", label: "bg-amber-400" },
];

const TRACKS = [
  "AI & Intelligent Agents",
  "Web3 & Decentralized Systems",
  "Cloud & Developer Platforms",
];

const BIAS_DIMS = [
  { key: "gender",     name: "Gender Bias",     color: "#f43f5e", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { key: "geographic", name: "Geographic",       color: "#f59e0b", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { key: "language",   name: "Language/Accent",  color: "#38bdf8", bg: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  { key: "tech",       name: "Tech Stack Bias",  color: "#a855f7", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
];

export default function AnalyticsCharts({ submissions, leaderboard, biasAlerts }: AnalyticsChartsProps) {
  const totalSubmissions = submissions.filter(s => s.state !== "FLAGGED_DUPLICATE").length;
  const scoredSubmissions = submissions.filter(s => s.state === "APPROVED" || s.state === "MATCHED").length;
  const completionPct = totalSubmissions > 0 ? Math.round((scoredSubmissions / totalSubmissions) * 100) : 0;

  // Track distribution
  const trackStats = TRACKS.map((t, i) => ({
    name: t,
    count: submissions.filter(s => s.track === t && s.state !== "FLAGGED_DUPLICATE").length,
    ...TRACK_COLORS[i],
  }));
  const maxTrack = Math.max(...trackStats.map(t => t.count), 1);

  // Bias breakdown
  const biasDims = BIAS_DIMS.map(dim => ({
    ...dim,
    count: biasAlerts.filter(a => a.details.toLowerCase().includes(dim.key)).length,
  }));
  const totalBias = biasAlerts.length;

  // Timeline (mock with live total)
  const timeline = [
    { day: "D1", count: Math.max(2, Math.round(totalSubmissions * 0.15)) },
    { day: "D2", count: Math.max(5, Math.round(totalSubmissions * 0.40)) },
    { day: "D3", count: Math.max(9, Math.round(totalSubmissions * 0.65)) },
    { day: "D4", count: Math.max(12, Math.round(totalSubmissions * 0.85)) },
    { day: "Now", count: totalSubmissions },
  ];
  const maxTimeline = Math.max(...timeline.map(t => t.count), 1);

  // Score distribution for leaderboard bar
  const topN = leaderboard.slice(0, 5);
  const maxScore = Math.max(...topN.map(i => i.normalized_score), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Chart 1: Timeline */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          Registration Timeline
        </h2>
        <div className="relative h-44 flex items-end gap-3 pt-4">
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[20, 40, 60, 80].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            ))}
            <defs>
              <linearGradient id="tl-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <polyline
              points={timeline.map((d, i) => `${i * 25},${100 - (d.count / maxTimeline) * 85}`).join(" ")}
              fill="none"
              stroke="url(#tl-grad)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {timeline.map((d, i) => (
              <circle
                key={i}
                cx={i * 25}
                cy={100 - (d.count / maxTimeline) * 85}
                r="2.5"
                fill="#38bdf8"
              />
            ))}
          </svg>

          {timeline.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 z-10">
              <span className="text-[10px] font-mono font-bold text-white bg-[#05080f] px-2 py-0.5 rounded border border-white/[0.06]">
                {d.count}
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Chart 2: Track Bar Chart */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          Submissions per Track
        </h2>
        <div className="space-y-4 pt-2">
          {trackStats.map((t, i) => {
            const pct = Math.round((t.count / maxTrack) * 100);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-200 truncate max-w-[65%]">{t.name}</span>
                  <span className="font-mono font-bold" style={{ color: t.from }}>
                    {t.count} projects
                  </span>
                </div>
                <div className="h-3 bg-[#05080f] rounded-full border border-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(to right, ${t.from}, ${t.to})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chart 3: Bias Breakdown */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          Bias Anomalies Breakdown
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
          {/* Donut */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              {biasDims.map((dim, i) => {
                const total = totalBias || 1;
                const pct = (dim.count / total) * 100;
                let offset = 0;
                for (let j = 0; j < i; j++) offset += (biasDims[j].count / total) * 100;
                return (
                  <circle
                    key={i}
                    cx="18" cy="18" r="15.915"
                    fill="none"
                    stroke={dim.color}
                    strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={-offset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute text-center">
              <p className="text-xl font-extrabold font-mono text-white">{totalBias}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Flags</p>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2.5">
            {biasDims.map((dim, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 border rounded text-[9px] font-bold font-mono ${dim.bg}`}>
                  {dim.count}
                </span>
                <span className="text-slate-300 font-semibold">{dim.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chart 4: Score Distribution (top projects) */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          Top Project Scores
        </h2>
        {topN.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-600 text-xs italic">
            No evaluations yet.
          </div>
        ) : (
          <div className="flex items-end gap-3 h-44 pt-4">
            {topN.map((item, i) => {
              const pct = Math.round((item.normalized_score / maxScore) * 85);
              return (
                <div key={item.project_id} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[9px] font-mono text-[#10b981] font-bold">
                    {typeof item.normalized_score === "number"
                      ? item.normalized_score.toFixed(1)
                      : item.normalized_score}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${pct}%`,
                      background: `linear-gradient(to top, #38bdf8, #818cf8)`,
                      minHeight: 4,
                    }}
                  />
                  <span className="text-[8px] text-slate-500 text-center truncate w-full">
                    #{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Evaluation Rate</p>
            <p className="text-lg font-extrabold font-mono text-white">{completionPct}%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Scored / Total</p>
            <p className="text-lg font-extrabold font-mono text-white">
              {scoredSubmissions} / {totalSubmissions}
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
