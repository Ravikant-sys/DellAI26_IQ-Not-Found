# HackOS — Dell Future Minds AI Hackathon 2026

> **Team:** IQ-Not-Found | **Track:** AI & Intelligent Agents | **PS1 Submission**

A state-driven agentic operating system that automates the entire hackathon lifecycle — from registration deduplication to winner certificate generation — using autonomous AI agents.

---

## 🏗️ Architecture

```
hackathon-dashboard/
├── frontend/          # Next.js 14 + Tailwind CSS
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── register/          # Participant registration
│   │   ├── dashboard/         # Organizer control center
│   │   ├── submit/            # Project submission
│   │   ├── review/            # Judge scorecard
│   │   ├── results/           # Live leaderboard
│   │   ├── bias/              # Bias alert panel
│   │   └── analytics/         # Platform analytics
│   └── components/
│       ├── BiasPanel.tsx      # Real-time bias alerts
│       ├── Leaderboard.tsx    # Ranked display
│       └── AnalyticsCharts.tsx
└── backend/           # FastAPI + SQLModel + PostgreSQL
    └── app/
        ├── main.py            # All API routes
        ├── models.py          # SQLModel schemas
        ├── database.py        # DB connection
        └── agents/            # AI agent workers
```

---

## ⚙️ Core Algorithms

| Algorithm | Purpose |
|-----------|---------|
| **DBSCAN** (cosine similarity) | Vector-based plagiarism detection on project embeddings |
| **Hungarian Algorithm** (SciPy) | Optimal bipartite judge-to-project assignment |
| **Z-score Normalisation** | Per-judge bias calibration — removes lenient/strict outlier effect |
| **spaCy NER** | Automatic skill extraction from participant bios |
| **Blockchain Ledger** | SHA-256 chained audit log for tamper-proof scoring |

---

## 🚀 Quick Start

### Backend (FastAPI)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Seed Demo Data
```bash
curl -X POST http://localhost:8000/api/seed
```

Open **http://localhost:3000** 🎉

---

## 🌐 Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/register` | Multi-step participant registration |
| `/dashboard` | Organizer control center (tabbed) |
| `/submit` | Project submission with DBSCAN check |
| `/review` | Judge scorecard with Z-score calibration |
| `/results` | Animated leaderboard + winner certificate |
| `/bias` | Real-time WebSocket bias alert panel |
| `/analytics` | Registration timeline + track distribution |

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register participant (triggers DBSCAN async) |
| `POST` | `/api/submit` | Submit project (triggers vector similarity check) |
| `POST` | `/api/review/assign` | Hungarian algorithm judge assignment |
| `POST` | `/api/review/score` | Submit scores (triggers Z-score calibration) |
| `POST` | `/api/results/generate` | Generate final rankings |
| `GET`  | `/api/leaderboard` | Z-score normalised rankings |
| `GET`  | `/api/bias-alerts` | Active bias anomaly flags |
| `GET`  | `/api/analytics/winner` | Winner certificate with verification hash |
| `GET`  | `/api/audit-logs/verify` | Blockchain ledger integrity check |
| `WS`   | `/ws` | Real-time agent event stream |

---

## 🧰 Tech Stack

**Backend:** FastAPI · SQLModel · PostgreSQL · spaCy · SciPy · LangGraph · ChromaDB · WebSockets

**Frontend:** Next.js 14 · Tailwind CSS · Inter + Outfit fonts · Zustand · Recharts

---

## 👥 Team

**IQ-Not-Found** — Dell Future Minds AI Hackathon 2026
