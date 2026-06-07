#!/usr/bin/env python3
"""Insert the 104 matches, resolving FK ids from already-inserted teams/venues."""
import json, os, urllib.request, urllib.error

API = "https://api.butterbase.ai/v1/app_g29dn25c99ke"
DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f"{API}{path}", data=data, method=method,
                               headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

_, teams = req("GET", "/teams?select=id,name&limit=100")
team_id = {t["name"]: t["id"] for t in teams}
team_group = {t["name"]: None for t in teams}
_, full = req("GET", "/teams?select=name,group_letter&limit=100")
team_group = {t["name"]: t["group_letter"] for t in full}
_, venues = req("GET", "/venues?select=id,name&limit=100")
venue_id = {v["name"]: v["id"] for v in venues}
venue_id["Toronto Stadium"] = venue_id["BMO Field"]
print(f"teams={len(team_id)} venues={len(venues)}")

matches = json.load(open(f"{DATA}/matches.json"))
ok = 0; errs = []
for m in matches:
    row = {
        "match_number": m["match_number"], "stage": m["stage"],
        "kickoff_utc": m["kickoff_utc"], "venue_id": venue_id.get(m["venue_stadium"]),
        "status": "scheduled",
    }
    if m["stage"] == "group":
        row["home_team_id"] = team_id[m["home"]]
        row["away_team_id"] = team_id[m["away"]]
        row["group_letter"] = team_group[m["home"]]
    else:
        row["home_placeholder"] = m["home"]
        row["away_placeholder"] = m["away"]
    st, resp = req("POST", "/matches", row)
    if st in (200, 201): ok += 1
    else: errs.append((m["match_number"], st, resp))
print(f"inserted matches: {ok}/104")
for e in errs[:5]: print("ERR", e)