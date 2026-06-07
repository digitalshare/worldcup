#!/usr/bin/env python3
"""Insert data/history_matches.json into the Butterbase `history_matches` table.

RLS blocks anonymous writes, so this needs a service key. Provide it via env:

    BUTTERBASE_API_KEY=bb_sk_... python3 scripts/insert_history.py

(The live Milestone-2 load was performed via the Butterbase MCP `seed_database`
tool; this script is the reproducible, key-based equivalent.)
"""
import json, os, sys, time, urllib.request, urllib.error

API = os.environ.get("BUTTERBASE_API_URL", "https://api.butterbase.ai/v1/app_g29dn25c99ke")
KEY = os.environ.get("BUTTERBASE_API_KEY")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")


def post(path, body):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if KEY:
        headers["Authorization"] = f"Bearer {KEY}"
    r = urllib.request.Request(f"{API}/{path}", data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def main():
    if not KEY:
        print("WARNING: BUTTERBASE_API_KEY not set — anonymous writes are blocked by RLS.", file=sys.stderr)
    rows = json.load(open(os.path.join(DATA, "history_matches.json"), encoding="utf-8"))
    ok, errs = 0, []
    for i, m in enumerate(rows, 1):
        st, err = post("history_matches", m)
        if st in (200, 201):
            ok += 1
        else:
            errs.append((i, st, err))
        if i % 100 == 0:
            print(f"  {i}/{len(rows)} (ok={ok})")
            time.sleep(0.05)
    print(f"inserted {ok}/{len(rows)} history matches")
    for e in errs[:5]:
        print("ERR", e)


if __name__ == "__main__":
    main()
