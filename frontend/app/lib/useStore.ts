import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import { socket } from "./socket";

export interface Submission {
  id: number;
  team_id: number;
  title: string;
  abstract: string;
  tech_stack: string;
  track: string;
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

export interface BiasAlert {
  id: number;
  timestamp: string;
  details: string;
  action: string;
}

class Store {
  private state = {
    submissions: [] as Submission[],
    leaderboard: [] as LeaderboardItem[],
    logs: [] as LogItem[],
    biasAlerts: [] as BiasAlert[],
    loading: true,
  };

  private listeners = new Set<() => void>();

  getState() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  async refresh() {
    try {
      const [subs, lead, alerts] = await Promise.all([
        apiFetch("/api/submissions"),
        apiFetch("/api/leaderboard"),
        apiFetch("/api/bias-alerts"),
      ]);
      this.state.submissions = subs;
      this.state.leaderboard = lead;
      this.state.biasAlerts = alerts;
    } catch (e) {
      console.error("Failed to load store data:", e);
    } finally {
      this.state.loading = false;
      this.notify();
    }
  }

  addLog(log: LogItem) {
    this.state.logs = [log, ...this.state.logs].slice(0, 100);
    this.notify();
  }

  async resolveAlert(id: number) {
    try {
      await apiFetch(`/api/bias-alerts/${id}/resolve`, { method: "PATCH" });
      await this.refresh();
    } catch (e) {
      console.error("Failed to resolve alert:", e);
      alert(`Error resolving alert: ${e}`);
    }
  }

  async submitProject(teamId: number, title: string, abstract: string, techStack: string, track: string) {
    const res = await apiFetch("/api/submissions/submit", {
      method: "POST",
      body: JSON.stringify({ team_id: teamId, title, abstract, tech_stack: techStack, track }),
    });
    await this.refresh();
    return res;
  }

  async submitScore(judgeId: number, projectId: number, scores: Record<string, number>, rawScore: number) {
    const res = await apiFetch("/api/scores/submit", {
      method: "POST",
      body: JSON.stringify({ judge_id: judgeId, project_id: projectId, criteria_scores: scores, raw_score: rawScore }),
    });
    await this.refresh();
    return res;
  }

  async overrideState(id: number, action: string) {
    const res = await apiFetch(`/api/submissions/${id}/override`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    await this.refresh();
    return res;
  }
}

export const globalStore = new Store();

// Zustand-style state selector hook
export function useStore() {
  const [state, setState] = useState(globalStore.getState());

  useEffect(() => {
    // Initial fetch
    globalStore.refresh();

    // Subscribe to store updates
    const unsubscribe = globalStore.subscribe(() => {
      setState({ ...globalStore.getState() });
    });

    // Listen to WebSocket broadcasts
    const handleLog = (data: any) => {
      globalStore.addLog(data);
    };

    const handleStateUpdate = () => {
      globalStore.refresh();
    };

    socket.on("log", handleLog);
    socket.on("state_update", handleStateUpdate);

    return () => {
      unsubscribe();
      socket.off("log", handleLog);
      socket.off("state_update", handleStateUpdate);
    };
  }, []);

  return {
    ...state,
    refresh: () => globalStore.refresh(),
    resolveAlert: (id: number) => globalStore.resolveAlert(id),
    submitProject: (teamId: number, title: string, abstract: string, techStack: string, track: string) =>
      globalStore.submitProject(teamId, title, abstract, techStack, track),
    submitScore: (judgeId: number, projectId: number, scores: Record<string, number>, rawScore: number) =>
      globalStore.submitScore(judgeId, projectId, scores, rawScore),
    overrideState: (id: number, action: string) =>
      globalStore.overrideState(id, action),
  };
}
