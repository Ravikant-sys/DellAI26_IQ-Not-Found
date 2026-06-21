"use client";

import React, { useState, useEffect } from "react";
import { useStore, Submission } from "../lib/useStore";
import { 
  Send, 
  Star, 
  ArrowRight, 
  User, 
  Users, 
  Award, 
  FileText,
  AlertTriangle, 
  CheckCircle2, 
  Code,
  Laptop,
  Check
} from "lucide-react";

export default function Portal() {
  const { submissions, refresh } = useStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"register" | "submit" | "score">("register");

  // 1. Participant Registration State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regSkills, setRegSkills] = useState("React, Tailwind, Node.js");
  const [regInstitution, setRegInstitution] = useState("Stanford University");
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState("");
  const [regSuccess, setRegSuccess] = useState(true);

  // 2. Project Submission State
  const [subTeamId, setSubTeamId] = useState("1");
  const [subTitle, setSubTitle] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subGitUrl, setSubGitUrl] = useState("https://github.com/myteam/project");
  const [subDemoUrl, setSubDemoUrl] = useState("https://project-demo.vercel.app");
  const [subTrack, setSubTrack] = useState("AI & Intelligent Agents");
  const [subTags, setSubTags] = useState("FastAPI, Next.js, PyTorch");
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg] = useState("");
  const [subSuccess, setSubSuccess] = useState(true);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<any>(null);

  // 3. Reviewer Judging State
  const [scoreJudgeId, setScoreJudgeId] = useState("1");
  const [scoreProjId, setScoreProjId] = useState("");
  const [scoreInnov, setScoreInnov] = useState("8");
  const [scoreTech, setScoreTech] = useState("8");
  const [scoreFeas, setScoreFeas] = useState("8");
  const [scorePres, setScorePres] = useState("8");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreMsg, setScoreMsg] = useState("");
  const [scoreSuccess, setScoreSuccess] = useState(true);

  // Handlers
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegMsg("Name, email, and password are required.");
      setRegSuccess(false);
      return;
    }
    setRegLoading(true);
    setRegMsg("");
    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          bio: regBio,
          skills_text: regSkills,
          institution: regInstitution
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(true);
        setRegMsg(`Registration Successful! Participant registered with ID ${data.user_id}. Background deduplication & skill extraction enqueued.`);
        // Clear inputs
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegBio("");
      } else {
        setRegSuccess(false);
        setRegMsg(data.detail || "Registration failed.");
      }
    } catch (err: any) {
      setRegSuccess(false);
      setRegMsg(err.message || err.toString());
    } finally {
      setRegLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim() || !subDesc.trim()) {
      setSubMsg("Project Title and Description are required.");
      setSubSuccess(false);
      return;
    }
    setSubLoading(true);
    setSubMsg("");
    setLastSubmissionResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: parseInt(subTeamId),
          title: subTitle,
          description: subDesc,
          github_url: subGitUrl,
          demo_url: subDemoUrl,
          track: subTrack,
          tags: subTags
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubSuccess(true);
        setSubMsg(`Submission succeeded! Project ID ${data.submission_id} registered. Background embeddings queued.`);
        
        // Fetch submission state from backend (which is running the background task)
        setTimeout(async () => {
          try {
            const subRes = await fetch(`http://localhost:8000/api/submissions/${data.submission_id}`);
            if (subRes.ok) {
              const subData = await subRes.json();
              setLastSubmissionResult(subData);
            }
          } catch (e) {}
          refresh();
        }, 1500);

        setSubTitle("");
        setSubDesc("");
      } else {
        setSubSuccess(false);
        setSubMsg(data.detail || "Submission failed.");
      }
    } catch (err: any) {
      setSubSuccess(false);
      setSubMsg(err.message || err.toString());
    } finally {
      setSubLoading(false);
    }
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreProjId) {
      setScoreMsg("Please select a target project submission.");
      setScoreSuccess(false);
      return;
    }
    setScoreLoading(true);
    setScoreMsg("");
    try {
      const res = await fetch("http://localhost:8000/api/review/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judge_id: parseInt(scoreJudgeId),
          project_id: parseInt(scoreProjId),
          innovation: parseFloat(scoreInnov),
          tech: parseFloat(scoreTech),
          feasibility: parseFloat(scoreFeas),
          presentation: parseFloat(scorePres)
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setScoreSuccess(true);
        setScoreMsg(`Evaluation registered successfully (Raw Score: ${data.raw_score}). Z-score normalizations and bias check tasks enqueued.`);
      } else {
        setScoreSuccess(false);
        setScoreMsg(data.detail || "Scoring rejected.");
      }
    } catch (err: any) {
      setScoreSuccess(false);
      setScoreMsg(err.message || err.toString());
    } finally {
      setScoreLoading(false);
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f1f5f9] p-6 md:p-10 relative overflow-hidden">
      {/* Ambient Light blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[30%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-modal-open">
        {/* Header */}
        <header className="pb-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              Participant & Reviewer Simulator
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Dell Future Minds Hackathon Portal
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Simulate participant registrations, project submissions, and judge criteria evaluations.
            </p>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex bg-[#0e1626] border border-white/[0.06] p-1.5 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "register"
                ? "bg-slate-900 border border-white/[0.08] text-[#10b981]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-4 h-4" />
            1. Participant Registration
          </button>
          <button
            onClick={() => setActiveTab("submit")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "submit"
                ? "bg-slate-900 border border-white/[0.08] text-[#10b981]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            2. Project Submission
          </button>
          <button
            onClick={() => setActiveTab("score")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "score"
                ? "bg-slate-900 border border-white/[0.08] text-[#10b981]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Star className="w-4 h-4" />
            3. Reviewer Scorecard
          </button>
        </div>

        {/* Dynamic Forms */}
        <div className="space-y-6">
          {/* TAB 1: REGISTRATION */}
          {activeTab === "register" && (
            <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 animate-modal-open">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08] text-[#10b981]">
                <User className="w-5 h-5" />
                <h2 className="font-extrabold text-base uppercase tracking-wider text-white">Register New Participant</h2>
              </div>
              <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Affiliated Institution</label>
                  <input
                    type="text"
                    value={regInstitution}
                    onChange={(e) => setRegInstitution(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Skills Text (Comma Separated)</label>
                  <input
                    type="text"
                    value={regSkills}
                    onChange={(e) => setRegSkills(e.target.value)}
                    placeholder="React, Python, FastAPI, Postgres"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Developer Bio</label>
                  <textarea
                    value={regBio}
                    onChange={(e) => setRegBio(e.target.value)}
                    placeholder="I am a backend specialist. I write clean Python/Go, deploy docker images and configure kubernetes clusters..."
                    rows={3}
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 bg-[#10b981] hover:bg-emerald-500 font-bold rounded-xl text-xs text-slate-900 flex justify-center items-center gap-2 transition"
                  >
                    {regLoading ? "Registering participant..." : "Submit Registration Profile"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
              {regMsg && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  regSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  {regMsg}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: PROJECT SUBMISSION */}
          {activeTab === "submit" && (
            <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 animate-modal-open">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08] text-[#10b981]">
                <Users className="w-5 h-5" />
                <h2 className="font-extrabold text-base uppercase tracking-wider text-white">Submit Hackathon Project</h2>
              </div>

              {lastSubmissionResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  lastSubmissionResult.state === "FLAGGED_DUPLICATE" ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                }`}>
                  <p className="font-bold flex items-center gap-1.5 mb-1.5">
                    {lastSubmissionResult.state === "FLAGGED_DUPLICATE" ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Vector Plagiarism Alert Flagged!
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Submission Verified: Unique Project
                      </>
                    )}
                  </p>
                  <p>State: <strong>{lastSubmissionResult.state}</strong></p>
                  <p className="mt-1">
                    {lastSubmissionResult.state === "FLAGGED_DUPLICATE" 
                      ? "DBSCAN computed vector cosine similarity above 0.85 tolerance. System flagged duplicate, enqueuing Human-in-the-loop overrides."
                      : "Uniqueness validated by DBSCAN. Submission enqueued for bipartite linear sum judge matching."}
                  </p>
                </div>
              )}

              <form onSubmit={handleProjectSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Registered Team ID</label>
                  <input
                    type="number"
                    value={subTeamId}
                    onChange={(e) => setSubTeamId(e.target.value)}
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Project Title</label>
                  <input
                    type="text"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="e.g. Swarm Robotics Planner"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">GitHub Repo URL</label>
                  <input
                    type="url"
                    value={subGitUrl}
                    onChange={(e) => setSubGitUrl(e.target.value)}
                    placeholder="https://github.com/team/repo"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Live Demo URL</label>
                  <input
                    type="url"
                    value={subDemoUrl}
                    onChange={(e) => setSubDemoUrl(e.target.value)}
                    placeholder="https://project.vercel.app"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Track Stream</label>
                  <select
                    value={subTrack}
                    onChange={(e) => setSubTrack(e.target.value)}
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                  >
                    <option value="AI & Intelligent Agents">AI & Intelligent Agents</option>
                    <option value="Web3 & Decentralized Systems">Web3 & Decentralized Systems</option>
                    <option value="Cloud & Developer Platforms">Cloud & Developer Platforms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Tags / Tech Stack keywords</label>
                  <input
                    type="text"
                    value={subTags}
                    onChange={(e) => setSubTags(e.target.value)}
                    placeholder="FastAPI, React, Pytorch"
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Project description / Abstract</label>
                  <textarea
                    value={subDesc}
                    onChange={(e) => setSubDesc(e.target.value)}
                    placeholder="Provide a detailed overview of the system architecture, features, and model implementation details..."
                    rows={4}
                    className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#10b981]"
                    required
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={subLoading}
                    className="w-full py-3 bg-[#10b981] hover:bg-emerald-500 font-bold rounded-xl text-slate-900 text-xs flex justify-center items-center gap-2 transition"
                  >
                    {subLoading ? "Submitting abstract..." : "Submit Hackathon Project"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
              {subMsg && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  subSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  {subMsg}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: JUDGE SCORECARD */}
          {activeTab === "score" && (
            <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 animate-modal-open">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08] text-[#f59e0b]">
                <Star className="w-5 h-5" />
                <h2 className="font-extrabold text-base uppercase tracking-wider text-white">Submit Evaluation Scorecard</h2>
              </div>
              <form onSubmit={handleScoreSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Reviewer / Judge Profile</label>
                    <select
                      value={scoreJudgeId}
                      onChange={(e) => setScoreJudgeId(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                    >
                      <option value="1">Judge 1 (Dr. Hawk - AI/ML Specialist)</option>
                      <option value="2">Judge 2 (Prof. Mod - Web3 Specialist)</option>
                      <option value="3">Judge 3 (Hon. Dove - Lenient Generalist)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Assigned Project Submission</label>
                    <select
                      value={scoreProjId}
                      onChange={(e) => setScoreProjId(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                      required
                    >
                      <option value="">-- Choose Project Submission --</option>
                      {submissions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          ID {sub.id}: {sub.title} ({sub.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Innovation (0-10)</label>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      value={scoreInnov}
                      onChange={(e) => setScoreInnov(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Technical (0-10)</label>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      value={scoreTech}
                      onChange={(e) => setScoreTech(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Feasibility (0-10)</label>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      value={scoreFeas}
                      onChange={(e) => setScoreFeas(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Presentation (0-10)</label>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      value={scorePres}
                      onChange={(e) => setScorePres(e.target.value)}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#f59e0b]"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={scoreLoading || !scoreProjId}
                    className="w-full py-3 bg-[#f59e0b] hover:bg-amber-400 font-bold rounded-xl text-slate-900 text-xs flex justify-center items-center gap-2 transition disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {scoreLoading ? "Saving scorecard..." : "Cast Evaluation Scores"}
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </form>
              {scoreMsg && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  scoreSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-[#10b981]" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  {scoreMsg}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
