"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import Leaderboard from "../../components/Leaderboard";
import { Trophy, RefreshCw, ArrowLeft, Award, Sparkles, ChevronLeft } from "lucide-react";

export default function ResultsPage() {
  const { leaderboard, loading, refresh } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [winnerCert, setWinnerCert] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [fetchingWinner, setFetchingWinner] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const fetchWinner = async () => {
    setFetchingWinner(true);
    try {
      const res = await fetch("http://localhost:8000/api/analytics/winner");
      const data = await res.json();
      if (data.status === "SUCCESS") { setWinnerCert(data.certificate); setShowModal(true); }
      else alert(data.message || "Leaderboard is incomplete.");
    } catch { alert("Error fetching winner certificate."); }
    finally { setFetchingWinner(false); }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest  = leaderboard.slice(3);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="ambient" />

      {/* ── Header ── */}
      <header className="relative z-10 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "rgba(6,8,16,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="btn btn-ghost text-xs p-2">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-outfit font-extrabold text-white text-lg leading-none">Results</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Z-score normalised rankings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-ghost text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={fetchWinner} disabled={fetchingWinner}
            className="btn text-xs font-bold"
            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Award className="w-3.5 h-3.5" /> Winner Cert
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* ── Podium ── */}
        {top3.length >= 3 && (
          <section className="animate-fade-up">
            <p className="section-label text-center mb-8">Top 3 finalists</p>
            <div className="flex items-end justify-center gap-3">
              {/* 2nd place */}
              <div className="flex-1 max-w-[200px] text-center space-y-3">
                <div className="card p-4 rounded-xl" style={{ background: "rgba(148,163,184,0.05)", borderColor: "rgba(148,163,184,0.15)" }}>
                  <p className="text-2xl mb-2">🥈</p>
                  <p className="font-outfit font-bold text-white text-sm leading-tight mb-1">{top3[1]?.title}</p>
                  <p className="font-mono font-bold text-base" style={{ color: "var(--text-muted)" }}>{top3[1]?.normalized_score}</p>
                  <div className="mt-2 text-[10px]" style={{ color: "var(--text-faint)" }}>{top3[1]?.eval_count} evaluations</div>
                </div>
                <div className="h-16 rounded-t-lg" style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.12)" }} />
              </div>

              {/* 1st place */}
              <div className="flex-1 max-w-[220px] text-center space-y-3 -translate-y-4">
                <div className="card p-5 rounded-xl relative overflow-hidden" style={{ background: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.25)" }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                  <p className="text-3xl mb-2">🏆</p>
                  <p className="font-outfit font-extrabold text-white text-base leading-tight mb-2">{top3[0]?.title}</p>
                  <p className="font-mono font-extrabold text-xl text-amber-400">{top3[0]?.normalized_score}</p>
                  <div className="mt-2">
                    <span className="badge badge-amber text-[10px]">Champion</span>
                  </div>
                </div>
                <div className="h-24 rounded-t-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} />
              </div>

              {/* 3rd place */}
              <div className="flex-1 max-w-[200px] text-center space-y-3">
                <div className="card p-4 rounded-xl" style={{ background: "rgba(180,120,60,0.05)", borderColor: "rgba(180,120,60,0.15)" }}>
                  <p className="text-2xl mb-2">🥉</p>
                  <p className="font-outfit font-bold text-white text-sm leading-tight mb-1">{top3[2]?.title}</p>
                  <p className="font-mono font-bold text-base" style={{ color: "#b4783c" }}>{top3[2]?.normalized_score}</p>
                  <div className="mt-2 text-[10px]" style={{ color: "var(--text-faint)" }}>{top3[2]?.eval_count} evaluations</div>
                </div>
                <div className="h-10 rounded-t-lg" style={{ background: "rgba(180,120,60,0.06)", border: "1px solid rgba(180,120,60,0.1)" }} />
              </div>
            </div>
          </section>
        )}

        {/* ── Full Leaderboard ── */}
        <section className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-outfit font-bold text-white text-lg">Full Rankings</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {leaderboard.length} teams · sorted by Z-score normalised average
              </p>
            </div>
            <span className="badge badge-emerald">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading results…
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Trophy className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No results yet. Scores need to be submitted first.</p>
              <Link href="/review" className="btn btn-ghost text-xs">Go to Review →</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((item, i) => {
                const pct = leaderboard[0]?.normalized_score > 0
                  ? Math.round((item.normalized_score / leaderboard[0].normalized_score) * 100) : 0;
                const isTop = i < 3;
                return (
                  <div key={item.project_id}
                    className={`lb-row ${i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : ""}`}>
                    <span className="font-mono text-xs w-6 text-center shrink-0"
                      style={{ color: i < 3 ? "#f59e0b" : "var(--text-faint)" }}>
                      {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i+1}`}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                      <div className="progress-bar mt-2 w-full max-w-[200px]">
                        <div className="progress-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b4783c" : "var(--indigo)",
                          }} />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm"
                        style={{ color: isTop ? "#f59e0b" : "var(--text)" }}>
                        {typeof item.normalized_score === "number" ? item.normalized_score.toFixed(2) : item.normalized_score}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {item.eval_count} eval{item.eval_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Winner Modal ── */}
      {showModal && winnerCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          onClick={() => setShowModal(false)}>
          <div className="animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="cert-border max-w-md w-full">
              <div className="cert-inner text-center space-y-5 relative">
                <button onClick={() => setShowModal(false)}
                  className="absolute top-0 right-0 text-xs btn btn-ghost p-1.5">✕</button>

                <div>
                  <p className="text-amber-400/70 text-xs font-mono uppercase tracking-widest mb-1">Dell AI Merit Award</p>
                  <h3 className="font-outfit text-xl font-extrabold text-amber-300">Certificate of Excellence</h3>
                </div>

                <hr style={{ borderColor: "rgba(245,158,11,0.15)" }} />

                <div className="space-y-1">
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Conferred upon</p>
                  <p className="font-outfit text-3xl font-extrabold text-white">{winnerCert.recipient}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>for outstanding achievement in</p>
                  <p className="font-semibold text-sm text-white">{winnerCert.reason}</p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="badge badge-amber font-mono">Score: {winnerCert.normalized_score}</span>
                </div>

                <hr style={{ borderColor: "rgba(245,158,11,0.1)" }} />

                <div className="flex justify-between text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                  <div className="text-left">
                    <p className="section-label mb-0.5">Verification</p>
                    <p className="text-sky-500/80 truncate max-w-[160px]">{winnerCert.verification_hash}</p>
                  </div>
                  <div className="text-right">
                    <p className="section-label mb-0.5">Issued by</p>
                    <p style={{ color: "var(--text-muted)" }}>Dell Agentic OS</p>
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
