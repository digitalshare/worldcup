#!/usr/bin/env python3
"""Build data/history_matches.json — every men's FIFA World Cup match (1930–2022).

Source: "The World Cup Database" by Joshua C. Fjelstul (CC-BY), vendored at
data/source/worldcup_matches.csv from
https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/matches.csv

The dataset uses ISO-3166 alpha-3 codes; we remap them to the FIFA codes used in
data/teams.json (CODE_MAP) so the frontend can match a 2026 team to its history by
fifa_code. Historical entities are mapped to their FIFA successor where one plays in
2026 (e.g. Czechoslovakia -> Czech Republic). Teams with no 2026 successor keep their
own code and simply won't match any 2026 card.
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "source", "worldcup_matches.csv")
OUT = os.path.join(ROOT, "data", "history_matches.json")

# dataset (ISO) code -> current FIFA code in data/teams.json
CODE_MAP = {
    "DZA": "ALG",  # Algeria
    "HRV": "CRO",  # Croatia
    "CHE": "SUI",  # Switzerland
    "DEU": "GER",  # Germany (also West Germany in this dataset)
    "NLD": "NED",  # Netherlands
    "PRT": "POR",  # Portugal
    "URY": "URU",  # Uruguay
    "PRY": "PAR",  # Paraguay
    "ZAF": "RSA",  # South Africa
    "SAU": "KSA",  # Saudi Arabia
    "HTI": "HAI",  # Haiti
    "CSK": "CZE",  # Czechoslovakia -> Czech Republic
    # legacy successors (not in 2026, mapped for data quality)
    "SUN": "RUS",  # Soviet Union -> Russia
    "YUG": "SRB",  # Yugoslavia -> Serbia
    "SCG": "SRB",  # Serbia and Montenegro -> Serbia
}

# Compact, readable stage label keyed off the dataset's stage/round names.
def norm_stage(r):
    s = (r.get("stage_name") or "").strip().lower()
    g = (r.get("group_name") or "").strip()
    if "group" in s or s in ("first round", "second round", "first group stage", "second group stage"):
        return f"Group stage" + (f" ({g})" if g else "")
    if "round of 16" in s:
        return "Round of 16"
    if "quarter" in s:
        return "Quarter-final"
    if "semi" in s:
        return "Semi-final"
    if "third" in s or "play-off for third" in s:
        return "Third-place play-off"
    if s == "final":
        return "Final"
    # fall back to a title-cased version of whatever the dataset has
    return r.get("stage_name", "").strip().title() or "Match"


def main():
    rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
    out = []
    for r in rows:
        if "Men" not in r["tournament_name"]:
            continue
        try:
            sa = int(r["home_team_score"])
            sb = int(r["away_team_score"])
        except (ValueError, KeyError):
            continue
        year = int(r["tournament_id"].split("-")[1])  # WC-1930 -> 1930
        ca = CODE_MAP.get(r["home_team_code"], r["home_team_code"])
        cb = CODE_MAP.get(r["away_team_code"], r["away_team_code"])
        out.append({
            "year": year,
            "stage": norm_stage(r),
            "match_date": r.get("match_date") or None,
            "team_a": r["home_team_name"],
            "code_a": ca,
            "score_a": sa,
            "team_b": r["away_team_name"],
            "code_b": cb,
            "score_b": sb,
        })
    out.sort(key=lambda m: (m["year"], m["match_date"] or ""))
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"wrote {len(out)} matches -> {OUT}")
    yrs = sorted({m['year'] for m in out})
    print(f"years: {yrs[0]}–{yrs[-1]} ({len(yrs)} tournaments)")


if __name__ == "__main__":
    main()
