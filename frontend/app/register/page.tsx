"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Shield,
  Zap,
} from "lucide-react";

const steps = ["Personal Info", "Skills & Bio", "Confirm"];

export default function RegisterPage() {
  const [step, setStep] = useState(0);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [skills, setSkills] = useState("React, Tailwind, Node.js");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setMsg("Name, email, and password are required.");
      setSuccess(false);
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          bio,
          skills_text: skills,
          institution,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setUserId(data.user_id);
        setMsg(`Registration successful! Participant ID: ${data.user_id}`);
        setStep(3); // success step
      } else {
        setSuccess(false);
        setMsg(data.detail || "Registration failed.");
      }
    } catch (err: any) {
      setSuccess(false);
      setMsg(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="ambient" />

      <div className="max-w-2xl w-full space-y-8 relative z-10 animate-modal-open">

        {/* Header */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#10b981] hover:text-emerald-400 font-bold uppercase tracking-wider mb-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full text-[#10b981] text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            Participant Registration
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#38bdf8]">Hackathon</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Register to trigger background vector deduplication & skill extraction.
          </p>
        </div>

        {/* Success state */}
        {step === 3 ? (
          <div className="glass-panel rounded-2xl p-8 space-y-6 text-center animate-modal-open">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">You're Registered!</h2>
              <p className="text-slate-400 text-sm">{msg}</p>
            </div>
            <div className="bg-[#05080f] p-4 rounded-xl border border-white/[0.06] space-y-2 text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pipeline enqueued:</p>
              {[
                "✓ Profile embedding generated",
                "✓ DBSCAN duplicate check running",
                "✓ spaCy NER skill extraction active",
                "✓ Organizer dashboard notified",
              ].map((item, i) => (
                <p key={i} className="text-xs text-emerald-400 font-mono">{item}</p>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                href="/submit"
                className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-500 text-slate-900 font-bold rounded-xl text-xs transition"
              >
                Submit a Project →
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.08] text-slate-200 font-bold rounded-xl text-xs transition"
              >
                Organizer Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">

            {/* Stepper */}
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <React.Fragment key={i}>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition ${
                      i === step
                        ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                        : i < step
                        ? "text-emerald-500"
                        : "text-slate-600"
                    }`}
                  >
                    {i < step ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-[9px]">{i + 1}</span>
                    )}
                    {s}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px ${i < step ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Step 0: Personal Info */}
              {step === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-modal-open">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="jane@university.edu"
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Institution</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={e => setInstitution(e.target.value)}
                      placeholder="Stanford University"
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition"
                    />
                  </div>
                </div>
              )}

              {/* Step 1: Skills & Bio */}
              {step === 1 && (
                <div className="space-y-4 animate-modal-open">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Skills (comma separated)</label>
                    <input
                      type="text"
                      value={skills}
                      onChange={e => setSkills(e.target.value)}
                      placeholder="React, FastAPI, PyTorch, Postgres"
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">spaCy NER will extract and categorize these automatically.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Developer Bio</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="I'm a backend engineer specializing in distributed systems and AI pipelines..."
                      rows={4}
                      className="w-full bg-[#05080f] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#10b981] transition resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Profile embedding generated for vector similarity deduplication.</p>
                  </div>
                </div>
              )}

              {/* Step 2: Confirm */}
              {step === 2 && (
                <div className="space-y-4 animate-modal-open">
                  <div className="bg-[#05080f] rounded-xl border border-white/[0.06] divide-y divide-white/[0.04]">
                    {[
                      { label: "Name", value: name },
                      { label: "Email", value: email },
                      { label: "Institution", value: institution || "Not specified" },
                      { label: "Skills", value: skills },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center px-4 py-3 text-sm">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</span>
                        <span className="text-white font-semibold text-xs text-right max-w-[60%] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <Cpu className="w-4 h-4" />, label: "DBSCAN Dedup", color: "text-sky-400" },
                      { icon: <Shield className="w-4 h-4" />, label: "NER Extraction", color: "text-emerald-400" },
                      { icon: <Zap className="w-4 h-4" />, label: "Async Background", color: "text-amber-400" },
                    ].map(({ icon, label, color }) => (
                      <div key={label} className={`flex items-center gap-2 p-3 bg-[#05080f] border border-white/[0.04] rounded-xl ${color} text-xs font-semibold`}>
                        {icon}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {msg && !success && (
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {msg}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="px-5 py-3 bg-[#0e1626] hover:bg-slate-800 border border-white/[0.08] rounded-xl text-sm font-bold text-slate-200 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => s + 1)}
                    disabled={step === 0 && (!name.trim() || !email.trim() || !password.trim())}
                    className="flex-1 py-3 bg-[#10b981] hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold rounded-xl text-sm text-slate-900 flex justify-center items-center gap-2 transition"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-[#10b981] to-[#38bdf8] hover:opacity-90 font-bold rounded-xl text-sm text-slate-900 flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? "Registering..." : "Complete Registration"}
                    <User className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
