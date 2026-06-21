"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../lib/useStore";
import {
  Send,
  ArrowLeft,
  AlertTriangle,
  Check,
  GitBranch,
  Globe,
  Tag,
  Users,
  FileText,
} from "lucide-react";

const TRACKS = [
  "AI & Intelligent Agents",
  "Web3 & Decentralized Systems",
  "Cloud & Developer Platforms",
];

export default function SubmitPage() {
  const { submissions, refresh } = useStore();

  const [teamId, setTeamId] = useState("1");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [gitUrl, setGitUrl] = useState("https://github.com/myteam/project");
  const [demoUrl, setDemoUrl] = useState("https://project-demo.vercel.app");
  const [track, setTrack] = useState(TRACKS[0]);
  const [tags, setTags] = useState("FastAPI, Next.js, PyTorch");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(true);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) {
      setMsg("Project Title and Description are required.");
      setSuccess(false);
      return;
    }
    setLoading(true);
    setMsg("");
    setLastResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: parseInt(teamId),
          title,
          description: desc,
          github_url: gitUrl,
          demo_url: demoUrl,
          track,
          tags,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMsg(`Submission ID #${data.submission_id} registered. Background embeddings and DBSCAN check queued.`);
        setTimeout(async () => {
          try {
            const subRes = await fetch(`http://localhost:8000/api/submissions/${data.submission_id}`);
            if (subRes.ok) setLastResult(await subRes.json());
          } catch {}
          refresh();
        }, 1500);
        setTitle("");
        setDesc("");
      } else {
        setSuccess(false);
        setMsg(data.detail || "Submission failed.");
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
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/8 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-modal-open">

        <header className="pb-4 border-b border-white/[0.08] space-y-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#10b981] hover:text-emerald-400 font-bold uppercase tracking-wider transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Send className="w-7 h-7 text-[#10b981]" />
                Project Submission
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Submit your hackathon project to trigger vector plagiarism detection.
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-mono font-bold text-[#10b981] text-lg">{submissions.filter(s => s.state !== "FLAGGED_DUPLICATE").length}</p>
              <p>Active Projects</p>
            </div>
          </div>
        </header>

        {/* Last result banner */}
        {lastResult && (
          <div className={`p-4 rounded-2xl border text-sm animate-modal-open ${
            lastResult.state === "FLAGGED_DUPLICATE"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}>
            <p className="font-bold flex items-center gap-2 mb-2">
              {lastResult.state === "FLAGGED_DUPLICATE" ? (
                <><AlertTriangle className="w-4 h-4" /> Vector Plagiarism Alert!</>
              ) : (
                <><Check className="w-4 h-4" /> Submission Verified: Unique Project</>
              )}
            </p>
            <p className="text-xs">
              {lastResult.state === "FLAGGED_DUPLICATE"
                ? "DBSCAN computed cosine similarity > 0.85. Flagged for Human-in-the-Loop review."
                : "DBSCAN uniqueness validated. Enqueued for Hungarian bipartite judge matching."}
            </p>
          </div>
        )}

        {/* Submission form */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                <Users className="w-3 h-3 inline mr-1" />Team ID
              </label>
              <input type="number" value={teamId} onChange={e => setTeamId(e.target.value)}
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                <FileText className="w-3 h-3 inline mr-1" />Project Title *
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Swarm Robotics Planner"
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                <GitBranch className="w-3 h-3 inline mr-1" />GitHub URL *
              </label>
              <input type="url" value={gitUrl} onChange={e => setGitUrl(e.target.value)}
                placeholder="https://github.com/team/repo"
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                <Globe className="w-3 h-3 inline mr-1" />Live Demo URL
              </label>
              <input type="url" value={demoUrl} onChange={e => setDemoUrl(e.target.value)}
                placeholder="https://project.vercel.app"
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Track Stream</label>
              <select value={track} onChange={e => setTrack(e.target.value)}
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition">
                {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                <Tag className="w-3 h-3 inline mr-1" />Tech Stack Tags *
              </label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                placeholder="FastAPI, React, PyTorch"
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition" required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Project Abstract *</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Provide a detailed overview of the system architecture, features, and implementation details..."
                rows={5}
                className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition resize-none" required />
              <p className="text-[10px] text-slate-500 mt-1.5">
                This text is embedded for DBSCAN vector similarity deduplication.
              </p>
            </div>
          </div>

          {msg && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              success ? "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}>{msg}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#10b981] to-[#38bdf8] hover:opacity-90 disabled:opacity-50 font-bold rounded-xl text-slate-900 flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-500/20 text-sm">
            {loading ? "Submitting..." : "Submit Hackathon Project"}
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
