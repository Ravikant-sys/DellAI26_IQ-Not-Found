"use client";

import React from "react";
import { Award, Trophy, Medal, Star } from "lucide-react";
import { LeaderboardItem } from "../app/lib/useStore";

interface LeaderboardProps {
  items: LeaderboardItem[];
  compact?: boolean;
  showConfidence?: boolean;
}

const rankIcons = [
  <Trophy key={1} className="w-4 h-4 text-amber-400" />,
  <Medal key={2} className="w-4 h-4 text-slate-300" />,
  <Medal key={3} className="w-4 h-4 text-amber-600" />,
];

const rankColors = [
  "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow shadow-amber-500/10",
  "text-slate-300 bg-slate-100/10 border-slate-100/20",
  "text-amber-600 bg-amber-700/10 border-amber-700/20",
  "text-slate-400 bg-slate-900 border-slate-800",
];

const stateColors: Record<string, string> = {
  APPROVED:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MATCHED:    "text-sky-400 bg-sky-500/10 border-sky-500/20",
  PENDING_REVIEW: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  SCORED:     "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

export default function Leaderboard({ items, compact = false, showConfidence = true }: LeaderboardProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Award className="w-10 h-10 text-slate-600" />
        <p className="text-slate-500 text-xs italic">No project evaluations registered.</p>
        <p className="text-slate-600 text-[10px]">
          Scores will appear here after reviewer evaluations are submitted.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...items.map(i => i.normalized_score), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const rankClass = rankColors[Math.min(idx, 3)] ?? rankColors[3];
        const stateCls = stateColors[item.state] ?? "text-slate-400 bg-slate-900 border-slate-800";
        const barWidth = Math.round((item.normalized_score / maxScore) * 100);

        return (
          <div
            key={item.project_id}
            className="bg-[#05080f] rounded-xl border border-white/[0.06] overflow-hidden hover:border-[#38bdf8]/25 transition-all duration-300 group"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Progress bar */}
            <div
              className="h-0.5 bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${barWidth}%` }}
            />

            <div className={`p-4 ${compact ? "py-3" : "py-4"} flex items-center gap-3`}>
              {/* Rank badge */}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full border text-xs font-bold shrink-0 ${rankClass}`}>
                {idx < 3 ? rankIcons[idx] : <span>{idx + 1}</span>}
              </div>

              {/* Title & details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm group-hover:text-[#38bdf8] transition truncate">
                  {item.title}
                </h3>
                {!compact && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold ${stateCls}`}>
                      {item.state}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {item.eval_count} evaluation{item.eval_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="text-[#10b981] font-bold font-mono text-sm">
                  {typeof item.normalized_score === "number"
                    ? item.normalized_score.toFixed(2)
                    : item.normalized_score}
                </p>
                {showConfidence && !compact && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    Raw: {typeof item.raw_average === "number"
                      ? item.raw_average.toFixed(2)
                      : item.raw_average}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
