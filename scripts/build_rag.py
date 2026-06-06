#!/usr/bin/env python3
"""Generate news rows + 6 RAG knowledge documents from local data."""
import json
from datetime import datetime
from collections import defaultdict

DATA = "/Users/cw/work/workshop/worldcup/data"
teams = json.load(open(f"{DATA}/teams.json"))
venues = json.load(open(f"{DATA}/venues.json"))
matches = json.load(open(f"{DATA}/matches.json"))

# ---------- NEWS (curated from Bright Data SERP) ----------
NEWS = [
    {"title": "News | FIFA World Cup 2026™ — official hub", "source": "fifa.com",
     "url": "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/news",
     "summary": "The official FIFA home for the latest news, interviews, key stats, fixtures and results for the FIFA World Cup 2026."},
    {"title": "2026 FIFA World Cup: Live Updates — Spain among the favorites", "source": "huffpost.com",
     "url": "https://www.huffpost.com/entry/2026-fifa-world-cup-live-updates_n_69e21c35e4b0b6f552b8c3b5",
     "summary": "The 2026 FIFA World Cup kicks off in June. The final will be held on July 19 at MetLife Stadium. Reigning European champions Spain are among the favorites."},
    {"title": "World Cup 2026: All the key dates from opening game to final", "source": "aljazeera.com",
     "url": "https://www.aljazeera.com/sports/2026/6/4/world-cup-2026-what-are-the-key-dates-from-the-opening-match-to-the-final",
     "summary": "June 11: Mexico vs South Africa opens the tournament in Mexico City. June 12: Canada vs Bosnia and Herzegovina and USA vs Paraguay. The final is on July 19."},
    {"title": "World Cup 2026: Latest News, Scores, Analysis", "source": "bbc.com",
     "url": "https://www.bbc.com/sport/football/world-cup",
     "summary": "BBC Sport coverage of the 2026 World Cup in North America: news, scores, tables, stats and expert analysis."},
    {"title": "World Cup 2026 fixture schedule and kick-off times — all 104 matches", "source": "skysports.com",
     "url": "https://www.skysports.com/football/news/11095/13481245",
     "summary": "A day-by-day breakdown of all 104 matches of the 37-day tournament, which kicks off in Mexico on June 11 and ends with the final at MetLife Stadium on July 19."},
    {"title": "World Cup 2026 Travel Guide: Where to Stay, What to Do", "source": "ticketmaster.com",
     "url": "https://blog.ticketmaster.com/world-cup-2026-travel-guide/",
     "summary": "Explore the 16 host cities by region, compare trip styles, and plan your World Cup 2026 trip across the USA, Canada and Mexico."},
    {"title": "2026 World Cup Ticket Prices by City", "source": "theworldcupguide.com",
     "url": "https://theworldcupguide.com/2026-world-cup-ticket-prices/",
     "summary": "Complete 2026 FIFA World Cup ticket prices for all 16 host cities, with pricing by match, date and category."},
    {"title": "2026 FIFA World Cup Schedule", "source": "espn.com",
     "url": "https://www.espn.com/soccer/schedule/_/league/fifa.world",
     "summary": "Full ESPN match schedule for the 2026 FIFA World Cup beginning Thursday, June 11, 2026."},
    {"title": "Mexico City | Host City Guide | FIFA World Cup 2026™", "source": "fifa.com",
     "url": "https://www.fifa.com/en/articles/world-cup-2026-host-city-mexico-city-guide",
     "summary": "Everything Mexico City offers this FIFA World Cup — the city has hosted two previous World Cup finals and opens the 2026 tournament at Estadio Azteca."},
    {"title": "FIFA World Cup 26 Los Angeles™ — eight matches incl. USMNT", "source": "losangelesfwc26.com",
     "url": "https://losangelesfwc26.com/",
     "summary": "Los Angeles (SoFi Stadium) will host eight matches for the FIFA World Cup 26, featuring the U.S. Men's National Team."},
]
PUB = "2026-06-05T12:00:00+00:00"
for n in NEWS:
    n["published_at"] = PUB
json.dump(NEWS, open(f"{DATA}/news.json", "w"), indent=2, ensure_ascii=False)

# ---------- helpers ----------
by_group = defaultdict(list)
for t in teams:
    by_group[t["group_letter"]].append(t)
for g in by_group:
    by_group[g].sort(key=lambda x: x["group_rank"])
name_by_group = {t["name"]: t["group_letter"] for t in teams}

def fmt_dt(iso):
    if not iso: return "TBD"
    d = datetime.fromisoformat(iso)
    return d.strftime("%b %d, %Y %H:%M UTC")

docs = []

# Doc 1: format & key dates
docs.append({"title": "Tournament format, key dates and how to follow", "category": "format", "text":
"""FIFA World Cup 2026 — Format and Key Dates.
The 2026 FIFA World Cup is the 23rd edition, co-hosted by the United States, Canada and Mexico from June 11 to July 19, 2026. It is the first World Cup with 48 teams (up from 32) and the first played across three nations, with 104 matches in total — the largest World Cup ever.
Format: The 48 teams are split into 12 groups of four (Groups A to L). Each team plays the other three in its group once. The top two from each group plus the eight best third-placed teams (32 teams total) advance to a Round of 32 knockout bracket, followed by the Round of 16, quarterfinals, semifinals, a third-place playoff and the final.
Key dates: Opening match June 11, 2026 — Mexico vs South Africa at Estadio Azteca, Mexico City. Group stage June 11–27. Round of 32 June 28 – July 3. Round of 16 July 4–7. Quarterfinals July 9–11. Semifinals July 14–15. Third-place playoff July 18 at Hard Rock Stadium, Miami. Final July 19, 2026 at MetLife Stadium, New York/New Jersey.
Knockout rules: If a knockout match is level after 90 minutes, 30 minutes of extra time are played, then a penalty shootout if still tied.
How to follow: Matches are broadcast by FIFA's partners worldwide (including FOX and Telemundo in the US, BBC and ITV in the UK). Live scores, standings and fixtures are on FIFA.com and major sports outlets."""})

# Doc 2: teams & groups
lines = ["FIFA World Cup 2026 — Teams and Groups (the final draw).",
         "There are 48 qualified teams across 12 groups (A–L), four teams per group. Seeding order shown.\n"]
for g in "ABCDEFGHIJKL":
    ts = by_group[g]
    lines.append(f"Group {g}: " + "; ".join(
        f"{t['name']} ({t['confederation']}, approx. FIFA rank #{t['fifa_ranking']})" for t in ts) + ".")
notable = ("Reigning European champions Spain, plus Argentina (holders), France, England, Brazil, "
           "Portugal, Germany and the Netherlands are among the favorites. Debutants include Cape Verde, "
           "Curaçao, Jordan and Uzbekistan. Notable absentees who failed to qualify include Italy.")
lines.append("\n" + notable)
docs.append({"title": "Teams and groups — all 48 qualified nations", "category": "teams", "text": "\n".join(lines)})

# Doc 3: full schedule
sl = ["FIFA World Cup 2026 — Full Match Schedule (all 104 matches, times in UTC).\n"]
stage_name = {"group":"Group Stage","r32":"Round of 32","r16":"Round of 16","qf":"Quarterfinal","sf":"Semifinal","third_place":"Third-place playoff","final":"Final"}
for m in matches:
    home = m["home"]; away = m["away"]
    g = f" (Group {name_by_group[home]})" if m["stage"]=="group" else ""
    sl.append(f"Match {m['match_number']} — {stage_name[m['stage']]}{g}: {home} vs {away}, "
              f"{fmt_dt(m['kickoff_utc'])}, {m['venue_stadium']} ({m['venue_city']}).")
docs.append({"title": "Full match schedule — all 104 fixtures", "category": "schedule", "text": "\n".join(sl)})

# Doc 4: venues
vl = ["FIFA World Cup 2026 — Venues and Host Cities (16 stadiums across 3 countries).\n"]
for v in sorted(venues, key=lambda x: -x["capacity"]):
    vl.append(f"{v['name']} — {v['city']}, {v['country']}. Capacity {v['capacity']:,}. {v['description']}")
docs.append({"title": "Venues and host cities — all 16 stadiums", "category": "venues", "text": "\n".join(vl)})

# Doc 5: FAQ
docs.append({"title": "Fan FAQ — tickets, travel and watching", "category": "faq", "text":
"""FIFA World Cup 2026 — Fan FAQ.
Where is it held? Across 16 host cities in three countries: 11 in the United States (Atlanta, Boston/Foxborough, Dallas/Arlington, Houston, Kansas City, Los Angeles/Inglewood, Miami, New York/New Jersey, Philadelphia, San Francisco Bay Area, Seattle), 3 in Mexico (Mexico City, Guadalajara, Monterrey) and 2 in Canada (Toronto, Vancouver).
When is it? June 11 to July 19, 2026.
Which stadium hosts the final? MetLife Stadium in East Rutherford, New Jersey (New York/New Jersey), on July 19, 2026.
Which stadium hosts the opening match? Estadio Azteca in Mexico City, on June 11, 2026 (Mexico vs South Africa).
How many teams and matches? 48 teams and 104 matches.
Tickets: Sold through FIFA's official ticketing platform and hospitality packages; prices vary by city, match and category. Beware of unofficial resellers.
Travel: Plan around regional clusters (West, Central, East) to reduce travel between matches; the host cities span four time zones.
Watching: Check local broadcasters (e.g., FOX/Telemundo in the US, BBC/ITV in the UK) and FIFA.com for live scores and fixtures."""})

# Doc 6: news
nl = ["FIFA World Cup 2026 — Recent News Headlines (as of early June 2026).\n"]
for n in NEWS:
    nl.append(f"{n['title']} ({n['source']}): {n['summary']}")
docs.append({"title": "Recent news headlines", "category": "news", "text": "\n".join(nl)})

json.dump(docs, open(f"{DATA}/rag_docs.json", "w"), indent=2, ensure_ascii=False)
print(f"news rows: {len(NEWS)}")
print(f"rag docs: {len(docs)}")
for d in docs:
    print(f"  - [{d['category']}] {d['title']} ({len(d['text'])} chars)")