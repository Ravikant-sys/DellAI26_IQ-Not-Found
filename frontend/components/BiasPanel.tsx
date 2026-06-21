"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { BiasAlert } from "../app/lib/useStore";

interface BiasPanelProps {
  alerts: BiasAlert[];
  onResolve?: (id: number) => void;
  compact?: boolean;
}

const typeColors: Record<string, { label: string; badge: string; dot: string }> = {
  gender:     { label: "Gender Bias",    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",     dot: "bg-rose-400" },
  geographic: { label: "Geographic",     badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400" },
  language:   { label: "Language/Accent",badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",         dot: "bg-sky-400" },
  tech:       { label: "Tech Stack",     badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",dot: "bg-purple-400" },
  default:    { label: "Outlier",        badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",dot: "bg-orange-400" },
};

function detectType(details: string) {
  const d = details.toLowerCase();
  if (d.includes("gender")) return "gender";
  if (d.includes("geographic") || d.includes("region")) return "geographic";
  if (d.includes("language") || d.includes("accent")) return "language";
  if (d.includes("tech")) return "tech";
  return "default";
}

export default function BiasPanel({ alerts, onResolve, compact = false }: BiasPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <ShieldCheck className="w-10 h-10 text-emerald-500/40" />
        <p className="text-slate-500 text-xs italic">
          No evaluation bias outliers detected in active score sets.
        </p>
        <p className="text-slate-600 text-[10px]">
          Z-score anomaly detection running continuously...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => {
        const type = detectType(alert.details);
        const colors = typeColors[type];
        return (
          <div
            key={alert.id}
            className="bg-[#05080f] p-4 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-500/20 transition animate-slide-in"
            style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-[4px] font-bold text-[9px] uppercase tracking-wider ${colors.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
                  {colors.label}
                </span>
                <span className="text-slate-500 font-mono text-[9px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{alert.details}</p>
              {alert.action && (
                <p className="text-[10px] text-slate-500">
                  Action: <span className="text-slate-400 font-mono">{alert.action}</span>
                </p>
              )}
            </div>

            {onResolve && !compact && (
              <button
                onClick={() => onResolve(alert.id)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 transition text-white font-bold rounded-lg text-[10px] shrink-0 whitespace-nowrap"
              >
                Resolve Alert
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
