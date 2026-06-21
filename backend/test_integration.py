import requests
import time
import sys

API_BASE = "http://localhost:8000"

def run_tests():
    print("--- 1. Seeding database with judges and teams ---")
    t_suffix = str(int(time.time()))
    
    # Register Judges
    j1 = requests.post(f"{API_BASE}/api/users/register", json={
        "email": f"strict_hawk_{t_suffix}@judges.com",
        "full_name": "Dr. Hawk",
        "role": "JUDGE"
    })
    j2 = requests.post(f"{API_BASE}/api/users/register", json={
        "email": f"moderate_{t_suffix}@judges.com",
        "full_name": "Prof. Mod",
        "role": "JUDGE"
    })
    
    print("User 1 status:", j1.status_code, j1.text)
    print("User 2 status:", j2.status_code, j2.text)
    
    judge1_id = None
    if j1.status_code == 200:
        j1_profile = requests.post(f"{API_BASE}/api/judges/register", json={
            "user_id": j1.json()["id"],
            "bio": "Strict criteria, focusing on code quality and technical details.",
            "max_projects": 3
        }).json()
        print("Judge 1 Profile:", j1_profile)
        judge1_id = j1_profile["id"]
        
    if j2.status_code == 200:
        j2_profile = requests.post(f"{API_BASE}/api/judges/register", json={
            "user_id": j2.json()["id"],
            "bio": "Moderate evaluation covering implementation depth and product pitch.",
            "max_projects": 3
        }).json()
        print("Judge 2 Profile:", j2_profile)

    # Register Teams
    t1 = requests.post(f"{API_BASE}/api/teams/register", json={"name": f"Team 101_{t_suffix}"}).json()
    t2 = requests.post(f"{API_BASE}/api/teams/register", json={"name": f"Team 102_{t_suffix}"}).json()
    print("Registered teams:", t1, t2)
    
    t1_id = t1["id"]
    t2_id = t2["id"]

    # Unique abstract for this run
    abstract_text = f"An autonomous drone dispatch platform written in Go to coordinate vaccine distributions in emergency response scenarios. Time token: {t_suffix}."

    print("--- 2. Submitting Project 1 (Unique) ---")
    sub1_res = requests.post(f"{API_BASE}/api/submissions/submit", json={
        "team_id": t1_id,
        "title": f"Drone Dispatcher Go {t_suffix}",
        "abstract": abstract_text,
        "tech_stack": "Go, Docker, Kubernetes, WebAssembly"
    })
    if sub1_res.status_code != 200:
        print(f"Error submitting Project 1: {sub1_res.text}")
        sys.exit(1)
        
    p1 = sub1_res.json()
    print(f"Project 1 registered successfully: ID {p1['id']}")

    print("Waiting 3 seconds for LangGraph pipeline to execute node transitions...")
    time.sleep(3)

    # Check state
    p1_check = requests.get(f"{API_BASE}/api/submissions/{p1['id']}").json()
    print(f"Project 1 state after pipeline: {p1_check['state']}")

    print("--- 3. Submitting Project 2 (Duplicate Abstract) ---")
    sub2_res = requests.post(f"{API_BASE}/api/submissions/submit", json={
        "team_id": t2_id,
        "title": f"Duplicate Drone Dispatcher {t_suffix}",
        "abstract": abstract_text, # exact same abstract text
        "tech_stack": "Go, Docker, Kubernetes, WebAssembly"
    })
    if sub2_res.status_code != 200:
        print(f"Error submitting Project 2: {sub2_res.text}")
        sys.exit(1)
        
    p2 = sub2_res.json()
    print(f"Project 2 registered successfully: ID {p2['id']}")

    print("Waiting 3 seconds for DBSCAN duplicate check pipeline to run...")
    time.sleep(3)

    p2_check = requests.get(f"{API_BASE}/api/submissions/{p2['id']}").json()
    print(f"Project 2 state after pipeline: {p2_check['state']}")
    assert p2_check['state'] == "FLAGGED_DUPLICATE", f"Expected FLAGGED_DUPLICATE but got {p2_check['state']}"

    print("--- 4. Performing HITL Override to Approve Project 2 ---")
    override_res = requests.patch(f"{API_BASE}/api/submissions/{p2['id']}/override", json={
        "action": "APPROVE_OVERRIDE"
    })
    if override_res.status_code != 200:
        print(f"Override failed: {override_res.text}")
        sys.exit(1)
        
    p2_overridden = override_res.json()
    print(f"Project 2 state after override: {p2_overridden['state']}")
    assert p2_overridden['state'] == "APPROVED"

    print("--- 5. Simulating Judge Scoring & Normalization ---")
    if judge1_id is None:
        judge1_id = 1

    score_res = requests.post(f"{API_BASE}/api/scores/submit", json={
        "judge_id": judge1_id,
        "project_id": p2['id'],
        "criteria_scores": {"innovation": 8.0},
        "raw_score": 8.0
    })
    if score_res.status_code != 200:
        print(f"Score submission failed: {score_res.text}")
        sys.exit(1)
    
    score_data = score_res.json()
    print(f"Score submitted. Raw: {score_data['raw_score']}, Normalized: {score_data['normalized_score']}")

    # Get leaderboard
    leaderboard = requests.get(f"{API_BASE}/api/leaderboard").json()
    print("Leaderboard:")
    for item in leaderboard:
        print(f"- ID {item['project_id']} ({item['title']}): Normalized={item['normalized_score']}, Raw Avg={item['raw_average']}")

    print("\nALL INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
