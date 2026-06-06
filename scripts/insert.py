#!/usr/bin/env python3
"""Insert teams and matches into Butterbase via the data API (per-row POST)."""
import json, urllib.request, urllib.parse

API = "https://api.butterbase.ai/v1/app_g29dn25c99ke"
DATA = "/Users/cw/work/workshop/worldcup/data"

def req(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={"Content-Type": "application/json",
                                        "Prefer": "return=representation"})
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]

def post(table, row):
    return req("POST", f"/{table}", row)

def get(path):
    return req("GET", path)

# --- clean up any stray test rows ---
_, news = get("/news?select=id,title")
for n in (news or []):
    if n["title"] == "__write_test__":
        st, _ = req("DELETE", f"/news/{n['id']}")
        print(f"deleted stray test row: {st}")

# --- insert teams ---
teams = json.load(open(f"{DATA}/teams.json"))
team_id = {}
for t in teams:
    st, row = post("teams", t)
    rec = row[0] if isinstance(row, list) else row
    team_id[t["name"]] = rec["id"]
print(f"inserted teams: {len(team_id)}")

# --- venue map ---
_, venues = get("/venues?select=id,name")
venue_id = {v["name"]: v["id"] for v in venues}
venue_id["Toronto Stadium"] = venue_id["BMO Field"]  # FIFA-name alias used in bracket
print(f"venues: {len(venues)}")

# --- group lookup for group_letter on group matches ---
team_group = {t["name"]: t["group_letter"] for t in teams}

# --- insert matches ---
matches = json.load(open(f"{DATA}/matches.json"))
inserted = 0
unresolved_venues = set()
for m in matches:
    vid = venue_id.get(m["venue_stadium"])
    if vid is None:
        unresolved_venues.add(m["venue_stadium"])
    row = {
        "match_number": m["match_number"],
        "stage": m["stage"],
        "kickoff_utc": m["kickoff_utc"],
        "venue_id": vid,
        "status": "scheduled",
    }
    if m["stage"] == "group":
        row["home_team_id"] = team_id[m["home"]]
        row["away_team_id"] = team_id[m["away"]]
        row["group_letter"] = team_group[m["home"]]
    else:
        row["home_placeholder"] = m["home"]
        row["away_placeholder"] = m["away"]
    st, _ = post("matches", row)
    if st in (200, 201):
        inserted += 1
print(f"inserted matches: {inserted}")
if unresolved_venues:
    print("UNRESOLVED VENUES:", unresolved_venues)

# save team_id map for later (players, rag)
json.dump(team_id, open(f"{DATA}/team_ids.json", "w"), indent=2, ensure_ascii=False)
json.dump(venue_id, open(f"{DATA}/venue_ids.json", "w"), indent=2, ensure_ascii=False)