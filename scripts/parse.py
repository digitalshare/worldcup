#!/usr/bin/env python3
import re, json, sys
from datetime import datetime, timedelta, timezone

SRC = "/Users/cw/.claude/projects/-Users-cw-work-workshop-worldcup/ea734463-45c5-4e16-b458-645be02a8994/tool-results/mcp-brightdata-scrape_as_markdown-1780702108100.txt"
OUT = "/Users/cw/work/workshop/worldcup/data"

with open(SRC, encoding="utf-8") as f:
    raw_lines = [l.rstrip("\n") for l in f]

# normalize non-breaking spaces, strip; build list of stripped lines
lines = [l.replace("\xa0", " ").replace(" ", " ").strip() for l in raw_lines]

link_re = re.compile(r"\[([^\]]+)\]\((/wiki/[^)]*)\)")
date_re = re.compile(r"^[A-Z][a-z]+ \d{1,2}, \d{4} \((\d{4}-\d{2}-\d{2})\)$")
time_re = re.compile(r"^(\d{1,2}):(\d{2})\s*([ap])\.m\.\s*\[UTC([−\-+])(\d{1,2})")
match_re = re.compile(r"^\[Match (\d+)\]\(")

def is_team_link(s):
    m = link_re.match(s)
    if not m:
        return None
    href = m.group(2)
    if "national" in href and ("football_team" in href or "soccer_team" in href):
        return m.group(1).strip()
    return None

def prev_nonblank(i):
    j = i - 1
    while j >= 0 and lines[j] == "":
        j -= 1
    return j

def next_nonblank(i):
    j = i + 1
    while j < len(lines) and lines[j] == "":
        j += 1
    return j

# ---- Parse groups (teams in seed order) ----
groups = {}
group_hdr_re = re.compile(r"^Group ([A-L])$")
# find group header line indices in the group-stage region (before "Knockout stage")
knock_idx = next(i for i, l in enumerate(lines) if l == "Knockout stage")
group_positions = [(i, group_hdr_re.match(l).group(1)) for i, l in enumerate(lines)
                   if i < knock_idx and group_hdr_re.match(l)]
for k, (idx, letter) in enumerate(group_positions):
    end = group_positions[k + 1][0] if k + 1 < len(group_positions) else knock_idx
    # first date line marks start of matches; teams listed before it
    teams = []
    for j in range(idx + 1, end):
        if date_re.match(lines[j]):
            break
        t = is_team_link(lines[j])
        if t and t not in teams:
            teams.append(t)
        if len(teams) == 4:
            break
    groups[letter] = teams

# ---- Parse all matches via [Match N] anchors ----
def parse_slot(i):
    """Return ('team', name) or ('placeholder', text) for line index i."""
    t = is_team_link(lines[i])
    if t:
        return ("team", t)
    # placeholder plain text (strip any wiki links to plain words)
    txt = link_re.sub(lambda m: m.group(1), lines[i]).strip()
    return ("placeholder", txt)

def venue_from(i):
    # venue line: "[Stadium](...), [City](...)" possibly
    parts = link_re.findall(lines[i])
    if parts:
        stadium = parts[0][0].replace("\\", "")
        city = parts[1][0].replace("\\", "") if len(parts) > 1 else None
        return stadium, city
    return None, None

def to_utc(date_str, hh, mm, ampm, sign, off):
    h = hh % 12
    if ampm == "p":
        h += 12
    local = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=h, minute=mm)
    delta = timedelta(hours=off)
    # local = UTC + offset(sign). UTC = local - sign*offset
    if sign in ("−", "-"):
        utc = local + delta  # UTC-6 -> add 6
    else:
        utc = local - delta
    return utc.replace(tzinfo=timezone.utc).isoformat()

def stage_for(n):
    if n <= 72: return "group"
    if n <= 88: return "r32"
    if n <= 96: return "r16"
    if n <= 100: return "qf"
    if n <= 102: return "sf"
    if n == 103: return "third_place"
    return "final"

matches = []
for i, l in enumerate(lines):
    m = match_re.match(l)
    if not m:
        continue
    num = int(m.group(1))
    home_i = prev_nonblank(i)
    away_i = next_nonblank(i)
    time_i = prev_nonblank(home_i)
    date_i = prev_nonblank(time_i)
    report_i = next_nonblank(away_i)
    venue_i = next_nonblank(report_i)

    dm = date_re.match(lines[date_i])
    tm = time_re.match(lines[time_i])
    if not dm:
        # date/time may be arranged differently; skip cleanly
        sys.stderr.write(f"match {num}: no date at {date_i}: {lines[date_i]!r}\n")
        continue
    date_str = dm.group(1)
    kickoff = None
    if tm:
        kickoff = to_utc(date_str, int(tm.group(1)), int(tm.group(2)),
                         tm.group(3), tm.group(4), int(tm.group(5)))
    home_kind, home_val = parse_slot(home_i)
    away_kind, away_val = parse_slot(away_i)
    stadium, city = venue_from(venue_i)
    matches.append({
        "match_number": num,
        "stage": stage_for(num),
        "date": date_str,
        "kickoff_utc": kickoff,
        "home_kind": home_kind, "home": home_val,
        "away_kind": away_kind, "away": away_val,
        "venue_stadium": stadium, "venue_city": city,
    })

matches.sort(key=lambda x: x["match_number"])

with open(f"{OUT}/groups.json", "w") as f:
    json.dump(groups, f, indent=2, ensure_ascii=False)
with open(f"{OUT}/matches.json", "w") as f:
    json.dump(matches, f, indent=2, ensure_ascii=False)

# Report
all_teams = sorted({t for ts in groups.values() for t in ts})
print(f"groups: {len(groups)}  teams: {len(all_teams)}")
for L in "ABCDEFGHIJKL":
    print(f"  {L}: {groups.get(L)}")
print(f"matches parsed: {len(matches)}")
from collections import Counter
print("by stage:", dict(Counter(m['stage'] for m in matches)))
print("sample match 1:", json.dumps(matches[0], ensure_ascii=False))
print("sample match 73:", json.dumps(next(m for m in matches if m['match_number']==73), ensure_ascii=False))
print("sample match 104:", json.dumps(matches[-1], ensure_ascii=False))
print("\nALL TEAMS:", all_teams)