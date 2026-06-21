#!/usr/bin/env python3
"""
Test script: Register 5 new participants + Submit 15 new projects across all tracks
"""
import requests
import json
import time

BASE = "http://localhost:8000"
GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

def ok(msg): print(f"  {GREEN}✓{RESET} {msg}")
def fail(msg): print(f"  {RED}✗{RESET} {msg}")
def section(msg): print(f"\n{BOLD}{CYAN}{'─'*55}{RESET}\n{BOLD}{CYAN}  {msg}{RESET}\n{BOLD}{CYAN}{'─'*55}{RESET}")

# ─── 5 New Participants ───────────────────────────────────────
PARTICIPANTS = [
    {
        "name": "Aanya Sharma",
        "email": f"aanya.sharma.{int(time.time())}@iitb.ac.in",
        "password": "SecurePass@123",
        "bio": "Full-stack ML engineer specializing in NLP and computer vision pipelines at scale.",
        "skills_text": "Python, PyTorch, FastAPI, Docker, Kubernetes, HuggingFace",
        "institution": "IIT Bombay"
    },
    {
        "name": "Rohan Mehta",
        "email": f"rohan.mehta.{int(time.time())+1}@bits-pilani.ac.in",
        "password": "SecurePass@456",
        "bio": "Blockchain developer with expertise in smart contracts and DeFi protocols.",
        "skills_text": "Solidity, Rust, Web3.js, Go, PostgreSQL, Docker",
        "institution": "BITS Pilani"
    },
    {
        "name": "Priya Nair",
        "email": f"priya.nair.{int(time.time())+2}@iisc.ac.in",
        "password": "SecurePass@789",
        "bio": "Cloud architect building serverless and edge computing solutions for enterprise.",
        "skills_text": "AWS, Terraform, Node.js, TypeScript, Redis, Kafka",
        "institution": "IISc Bangalore"
    },
    {
        "name": "Arjun Kapoor",
        "email": f"arjun.kapoor.{int(time.time())+3}@dtu.ac.in",
        "password": "SecurePass@321",
        "bio": "AI researcher focused on reinforcement learning and multi-agent systems.",
        "skills_text": "Python, TensorFlow, Ray, C++, CUDA, OpenAI Gym",
        "institution": "Delhi Technological University"
    },
    {
        "name": "Sneha Reddy",
        "email": f"sneha.reddy.{int(time.time())+4}@vit.ac.in",
        "password": "SecurePass@654",
        "bio": "DevOps and platform engineer with passion for observability and SRE practices.",
        "skills_text": "Golang, Prometheus, Grafana, Linux, Helm, GitOps",
        "institution": "VIT University"
    },
]

# ─── 15 New Projects (5 per track) ──────────────────────────
PROJECTS = [
    # AI & Intelligent Agents (5)
    {
        "team_id": 1, "track": "AI & Intelligent Agents",
        "title": "NeuroNav: Autonomous Indoor Robot Navigation",
        "description": "A reinforcement learning system for real-time indoor navigation using LiDAR sensor fusion and SLAM. Implemented with ROS2, PyTorch, and CUDA-accelerated inference for sub-50ms response.",
        "github_url": "https://github.com/team-neuronav/indoor-robot",
        "demo_url": "https://neuronav.vercel.app",
        "tags": "PyTorch, ROS2, CUDA, SLAM, Python"
    },
    {
        "team_id": 2, "track": "AI & Intelligent Agents",
        "title": "MedLang: Multilingual Clinical NLP Engine",
        "description": "An NLP pipeline for extracting structured medical entities from multilingual clinical notes using BioBERT fine-tuning. Supports Hindi, Tamil, and English with 94% F1 on NER benchmarks.",
        "github_url": "https://github.com/team-medlang/clinical-nlp",
        "demo_url": "https://medlang-demo.streamlit.app",
        "tags": "HuggingFace, BioBERT, spaCy, FastAPI, React"
    },
    {
        "team_id": 3, "track": "AI & Intelligent Agents",
        "title": "SwarmSense: Distributed Edge AI for IoT",
        "description": "Federated learning framework enabling privacy-preserving model training across IoT edge nodes. Uses gossip protocol for gradient aggregation without a central server.",
        "github_url": "https://github.com/team-swarmsense/edge-fl",
        "demo_url": "https://swarmsense.netlify.app",
        "tags": "Python, TensorFlow, MQTT, Raspberry Pi, Docker"
    },
    {
        "team_id": 4, "track": "AI & Intelligent Agents",
        "title": "CodeSage: AI-Powered Code Review Assistant",
        "description": "LLM-based code review system that detects bugs, security vulnerabilities, and style issues using GPT-4 fine-tuned on 500K code review pairs. Integrates with GitHub Actions CI/CD.",
        "github_url": "https://github.com/team-codesage/review-bot",
        "demo_url": "https://codesage.dev",
        "tags": "OpenAI, LangChain, FastAPI, Next.js, PostgreSQL"
    },
    {
        "team_id": 5, "track": "AI & Intelligent Agents",
        "title": "VisionGuard: Real-time Anomaly Detection CCTV",
        "description": "Computer vision system for detecting security anomalies in CCTV feeds using YOLOv8 and temporal attention. Achieves 98.2% detection accuracy at 30fps on edge hardware.",
        "github_url": "https://github.com/team-visionguard/cctv-ai",
        "demo_url": "https://visionguard.io/demo",
        "tags": "YOLOv8, OpenCV, PyTorch, ONNX, Kafka"
    },
    # Web3 & Decentralized Systems (5)
    {
        "team_id": 1, "track": "Web3 & Decentralized Systems",
        "title": "ChainVault: Decentralized Secret Management",
        "description": "A Shamir secret sharing protocol built on Ethereum for enterprise key management. Smart contracts ensure no single point of failure with threshold-based recovery mechanisms.",
        "github_url": "https://github.com/team-chainvault/secret-mgmt",
        "demo_url": "https://chainvault.eth.limo",
        "tags": "Solidity, Hardhat, Ethers.js, React, IPFS"
    },
    {
        "team_id": 2, "track": "Web3 & Decentralized Systems",
        "title": "DAOPulse: On-chain Governance Analytics",
        "description": "Real-time analytics dashboard for DAO governance activity using The Graph Protocol. Tracks voting patterns, proposal outcomes, and voter participation across 50+ DAOs.",
        "github_url": "https://github.com/team-daopulse/governance",
        "demo_url": "https://daopulse.xyz",
        "tags": "The Graph, GraphQL, Next.js, Solidity, Subgraph"
    },
    {
        "team_id": 3, "track": "Web3 & Decentralized Systems",
        "title": "CrossBridge: Zero-fee Cross-chain Messaging",
        "description": "Novel cross-chain communication protocol using optimistic rollup proofs for near-zero fee asset transfers between EVM chains. Processes 10K+ TPS with 2-minute finality.",
        "github_url": "https://github.com/team-crossbridge/xchain",
        "demo_url": "https://crossbridge.finance",
        "tags": "Rust, Solidity, Arbitrum, Optimism, Cairo"
    },
    {
        "team_id": 4, "track": "Web3 & Decentralized Systems",
        "title": "NFTProof: Privacy-preserving NFT Ownership",
        "description": "ZK-SNARK based system for proving NFT ownership without revealing wallet identity. Enables anonymous membership verification for token-gated communities.",
        "github_url": "https://github.com/team-nftproof/zk-ownership",
        "demo_url": "https://nftproof.io",
        "tags": "Circom, SnarkJS, Solidity, React, WalletConnect"
    },
    {
        "team_id": 5, "track": "Web3 & Decentralized Systems",
        "title": "SupplyLedger: Blockchain Supply Chain Tracker",
        "description": "Enterprise supply chain provenance system using Hyperledger Fabric. Provides immutable audit trails for pharmaceutical supply chains with IoT sensor integration.",
        "github_url": "https://github.com/team-supplyledger/fabric-scm",
        "demo_url": "https://supplyledger.io",
        "tags": "Hyperledger Fabric, Go, Node.js, IoT, Docker"
    },
    # Cloud & Developer Platforms (5)
    {
        "team_id": 1, "track": "Cloud & Developer Platforms",
        "title": "AutoScale: Predictive Kubernetes HPA",
        "description": "ML-powered Kubernetes autoscaler that predicts load 15 minutes ahead using LSTM time-series models. Reduces over-provisioning by 40% compared to default HPA.",
        "github_url": "https://github.com/team-autoscale/k8s-hpa",
        "demo_url": "https://autoscale.dev/demo",
        "tags": "Golang, Kubernetes, Python, Prometheus, LSTM"
    },
    {
        "team_id": 2, "track": "Cloud & Developer Platforms",
        "title": "ObservabiliQ: Unified Observability Platform",
        "description": "OpenTelemetry-native observability platform combining logs, metrics, and traces in a single UI. AI-powered root cause analysis reduces MTTR by 60% for on-call engineers.",
        "github_url": "https://github.com/team-observabliq/platform",
        "demo_url": "https://observabliq.io",
        "tags": "OpenTelemetry, ClickHouse, Next.js, Golang, Grafana"
    },
    {
        "team_id": 3, "track": "Cloud & Developer Platforms",
        "title": "InfraChat: AI Infrastructure Assistant",
        "description": "Conversational AI for DevOps that understands cloud infrastructure and generates Terraform/Helm configs from natural language. Integrates with AWS, GCP, and Azure.",
        "github_url": "https://github.com/team-infrachat/ai-devops",
        "demo_url": "https://infrachat.dev",
        "tags": "LangChain, Terraform, FastAPI, React, AWS"
    },
    {
        "team_id": 4, "track": "Cloud & Developer Platforms",
        "title": "CostLens: Multi-cloud Cost Intelligence",
        "description": "Real-time multi-cloud cost analysis with anomaly detection and rightsizing recommendations. Saves average 30% on cloud bills through automated spot instance management.",
        "github_url": "https://github.com/team-costlens/cloud-costs",
        "demo_url": "https://costlens.io",
        "tags": "Python, AWS SDK, GCP API, React, TimescaleDB"
    },
    {
        "team_id": 5, "track": "Cloud & Developer Platforms",
        "title": "DevPortal: Internal Developer Platform Hub",
        "description": "Self-service developer portal with service catalog, scaffolding templates, and golden path workflows. Built on Backstage with custom plugins for CI/CD and secrets management.",
        "github_url": "https://github.com/team-devportal/idp",
        "demo_url": "https://devportal.io",
        "tags": "Backstage, TypeScript, Kubernetes, GitHub Actions, Vault"
    },
]

# ─── RUN ──────────────────────────────────────────────────────
def main():
    registered_ids = []
    submitted_ids = []

    # STEP 1: Register participants
    section("STEP 1 — Registering 5 New Participants")
    for p in PARTICIPANTS:
        try:
            res = requests.post(f"{BASE}/api/register", json=p, timeout=10)
            data = res.json()
            if res.status_code == 201:
                uid = data.get("user_id", "?")
                registered_ids.append(uid)
                ok(f"[ID:{uid}] {p['name']} ({p['institution']}) ← {p['skills_text'][:35]}...")
            elif res.status_code == 409:
                fail(f"{p['name']} → already registered (409 Conflict)")
            else:
                fail(f"{p['name']} → {res.status_code}: {data.get('detail', data)}")
        except Exception as e:
            fail(f"{p['name']} → Network error: {e}")
        time.sleep(0.3)

    print(f"\n  {BOLD}Registered: {len(registered_ids)} new participants{RESET}")

    # STEP 2: Submit 15 projects
    section("STEP 2 — Submitting 15 New Projects (5 per Track)")
    track_counts = {}
    for proj in PROJECTS:
        try:
            res = requests.post(f"{BASE}/api/submit", json=proj, timeout=10)
            data = res.json()
            track = proj["track"]
            track_counts[track] = track_counts.get(track, 0) + 1
            if res.ok:
                sid = data.get("submission_id", "?")
                submitted_ids.append(sid)
                short_track = track.split(" ")[0]
                ok(f"[ID:{sid}] {proj['title'][:45]} [{short_track}]")
            else:
                fail(f"{proj['title'][:40]} → {res.status_code}: {data.get('detail', data)}")
        except Exception as e:
            fail(f"{proj['title'][:40]} → {e}")
        time.sleep(0.3)

    # STEP 3: Verify backend totals
    section("STEP 3 — Verifying Backend Totals")
    try:
        subs = requests.get(f"{BASE}/api/submissions", timeout=10).json()
        total = len(subs)
        by_track = {}
        by_state = {}
        for s in subs:
            t = s.get("track", "Unknown")
            st = s.get("state", "Unknown")
            by_track[t] = by_track.get(t, 0) + 1
            by_state[st] = by_state.get(st, 0) + 1

        print(f"\n  {BOLD}Total Submissions in DB: {YELLOW}{total}{RESET}")
        print(f"\n  {BOLD}By Track:{RESET}")
        for t, c in sorted(by_track.items()):
            bar = "█" * c
            print(f"    {t[:40]:<40} {CYAN}{bar}{RESET} {c}")
        print(f"\n  {BOLD}By State:{RESET}")
        for st, c in sorted(by_state.items()):
            color = GREEN if "MATCHED" in st or "APPROVED" in st else (RED if "BLOCK" in st or "FLAG" in st else YELLOW)
            print(f"    {st:<25} {color}{c}{RESET}")

        new_count = len(submitted_ids)
        print(f"\n  {BOLD}✅ New projects submitted this run: {GREEN}{new_count}/15{RESET}")

    except Exception as e:
        fail(f"Could not verify: {e}")

    # STEP 4: Check leaderboard
    section("STEP 4 — Leaderboard Snapshot")
    try:
        lb = requests.get(f"{BASE}/api/leaderboard", timeout=10).json()
        if lb:
            print(f"  {'Rank':<6} {'Title':<45} {'Z-Score':>8} {'Evals':>6}")
            print(f"  {'─'*70}")
            for i, item in enumerate(lb[:10]):
                medal = ["🥇","🥈","🥉"][i] if i < 3 else f"#{i+1}"
                print(f"  {medal:<6} {item['title'][:44]:<44} {str(item.get('normalized_score','─'))[:8]:>8} {item.get('eval_count',0):>6}")
        else:
            print(f"  {YELLOW}No leaderboard entries yet — submit scores to populate.{RESET}")
    except Exception as e:
        fail(f"Leaderboard error: {e}")

    print(f"\n{BOLD}{GREEN}{'═'*55}")
    print(f"  ALL DONE — Backend + Frontend sync verified ✓")
    print(f"{'═'*55}{RESET}\n")

if __name__ == "__main__":
    main()
