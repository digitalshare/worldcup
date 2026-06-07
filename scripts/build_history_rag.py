#!/usr/bin/env python3
"""Build data/history_rag_docs.json — historical-stats docs for the `worldcup` RAG
collection, derived from data/history_matches.json + data/teams.json.

Produces two documents:
  - history-records: all-time men's World Cup record (P/W/D/L/GF/GA) for each of the
    48 teams in the 2026 field that has WC history.
  - history-h2h: head-to-head summaries between 2026 teams that have met at a World Cup,
    plus the full list of World Cup finals.
"""
import json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")


def main():
    matches = json.load(open(os.path.join(DATA, "history_matches.json"), encoding="utf-8"))
    teams = json.load(open(os.path.join(DATA, "teams.json"), encoding="utf-8"))
    code2name = {t["fifa_code"]: t["name"] for t in teams}
    field = set(code2name)  # the 48 codes in the 2026 field

    # All-time per-code aggregate
    agg = defaultdict(lambda: {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "years": set()})
    pair = defaultdict(lambda: {"p": 0, "a": 0, "b": 0, "d": 0, "ga": 0, "gb": 0, "list": []})
    finals = []
    for m in matches:
        for code, gf, ga in ((m["code_a"], m["score_a"], m["score_b"]), (m["code_b"], m["score_b"], m["score_a"])):
            s = agg[code]
            s["p"] += 1; s["gf"] += gf; s["ga"] += ga; s["years"].add(m["year"])
            if gf > ga: s["w"] += 1
            elif gf < ga: s["l"] += 1
            else: s["d"] += 1
        a, b = m["code_a"], m["code_b"]
        key = tuple(sorted((a, b)))
        p = pair[key]
        # normalize to key[0] perspective
        first_is_a = key[0] == a
        gf0 = m["score_a"] if first_is_a else m["score_b"]
        gf1 = m["score_b"] if first_is_a else m["score_a"]
        p["p"] += 1; p["ga"] += gf0; p["gb"] += gf1
        if gf0 > gf1: p["a"] += 1
        elif gf0 < gf1: p["b"] += 1
        else: p["d"] += 1
        p["list"].append(m)
        if m["stage"] == "Final":
            finals.append(m)

    # Doc 1: all-time records for 2026 teams
    lines = ["FIFA World Cup — all-time records of the 2026 qualified teams (men's, 1930–2022).",
             "Format: Team — appearances, played, won, drawn, lost, goals for, goals against.\n"]
    rows = []
    for code in field:
        if code in agg:
            s = agg[code]
            rows.append((s["w"], code, s))
    rows.sort(reverse=True)
    for _, code, s in rows:
        lines.append(f"{code2name[code]} ({code}): {len(s['years'])} tournaments, "
                     f"{s['p']} played, {s['w']}W {s['d']}D {s['l']}L, "
                     f"{s['gf']} goals for, {s['ga']} against.")
    no_hist = sorted(code2name[c] for c in field if c not in agg)
    if no_hist:
        lines.append("\nNo prior men's World Cup appearance: " + ", ".join(no_hist) + ".")
    doc_records = {"title": "World Cup all-time records (2026 teams)", "category": "history", "text": "\n".join(lines)}

    # Doc 2: head-to-head between 2026 teams + finals
    h2h_lines = ["FIFA World Cup head-to-head records between 2026 qualified teams (men's).\n"]
    pairs_in_field = []
    for key, p in pair.items():
        if key[0] in field and key[1] in field:
            pairs_in_field.append((p["p"], key, p))
    pairs_in_field.sort(reverse=True)
    for _, key, p in pairs_in_field:
        n0, n1 = code2name[key[0]], code2name[key[1]]
        years = ", ".join(str(m["year"]) for m in p["list"])
        h2h_lines.append(f"{n0} vs {n1}: {p['p']} meetings — {n0} {p['a']}W, {n1} {p['b']}W, {p['d']}D "
                         f"(goals {p['ga']}–{p['gb']}); years: {years}.")
    h2h_lines.append("\nWorld Cup finals (all years):")
    for m in sorted(finals, key=lambda x: x["year"]):
        h2h_lines.append(f"{m['year']}: {m['team_a']} {m['score_a']}–{m['score_b']} {m['team_b']}.")
    doc_h2h = {"title": "World Cup head-to-head & finals history", "category": "history", "text": "\n".join(h2h_lines)}

    out = [doc_records, doc_h2h]
    json.dump(out, open(os.path.join(DATA, "history_rag_docs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"wrote {len(out)} docs -> data/history_rag_docs.json")
    for d in out:
        print(f"  - {d['title']} ({len(d['text'])} chars)")


if __name__ == "__main__":
    main()
