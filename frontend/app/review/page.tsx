"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import {
  Star,
  ArrowLeft,
  Send,
  User,
  ChevronDown,
} from "lucide-react";

const JUDGES = [
  { id: 1, name: "Dr. Hawk", role: "AI/ML Specialist", avatar: "H" },
  { id: 2, name: "Prof. Mod", role: "Web3 Specialist",  avatar: "M" },
  { id: 3, name: "Hon. Dove", role: "Lenient Generalist", avatar: "D" },
];

const CRITERIA = [
  { key: "innovation", label: "Innovation",    description: "Originality and creativity of the concept" },
  { key: "tech",       label: "Technical",     description: "Implementation depth and code quality" },
  { key: "feasibility",label: "Feasibility",   description: "Real-world viability and scalability" },
  { key: "presentation",label: "Presentation", description: "Demo quality, docs, and pitch clarity" },
];

type Scores = Record<string, number>;

export default function ReviewPage() {
  const { submissions, refresh } = useStore();

  const [judgeId, setJudgeId] = useState(1);
  const [projId, setProjId] = useState("");
  const [scores, setScores] = useState<Scores>({ innovation: 8, tech: 8, feasibility: 8, presentation: 8 });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(true);

  const availableProjects = submissions.filter(s => s.state !== "FLAGGED_DUPLICATE");
  const selectedJudge = JUDGES.find(j => j.id === judgeId) || JUDGES[0];
  const rawScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

  const handleScore = (key: string, val: number) => {
    setScores(prev => ({ ...prev, [key]: Math.max(0, Math.min(10, val)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projId) { setMsg("Please select a project."); setSuccess(false); return; }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("http://localhost:8000/api/review/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judge_id: judgeId,
          project_id: parseInt(projId),
          innovation: scores.innovation,
          tech: scores.tech,
          feasibility: scores.feasibility,
          presentation: scores.presentation,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMsg(`Score recorded! Raw average: ${data.raw_score?.toFixed(2) ?? rawScore.toFixed(2)}. Z-score calibration queued.`);
        setScores({ innovation: 8, tech: 8, feasibility: 8, presentation: 8 });
        setProjId("");
        refresh();
      } else {
        setSuccess(false);
        setMsg(data.detail || "Scoring failed.");
      }
    } catch (err: any) {
      setSuccess(false);
      setMsg(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-600/8 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-modal-open">

        <header className="pb-4 border-b border-white/[0.08] space-y-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#f59e0b] hover:text-amber-400 font-bold uppercase tracking-wider transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Star className="w-7 h-7 text-[#f59e0b]" />
            Reviewer Scorecard
          </h1>
          <p className="text-slate-400 text-sm">
            Cast evaluation scores to trigger Z-score bias calibration.
          </p>
        </header>

        {/* Judge selector */}
        <div className="grid grid-cols-3 gap-3">
          {JUDGES.map(j => (
            <button
              key={j.id}
              onClick={() => setJudgeId(j.id)}
              className={`p-4 rounded-xl border text-left transition ${
                judgeId === j.id
                  ? "bg-amber-500/10 border-amber-500/35 text-amber-400"
                  : "bg-[#05080f] border-white/[0.06] text-slate-400 hover:border-white/[0.15]"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm mb-2 ${
                judgeId === j.id ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"
              }`}>
                {j.avatar}
              </div>
              <p className="font-bold text-sm">{j.name}</p>
              <p className="text-[10px] opacity-70">{j.role}</p>
            </button>
          ))}
        </div>

        {/* Scorecard form */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">

          {/* Project selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Assigned Project Submission
            </label>
            <div className="relative">
              <select
                value={projId}
                onChange={e => setProjId(e.target.value)}
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#f59e0b] transition appearance-none"
                required
              >
                <option value="">-- Choose a Project --</option>
                {availableProjects.map(s => (
                  <option key={s.id} value={s.id}>
                    ID {s.id}: {s.title} ({s.state})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Criteria sliders */}
          <div className="space-y-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scoring Criteria (0–10)</p>
            {CRITERIA.map(c => (
              <div key={c.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-white">{c.label}</span>
                    <p className="text-[10px] text-slate-500">{c.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleScore(c.key, scores[c.key] - 0.5)}
                      className="w-7 h-7 bg-[#05080f] border border-white/[0.08] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-500/30 transition text-sm"
                    >−</button>
                    <span className="w-10 text-center font-mono font-bold text-white text-sm">
                      {scores[c.key].toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleScore(c.key, scores[c.key] + 0.5)}
                      className="w-7 h-7 bg-[#05080f] border border-white/[0.08] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-500/30 transition text-sm"
                    >+</button>
                  </div>
                </div>
                <div className="h-2 bg-[#05080f] rounded-full border border-white/[0.04] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] rounded-full transition-all duration-300"
                    style={{ width: `${(scores[c.key] / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Raw score preview */}
          <div className="bg-[#05080f] border border-white/[0.06] rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Raw Average Score</p>
              <p className="text-2xl font-extrabold font-mono text-[#f59e0b]">{rawScore.toFixed(2)} / 10</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Z-score calibration queued</p>
              <p>after submission</p>
            </div>
          </div>

          {msg && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              success ? "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}>{msg}</div>
          )}

          <button
            type="submit"
            disabled={loading || !projId}
            className="w-full py-3.5 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-xl text-slate-900 flex justify-center items-center gap-2 transition shadow-lg shadow-amber-500/20 text-sm"
          >
            {loading ? "Recording Score..." : "Cast Evaluation Scores"}
            <Star className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
