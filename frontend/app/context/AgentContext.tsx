"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Submission {
  id: number;
  team_id: number;
  title: string;
  abstract: string;
  tech_stack: string;
  state: string;
  created_at: string;
}

export interface LeaderboardItem {
  project_id: number;
  title: string;
  state: string;
  raw_average: number;
  normalized_score: number;
  eval_count: number;
}

export interface LogItem {
  text: string;
  timestamp: string;
}

interface AgentContextType {
  submissions: Submission[];
  leaderboard: LeaderboardItem[];
  logs: LogItem[];
  loading: boolean;
  refreshData: () => Promise<void>;
  submitProject: (teamId: number, title: string, abstract: string, techStack: string) => Promise<any>;
  submitScore: (judgeId: number, projectId: number, scores: Record<string, number>, rawScore: number) => Promise<any>;
  overrideState: (id: number, action: "APPROVE_OVERRIDE" | "CONFIRM_DISQUALIFICATION") => Promise<any>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const API_BASE = "http://localhost:8000";

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [subsRes, leadRes] = await Promise.all([
        fetch(`${API_BASE}/api/submissions`),
        fetch(`${API_BASE}/api/leaderboard`),
      ]);
      const subs = await subsRes.json();
      const lead = await leadRes.json();
      setSubmissions(subs);
      setLeaderboard(lead);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    refreshData();

    const eventSource = new EventSource(`${API_BASE}/api/streams/logs`);

    eventSource.addEventListener("log", (event) => {
      const data = JSON.parse(event.data);
      setLogs((prev) => [data, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    eventSource.addEventListener("state_update", (event) => {
      const data = JSON.parse(event.data);
      setLogs((prev) => [data, ...prev].slice(0, 100));
      refreshData(); // Live trigger refresh on state alterations
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const submitProject = async (teamId: number, title: string, abstract: string, techStack: string) => {
    const res = await fetch(`${API_BASE}/api/submissions/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, title, abstract, tech_stack: techStack }),
    });
    const data = await res.json();
    refreshData();
    return data;
  };

  const submitScore = async (judgeId: number, projectId: number, scores: Record<string, number>, rawScore: number) => {
    const res = await fetch(`${API_BASE}/api/scores/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judge_id: judgeId, project_id: projectId, criteria_scores: scores, raw_score: rawScore }),
    });
    const data = await res.json();
    refreshData();
    return data;
  };

  const overrideState = async (id: number, action: "APPROVE_OVERRIDE" | "CONFIRM_DISQUALIFICATION") => {
    const res = await fetch(`${API_BASE}/api/submissions/${id}/override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    refreshData();
    return data;
  };

  return (
    <AgentContext.Provider
      value={{
        submissions,
        leaderboard,
        logs,
        loading,
        refreshData,
        submitProject,
        submitScore,
        overrideState,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgent must be used within AgentProvider");
  return context;
};
