"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import BiasPanel from "../../components/BiasPanel";
import {
  ShieldAlert,
  RefreshCw,
  ArrowLeft,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";

export default function BiasPage() {
  const { biasAlerts, loading, refresh, resolveAlert } = useStore();

  useEffect(() => {
    refresh();
  }, []);

  const pendingCount = biasAlerts.length;

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-rose-600/8 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-600/8 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-modal-open">

        {/* Header */}
        <header className="pb-4 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-rose-400 animate-pulse" />
              Live Bias Alert Panel
            </h1>
            <p className="text-slate-400 text-sm">
              Real-time Z-score anomaly detection via WebSocket stream.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <span className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${
              pendingCount > 0
                ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            }`}>
              {pendingCount > 0 ? (
                <><AlertOctagon className="w-3.5 h-3.5" /> {pendingCount} Active Flag{pendingCount !== 1 ? "s" : ""}</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> All Clear</>
              )}
            </span>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.06] rounded-xl text-xs font-bold text-slate-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </header>

        {/* Info Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Flags",     value: pendingCount,                                           color: "text-rose-400",    border: "border-rose-500/20" },
            { label: "Gender Bias",      value: biasAlerts.filter(a => a.details.toLowerCase().includes("gender")).length,      color: "text-pink-400",    border: "border-pink-500/20" },
            { label: "Geographic Bias",  value: biasAlerts.filter(a => a.details.toLowerCase().includes("geographic")).length,  color: "text-amber-400",   border: "border-amber-500/20" },
            { label: "Tech Stack Bias",  value: biasAlerts.filter(a => a.details.toLowerCase().includes("tech")).length,        color: "text-purple-400",  border: "border-purple-500/20" },
          ].map(({ label, value, color, border }) => (
            <div key={label} className={`glass-panel p-4 rounded-2xl border ${border}`}>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Main Panel */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Bias Flags</h2>
            </div>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
              WebSocket Stream
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" /> Connecting to bias detection stream...
            </div>
          ) : (
            <BiasPanel alerts={biasAlerts} onResolve={resolveAlert} />
          )}
        </div>

        {/* How it works */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detection Algorithm</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
            {[
              { step: "1", title: "Score Collection", desc: "Judge scores are collected per submission across all criteria." },
              { step: "2", title: "Z-Score Analysis", desc: "A reviewer's mean is subtracted and divided by std deviation per criterion." },
              { step: "3", title: "Anomaly Threshold", desc: "Z-score > ±2.0 triggers an automatic bias flag visible here in real-time." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-[10px] font-bold flex items-center justify-center">{step}</span>
                  <span className="font-bold text-slate-300">{title}</span>
                </div>
                <p className="leading-relaxed pl-8">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
