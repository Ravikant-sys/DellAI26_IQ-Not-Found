import asyncio
import json
import time
import requests
import websockets
import sys

API_BASE = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

async def listen_ws():
    print("[WS Client] Connecting to WebSocket log stream...")
    try:
        async with websockets.connect(WS_URL) as websocket:
            print("[WS Client] Connected successfully!")
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                event_type = data.get("event_type", "log")
                text = data.get("text", "")
                print(f"[WS Event: {event_type.upper()}] {text}")
    except asyncio.CancelledError:
        print("[WS Client] Connection closed (cancelled).")
    except Exception as e:
        print(f"[WS Client] Error: {e}")

async def run_simulation():
    # Use timestamp to avoid database unique constraint conflicts
    t_suffix = str(int(time.time()))
    
    # 1. Start the WebSocket listener in the background
    listener_task = asyncio.create_task(listen_ws())
    
    # Wait for websocket connection to establish
    await asyncio.sleep(2)
    
    print("\n=== STEP 1: Registering Participant Team ===")
    team_name = f"Team Web3 Pioneers {t_suffix}"
    repo_url = "https://github.com/web3pioneers/oracle-project"
    print(f"Registering team: {team_name}")
    
    team_res = requests.post(f"{API_BASE}/api/teams/register", json={
        "name": team_name,
        "repo_url": repo_url
    })
    if team_res.status_code != 200:
        print(f"Failed to register team: {team_res.text}")
        listener_task.cancel()
        return
        
    team_id = team_res.json()["id"]
    print(f"Team registered with ID: {team_id}")
    await asyncio.sleep(1)

    print("\n=== STEP 2: Submitting a Unique Project Abstract ===")
    abstract_text = (
        f"A highly scalable decentralized oracle database coordinator that aggregates API feeds "
        f"and resolves consensus disputes via secure zero-knowledge state proofs. Timestamp: {t_suffix}"
    )
    print("Submitting unique project...")
    sub1_res = requests.post(f"{API_BASE}/api/submissions/submit", json={
        "team_id": team_id,
        "title": f"ZKP Oracle Coordinator {t_suffix}",
        "abstract": abstract_text,
        "tech_stack": "Rust, ZKP, Solidity, WASM",
        "track": "Web3 & Decentralized Systems"
    })
    if sub1_res.status_code != 200:
        print(f"Failed to submit Project 1: {sub1_res.text}")
        listener_task.cancel()
        return
        
    p1_id = sub1_res.json()["id"]
    print(f"Project 1 submitted. ID: {p1_id}")
    
    # Wait for the LangGraph agent pipeline to finish processing
    print("Waiting 5 seconds for pipeline processing...")
    await asyncio.sleep(5)

    print("\n=== STEP 3: Submitting a Duplicate Abstract (DBSCAN Alert) ===")
    # Register another team
    team2_name = f"Team Swarm Plagiarists {t_suffix}"
    team2_res = requests.post(f"{API_BASE}/api/teams/register", json={
        "name": team2_name
    }).json()
    team2_id = team2_res["id"]
    
    print("Submitting duplicate abstract with high similarity...")
    sub2_res = requests.post(f"{API_BASE}/api/submissions/submit", json={
        "team_id": team2_id,
        "title": f"Oracle Plagiarized Clone {t_suffix}",
        "abstract": abstract_text, # exact same abstract
        "tech_stack": "Rust, ZKP, Solidity, WASM",
        "track": "Web3 & Decentralized Systems"
    })
    if sub2_res.status_code != 200:
        print(f"Failed to submit Project 2: {sub2_res.text}")
        listener_task.cancel()
        return
        
    p2_id = sub2_res.json()["id"]
    print(f"Project 2 submitted. ID: {p2_id}")
    
    print("Waiting 5 seconds for duplicate detection pipeline...")
    await asyncio.sleep(5)
    
    # Verify state of Project 2
    p2_check = requests.get(f"{API_BASE}/api/submissions/{p2_id}").json()
    print(f"Project 2 state is: {p2_check['state']}")
    
    print("\n=== STEP 4: Executing Human-in-the-Loop Override ===")
    print(f"Approving override for project ID: {p2_id}...")
    override_res = requests.patch(f"{API_BASE}/api/submissions/{p2_id}/override", json={
        "action": "APPROVE_OVERRIDE"
    })
    if override_res.status_code != 200:
        print(f"Override failed: {override_res.text}")
        listener_task.cancel()
        return
    print("Override execution successful!")
    await asyncio.sleep(2)

    print("\n=== STEP 5: Casting Raw Score as a Judge to Trigger Bias Alerts ===")
    # We want to cast a score of 1.0 by Judge 1 (average is ~5.5)
    # on our Project 1 (ZKP Oracle Coordinator), which has stack Rust, ZKP, Solidity, WASM.
    # Judge 1's bio is AI/ML, and they don't have expertise in Web3.
    # Since 1.0 < (5.5 - 2.5) = 3.0, this will trigger Tech Stack Bias!
    # We pass all three criteria to ensure raw score is exactly 1.0.
    print("Casting low score (1.0) by Judge 1 (Dr. Hawk) on Project 1 to trigger Tech Stack Bias...")
    score_res = requests.post(f"{API_BASE}/api/scores/submit", json={
        "judge_id": 1,
        "project_id": p1_id,
        "criteria_scores": {
            "Innovation": 1.0,
            "Feasibility": 1.0,
            "Technical Complexity": 1.0
        },
        "raw_score": 1.0
    })
    if score_res.status_code != 200:
        print(f"Score submission failed: {score_res.text}")
        listener_task.cancel()
        return
    print("Score submission complete!")
    await asyncio.sleep(3)

    print("\n=== STEP 6: Resolving a Bias Alert ===")
    # Retrieve all current bias alerts
    alerts_res = requests.get(f"{API_BASE}/api/bias-alerts")
    if alerts_res.status_code != 200:
        print("Failed to fetch bias alerts.")
        listener_task.cancel()
        return
        
    alerts = alerts_res.json()
    print(f"Current active bias alerts ({len(alerts)}):")
    for alert in alerts:
        print(f"- Alert ID {alert['id']}: {alert['details']} (State: {alert['action']})")
        
    # Find our new alert or resolve the first active one
    target_alert_id = None
    for alert in alerts:
        if alert["action"] == "BIAS_ALERT":
            target_alert_id = alert["id"]
            break
            
    if target_alert_id is not None:
        print(f"\nResolving Bias Alert ID: {target_alert_id}...")
        resolve_res = requests.patch(f"{API_BASE}/api/bias-alerts/{target_alert_id}/resolve")
        if resolve_res.status_code != 200:
            print(f"Failed to resolve alert: {resolve_res.text}")
        else:
            print(f"Resolution response: {resolve_res.json()}")
    else:
        print("No active bias alerts found to resolve.")
        
    await asyncio.sleep(2)
    
    # Cancel the listener and end
    listener_task.cancel()
    await listener_task

if __name__ == "__main__":
    asyncio.run(run_simulation())
