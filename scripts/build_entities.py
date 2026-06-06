#!/usr/bin/env python3
"""Combine parsed groups/matches with curated metadata -> teams.json, venues.json."""
import json

OUT = "/Users/cw/work/workshop/worldcup/data"
with open(f"{OUT}/groups.json") as f:
    groups = json.load(f)

# name -> (fifa_code, iso2_for_flag, confederation, approx_fifa_ranking)
# Rankings are approximate (late-2025) reference values.
TEAM_META = {
    "Mexico": ("MEX", "mx", "CONCACAF", 14),
    "South Africa": ("RSA", "za", "CAF", 56),
    "South Korea": ("KOR", "kr", "AFC", 23),
    "Czech Republic": ("CZE", "cz", "UEFA", 43),
    "Canada": ("CAN", "ca", "CONCACAF", 25),
    "Bosnia and Herzegovina": ("BIH", "ba", "UEFA", 47),
    "Qatar": ("QAT", "qa", "AFC", 35),
    "Switzerland": ("SUI", "ch", "UEFA", 16),
    "Brazil": ("BRA", "br", "CONMEBOL", 5),
    "Morocco": ("MAR", "ma", "CAF", 11),
    "Haiti": ("HAI", "ht", "CONCACAF", 83),
    "Scotland": ("SCO", "gb-sct", "UEFA", 39),
    "United States": ("USA", "us", "CONCACAF", 15),
    "Paraguay": ("PAR", "py", "CONMEBOL", 38),
    "Australia": ("AUS", "au", "AFC", 26),
    "Turkey": ("TUR", "tr", "UEFA", 27),
    "Germany": ("GER", "de", "UEFA", 9),
    "Curaçao": ("CUW", "cw", "CONCACAF", 82),
    "Ivory Coast": ("CIV", "ci", "CAF", 40),
    "Ecuador": ("ECU", "ec", "CONMEBOL", 24),
    "Netherlands": ("NED", "nl", "UEFA", 6),
    "Japan": ("JPN", "jp", "AFC", 17),
    "Sweden": ("SWE", "se", "UEFA", 33),
    "Tunisia": ("TUN", "tn", "CAF", 41),
    "Belgium": ("BEL", "be", "UEFA", 8),
    "Egypt": ("EGY", "eg", "CAF", 32),
    "Iran": ("IRN", "ir", "AFC", 20),
    "New Zealand": ("NZL", "nz", "OFC", 85),
    "Spain": ("ESP", "es", "UEFA", 2),
    "Cape Verde": ("CPV", "cv", "CAF", 70),
    "Saudi Arabia": ("KSA", "sa", "AFC", 60),
    "Uruguay": ("URU", "uy", "CONMEBOL", 13),
    "France": ("FRA", "fr", "UEFA", 3),
    "Senegal": ("SEN", "sn", "CAF", 18),
    "Iraq": ("IRQ", "iq", "AFC", 58),
    "Norway": ("NOR", "no", "UEFA", 28),
    "Argentina": ("ARG", "ar", "CONMEBOL", 1),
    "Algeria": ("ALG", "dz", "CAF", 36),
    "Austria": ("AUT", "at", "UEFA", 22),
    "Jordan": ("JOR", "jo", "AFC", 62),
    "Portugal": ("POR", "pt", "UEFA", 7),
    "DR Congo": ("COD", "cd", "CAF", 57),
    "Uzbekistan": ("UZB", "uz", "AFC", 55),
    "Colombia": ("COL", "co", "CONMEBOL", 12),
    "England": ("ENG", "gb-eng", "UEFA", 4),
    "Croatia": ("CRO", "hr", "UEFA", 10),
    "Ghana": ("GHA", "gh", "CAF", 42),
    "Panama": ("PAN", "pa", "CONCACAF", 30),
}

teams = []
for letter, names in groups.items():
    for idx, name in enumerate(names):
        code, iso2, conf, rank = TEAM_META[name]
        teams.append({
            "fifa_code": code,
            "name": name,
            "confederation": conf,
            "group_letter": letter,
            "group_rank": idx + 1,
            "fifa_ranking": rank,
            "flag_url": f"https://flagcdn.com/w320/{iso2}.png",
        })

# 16 venues. match_aliases = stadium names / city labels as they appear in matches.json
VENUES = [
    {"name": "AT&T Stadium", "fifa_name": "Dallas Stadium", "city": "Dallas (Arlington)", "country": "United States", "capacity": 94000, "lat": 32.7473, "lng": -97.0945, "timezone": "America/Chicago",
     "description": "Home of the NFL's Dallas Cowboys in Arlington, Texas. A climate-controlled stadium with a retractable roof and one of the largest video boards in sports. Hosts a semifinal."},
    {"name": "Estadio Azteca", "fifa_name": "Estadio Ciudad de Mexico", "city": "Mexico City", "country": "Mexico", "capacity": 83000, "lat": 19.3029, "lng": -99.1505, "timezone": "America/Mexico_City",
     "description": "The iconic Estadio Azteca becomes the first stadium to host matches at three different World Cups (1970, 1986, 2026). It hosts the tournament's opening match on June 11, 2026."},
    {"name": "MetLife Stadium", "fifa_name": "New York New Jersey Stadium", "city": "New York / New Jersey (East Rutherford)", "country": "United States", "capacity": 82500, "lat": 40.8136, "lng": -74.0745, "timezone": "America/New_York",
     "description": "Home of the NFL's Giants and Jets in East Rutherford, New Jersey. Selected to host the 2026 FIFA World Cup Final on July 19, 2026."},
    {"name": "Mercedes-Benz Stadium", "fifa_name": "Atlanta Stadium", "city": "Atlanta", "country": "United States", "capacity": 75000, "lat": 33.7553, "lng": -84.4006, "timezone": "America/New_York",
     "description": "A retractable-roof, climate-controlled stadium in downtown Atlanta known for its pinwheel roof. Hosts a semifinal."},
    {"name": "Arrowhead Stadium", "fifa_name": "Kansas City Stadium", "city": "Kansas City", "country": "United States", "capacity": 73000, "lat": 39.0489, "lng": -94.4839, "timezone": "America/Chicago",
     "description": "Home of the NFL's Kansas City Chiefs, famous as one of the loudest stadiums in the world."},
    {"name": "NRG Stadium", "fifa_name": "Houston Stadium", "city": "Houston", "country": "United States", "capacity": 72000, "lat": 29.6847, "lng": -95.4107, "timezone": "America/Chicago",
     "description": "A retractable-roof stadium in Houston, Texas, home of the NFL's Texans."},
    {"name": "Levi's Stadium", "fifa_name": "San Francisco Bay Area Stadium", "city": "San Francisco Bay Area (Santa Clara)", "country": "United States", "capacity": 71000, "lat": 37.4030, "lng": -121.9700, "timezone": "America/Los_Angeles",
     "description": "Home of the NFL's San Francisco 49ers in Santa Clara, California."},
    {"name": "SoFi Stadium", "fifa_name": "Los Angeles Stadium", "city": "Los Angeles (Inglewood)", "country": "United States", "capacity": 70000, "lat": 33.9535, "lng": -118.3392, "timezone": "America/Los_Angeles",
     "description": "A state-of-the-art venue in Inglewood with a translucent roof, home of the NFL's Rams and Chargers."},
    {"name": "Lincoln Financial Field", "fifa_name": "Philadelphia Stadium", "city": "Philadelphia", "country": "United States", "capacity": 69000, "lat": 39.9008, "lng": -75.1675, "timezone": "America/New_York",
     "description": "Home of the NFL's Philadelphia Eagles."},
    {"name": "Lumen Field", "fifa_name": "Seattle Stadium", "city": "Seattle", "country": "United States", "capacity": 69000, "lat": 47.5952, "lng": -122.3316, "timezone": "America/Los_Angeles",
     "description": "Home of the NFL's Seahawks and MLS's Sounders, known for its passionate, loud crowds."},
    {"name": "Gillette Stadium", "fifa_name": "Boston Stadium", "city": "Boston (Foxborough)", "country": "United States", "capacity": 65000, "lat": 42.0909, "lng": -71.2643, "timezone": "America/New_York",
     "description": "Home of the NFL's New England Patriots in Foxborough, Massachusetts."},
    {"name": "Hard Rock Stadium", "fifa_name": "Miami Stadium", "city": "Miami (Miami Gardens)", "country": "United States", "capacity": 65000, "lat": 25.9580, "lng": -80.2389, "timezone": "America/New_York",
     "description": "Home of the NFL's Miami Dolphins, host of the third-place playoff."},
    {"name": "BC Place", "fifa_name": "BC Place Vancouver", "city": "Vancouver", "country": "Canada", "capacity": 54000, "lat": 49.2768, "lng": -123.1119, "timezone": "America/Vancouver",
     "description": "A retractable-roof stadium in downtown Vancouver, one of two Canadian host venues."},
    {"name": "Estadio BBVA", "fifa_name": "Estadio Monterrey", "city": "Monterrey (Guadalupe)", "country": "Mexico", "capacity": 53500, "lat": 25.6692, "lng": -100.2447, "timezone": "America/Monterrey",
     "description": "Known as 'El Gigante de Acero', a modern stadium near Monterrey with views of Cerro de la Silla."},
    {"name": "Estadio Akron", "fifa_name": "Estadio Guadalajara", "city": "Guadalajara (Zapopan)", "country": "Mexico", "capacity": 48000, "lat": 20.6819, "lng": -103.4625, "timezone": "America/Mexico_City",
     "description": "Home of Liga MX club Chivas Guadalajara, a striking stadium designed to resemble a volcano."},
    {"name": "BMO Field", "fifa_name": "Toronto Stadium", "city": "Toronto", "country": "Canada", "capacity": 45000, "lat": 43.6332, "lng": -79.4185, "timezone": "America/Toronto",
     "description": "Home of MLS's Toronto FC, expanded for the tournament, one of two Canadian host venues."},
]

with open(f"{OUT}/teams.json", "w") as f:
    json.dump(teams, f, indent=2, ensure_ascii=False)
with open(f"{OUT}/venues.json", "w") as f:
    json.dump(VENUES, f, indent=2, ensure_ascii=False)

print(f"teams: {len(teams)} (expect 48)")
print(f"venues: {len(VENUES)} (expect 16)")
missing = [n for ns in groups.values() for n in ns if n not in TEAM_META]
print("missing meta:", missing)