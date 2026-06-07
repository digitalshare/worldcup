# FIFA World Cup 2026 — Fan Web App

> Original project plan (as prompted in the planning session, 2026-06-05). Built with the
> Butterbase MCP (backend, RAG, hosting) and Bright Data MCP (data scraping).
> Project dir: `/Users/cw/work/projects/worldcup` (moved from `~/work/workshop/worldcup`).

## Context

The FIFA World Cup 2026 (USA · Canada · Mexico, June 11 – July 19, 2026 — the first
48-team, 104-match edition) needs a comprehensive, public fan web app covering everything
a fan needs: full schedule, the 12 groups & live standings, all 48 teams and squads, the
16 host-city venues, plus an **AI chat assistant + semantic search** so fans can ask
anything in natural language.

Two MCP toolchains do the work:
- **Bright Data MCP** — search + scrape current World Cup 2026 data (teams, groups,
  fixtures, venues, squads, news) from the live web.
- **Butterbase MCP** — backend app: isolated Postgres + auto data API, built-in RAG
  (semantic search + RAG chat), AI gateway, serverless/cron functions, and React frontend
  hosting on a live URL.

Confirmed scope: **all four feature areas**, **React + Vite + Tailwind** SPA,
**public (no login)**, and a **Butterbase cron function for scheduled score/standings
auto-refresh**.

---

## Architecture

```
Bright Data (scrape) ──▶ structured rows ──▶ Butterbase tables ──▶ auto data API ──▶ React SPA
                    └──▶ entity text docs ──▶ Butterbase RAG collection ──▶ ask/search fns ──▶ Chat & Search UI
Butterbase cron fn  ──▶ fetch live scores ──▶ upsert matches + recompute standings (auto-refresh)
```

- **Structured data** (tables) powers Schedule, Standings, Teams, Venues via the zero-code HTTP data API.
- **RAG collection** (`worldcup`) powers AI chat + semantic search.
- **Serverless functions** wrap RAG/AI so the public frontend never holds a platform key.

---

## Step 1 — Create the Butterbase app

`init_app` → name `worldcup-2026`. Record `app_id`, `api_url`, frontend `url`.
App stays **public** access mode (no login).

## Step 2 — Define schema (`manage_schema`, dry_run → apply)

Tables (12-group, 104-match tournament):

- **teams** — `id` uuid pk, `fifa_code` text (3-letter, unique), `name`, `confederation`,
  `group_letter` (A–L), `flag_url`, `fifa_ranking` int, `coach`, plus standings cols:
  `played, won, drawn, lost, goals_for, goals_against, points` (int, default 0),
  `group_rank` int.
- **venues** — `id` uuid pk, `name`, `city`, `country`, `capacity` int, `lat` numeric,
  `lng` numeric, `image_url`, `description`, `timezone`.
- **matches** — `id` uuid pk, `match_number` int unique, `stage` text
  (`group`,`r32`,`r16`,`qf`,`sf`,`third_place`,`final`), `group_letter`,
  `home_team_id`→teams, `away_team_id`→teams, `home_placeholder` text (e.g. "Winner Group A"
  for knockouts), `away_placeholder` text, `venue_id`→venues, `kickoff_utc` timestamptz,
  `status` text default `'scheduled'` (`scheduled`/`live`/`finished`), `home_score` int,
  `away_score` int. Indexes on `kickoff_utc`, `group_letter`, `stage`.
- **players** — `id` uuid pk, `team_id`→teams, `name`, `position`, `club`,
  `jersey_number` int, `age` int. Index on `team_id`.
- **news** — `id` uuid pk, `title`, `source`, `url`, `summary`, `image_url`,
  `published_at` timestamptz. Index on `published_at`.

(Groups A–L are derived from `teams.group_letter`; no separate table needed.)

## Step 3 — Gather data with Bright Data

Use `search_engine_batch` + `scrape_batch` (Wikipedia is the primary, scrape-friendly,
authoritative source; FIFA.com/ESPN as cross-check). Targets:

- **2026 FIFA World Cup** main article — format, dates, host cities overview.
- **Group draw** — the 12 groups and all 48 teams (+ FIFA codes, confederations).
- **Schedule / list of matches** — all 104 fixtures with dates, kickoff times, venues, stage.
- **Venues** — 16 stadiums: name, host city, country, capacity, (lat/lng best-effort).
- **Squads** — rosters / key players per team (best-effort; fill `players`).
- **News** — recent World Cup 2026 headlines via `search_engine`.

Parse scraped markdown → normalized rows. Insert via `insert_row` / `seed_database`
(batch). Resolve match team/venue references to ids; keep knockout slots as placeholders
until determined.

## Step 4 — Populate the RAG collection (semantic search + chat)

`manage_rag_content` (action `create_collection`) → name `worldcup`, accessMode `shared`.
Ingest one concise text document per entity so retrieval is rich:
- One doc per **team** (group, ranking, coach, key players, qualification path).
- One doc per **venue** (city, capacity, matches hosted, fun facts).
- A **tournament format & rules** doc (48 teams, 12 groups, new knockout structure, dates).
- A **host-cities / travel FAQ** doc and a **how-to-follow** doc.
- Each **news** article as a doc.

Poll `status` until `ready`.

## Step 5 — Serverless functions (`deploy_function`)

Public frontend must not hold a platform key, so wrap AI behind functions (service role,
key in `envVars.BUTTERBASE_API_KEY`):

- **`ask`** (http, POST `{question, history?}`) — retrieves from RAG (`rag` query endpoint,
  `synthesize:true`, model `anthropic/claude-haiku-4.5`) and returns `{answer, sources}`.
  Backs the chat UI.
- **`search`** (http, GET/POST `{q}`) — RAG query without synthesis → returns ranked
  `{title, snippet, score}` results for the semantic search bar.
- **`refresh-scores`** (cron, `*/15 * * * *`) — fetches live scores/standings from a
  configurable public football-data source (API token in `envVars`; football-data.org free
  tier or equivalent), upserts `matches.home_score/away_score/status`, then recomputes each
  team's standings (`played/won/drawn/lost/goals_for/goals_against/points/group_rank`) with
  `ctx.db`. Runs as service role (RLS bypassed). **Note:** Bright Data is an agent-side MCP
  tool and is *not* available inside Butterbase functions, so the cron pulls from a
  plain-`fetch`able source; manual re-scrape via Bright Data remains the fallback if no
  data-source token is provided.

> During implementation, confirm the exact RAG query REST path/shape via `butterbase_docs`
> topic `rest`/`rag`; if direct REST retrieval is unavailable inside a function, fall back to
> AI-gateway embeddings + a `vector(1536)` column with an HNSW index on a `documents` table
> for retrieval.

## Step 6 — Build the React frontend (Vite + Tailwind + React Router)

Scaffold locally in the working dir. Config via Vite env: `VITE_API_URL`, `VITE_APP_ID`
(set through `manage_frontend` set_env and injected at build).

Pages / key components:
- **Home** — countdown to opening match, next fixtures, latest news, quick links.
- **Schedule** — fixtures list with filters (group / date / team / venue); `MatchCard`.
- **Groups & Standings** — 12 `GroupTable`s built from `teams` ordered by `group_rank`.
- **Teams** — grid → **Team detail** (squad from `players`, that team's fixtures).
- **Venues** — host-city cards (+ simple map) → **Venue detail** with matches hosted.
- **AI Chat** — `ChatBox` posting to `/fn/ask`, renders answer + source chips.
- **Search** — semantic search bar hitting `/fn/search`.

Data access: Butterbase auto data API (`GET {api_url}/<table>?...`) for structured reads;
`fetch` to `/fn/ask` and `/fn/search` for AI.

## Step 7 — Deploy frontend

`npm run build` → zip `dist/` **with the Node `archiver` script** (forward-slash entries —
never `Compress-Archive`/Explorer). `create_frontend_deployment` (framework `react-vite`)
→ PUT zip → `manage_frontend` start_deployment → poll to `READY`, then **HTTP-GET the live
URL (and a hashed asset) with backoff until the new build is served** before declaring it live.

---

## Critical files

- `frontend/` — Vite React app: `src/main.jsx`, `src/App.jsx`, `src/lib/api.js`
  (data-API + fn helpers), `src/pages/{Home,Schedule,Groups,Teams,TeamDetail,Venues,VenueDetail,Chat,Search}.jsx`,
  `src/components/{MatchCard,GroupTable,ChatBox,SearchBar,Navbar}.jsx`, `tailwind.config.js`,
  `zip-dist.js`.
- `functions/{ask,search,refresh-scores}.ts` — function source kept in-repo for reference.
- `data/` — intermediate JSON parsed from Bright Data scrapes (teams, groups, matches,
  venues, players, news) before insertion.

## Verification

1. **Data**: `select_rows` / `GET {api_url}/teams` → 48 teams across groups A–L; `/matches`
   → 104 rows; `/venues` → 16; spot-check joins (a match resolves real team + venue ids).
2. **RAG/chat**: invoke `ask` with "Which group is Argentina in and who are their key
   players?" and "What stadium hosts the final?" → coherent answers with sources; invoke
   `search` with "host cities in Mexico" → ranked venue hits.
3. **Cron**: manually test-invoke `refresh-scores`; confirm it updates a sample match score
   and recomputes that group's standings without error (check function logs).
4. **Frontend**: after `READY`, poll the live URL until the new build serves; load each
   page, verify Schedule filters, a Group table renders standings, a Team detail shows
   squad, Venues render, Chat returns an answer, Search returns results. Assets must serve
   as `application/javascript` (validates the zip).

## Open / assumptions

- Squad data is best-effort (rosters near tournament start may be partial) — players table
  populated where reliably scrapeable.
- Knockout fixtures stored with placeholder slots until teams are determined;
  `refresh-scores` / a manual re-scrape fills them as the bracket resolves.
- Cron auto-refresh needs a public score data source/token; absent one, the same function
  is invoked manually and Bright Data re-scrape (agent-side) is the fallback.

---
---

# Milestone 2 — World Cup 2026 Fan App

> Status: **implemented & deployed 2026-06-07.** See the "As-built notes" at the end for the
> few places the implementation diverged from this plan.

## Context

Milestone 1 shipped a public React SPA (Vite + Tailwind v4 + React Router 6) backed by a
Butterbase app (`app_g29dn25c99ke`): teams/venues/matches/news tables, a `worldcup` RAG
collection, `ask`/`search` functions, and a single `refresh-scores` cron (`*/15`). All
times render in the browser's local zone, all UI text is hardcoded English, there is no
historical data, and scores refresh globally every 15 min.

Milestone 2 adds four fan-facing capabilities:
1. **User-selectable timezone** — all displayed times follow the chosen zone.
2. **EN / 中文 switching** — Chinese is the default; toggle in the navbar.
3. **Historical World Cup database + head-to-head** — every past WC match stored; each 2026
   match shows H2H between the two teams (W-D-L, goals for/against, goal difference, past
   meetings).
4. **Per-match live-score jobs** — a schedule table (one row per match, window =
   kickoff → kickoff+150min) driven by a single 1-minute dispatcher cron.

Decisions confirmed with the user: schedule-table + dispatcher for jobs; store **all** past
WC matches and derive stats; H2H shown as an **expandable panel on MatchCard**; i18n via a
**lightweight custom context** (no new deps).

> Butterbase supports only `http` and `cron` triggers (standard 5-field cron — no per-match
> one-off jobs, no year/seconds). This is why jobs use one dispatcher + a state table.

---

## Feature 1 — Timezone selection

**State.** Add timezone preference to a settings context (one combined provider with i18n).
`tz` defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`, persisted in
`localStorage["wc-timezone"]`.

**Formatting.** The date helpers in `frontend/src/lib/util.js` (`fmtDate`, `fmtTime`,
`fmtDateLong`, `dayKey`) take an options bag `{ tz, locale }`. A `useFmt()` hook (from the
settings context) returns the four formatters bound to the current `tz` + locale, passing
`{ timeZone }` into the `toLocale*` options. The pure functions remain reusable by non-component
code.

**Render sites using `useFmt()`** (display only — `getTime()` comparisons/sorts in `Home.jsx`,
`TeamDetail.jsx`, `VenueDetail.jsx` are tz-agnostic and stay): `MatchCard.jsx` (date · time),
`Schedule.jsx` (`dayKey` grouping — day boundaries shift with tz), `Countdown.jsx`.

**UI.** A timezone `<select>` in `Navbar.jsx`: "Local (device)", `UTC`, and the host-city
zones (`America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`,
`America/Mexico_City`, `America/Toronto`, `America/Vancouver`).

---

## Feature 2 — Internationalization (EN / 中文)

Lightweight custom layer (no dependencies).

**Files**
- `frontend/src/lib/i18n.jsx` — `SettingsProvider` (holds **both** `lang` and `tz`), exposing
  `useT()` → `t(key, vars?)`, `useFmt()`, and `useSettings()`. `lang` defaults to `"zh"`
  ("first support Chinese"), persisted in `localStorage["wc-lang"]`. `t` resolves dot-keys
  against the active locale, falling back to `en` then the raw key; supports `{var}`
  interpolation and array values (e.g. chat suggestions).
- `frontend/src/locales/en.js` and `frontend/src/locales/zh.js` — nested dictionaries for all
  UI strings (nav, page titles/subtitles, filters, buttons, chat/search, countdown, group
  table, H2H labels, `stage.*`). `CONFED_COLOR` stays in `util.js` (CSS classes, not text).

**Wiring**
- `frontend/src/main.jsx` wraps `<App/>` with `<SettingsProvider>` (outside `DataProvider`).
- Hardcoded strings replaced with `t(...)` across `Navbar`, `App`, all `pages/*.jsx`, and
  components (`MatchCard, GroupTable, ChatBox, Countdown`).
- Language toggle (EN | 中文) next to the timezone picker in `Navbar.jsx`.

> Dynamic DB content (team names, venue descriptions, news) stays in its source language;
> this milestone localizes the **UI shell + computed labels**, not scraped prose.

---

## Feature 3 — Historical stats + head-to-head

### Data pipeline
- **Source:** "The World Cup Database" by Joshua C. Fjelstul (CC-BY), vendored at
  `data/source/worldcup_matches.csv` (from the `jfjelstul/worldcup` repo). Chosen over scraping
  Wikipedia markdown: a clean, structured, attributed dataset with team codes + scores.
- `scripts/parse_history.py` → `data/history_matches.json`, rows
  `{year, stage, match_date, team_a, code_a, score_a, team_b, code_b, score_b}`. Filters to
  **men's** tournaments (1930–2022, 964 matches) and remaps the dataset's ISO codes to the FIFA
  codes in `data/teams.json` via `CODE_MAP` (e.g. CSK→CZE, DEU→GER, ZAF→RSA, CHE→SUI, NLD→NED).
- `scripts/insert_history.py` (key via `BUTTERBASE_API_KEY` env) — reproducible per-row POST.

### Schema (`manage_schema`)
- **history_matches** — `id` uuid pk, `year` int, `stage` text, `match_date` date,
  `team_a/code_a/score_a`, `team_b/code_b/score_b`. Indexes on `code_a`, `code_b`, `year`.
  RLS: anon SELECT-only. H2H + all-time records are **derived client-side** (964 rows is small
  enough to fetch once).

### Frontend
- `frontend/src/lib/api.js` — `loadCore()` also fetches `history_matches` (tolerant of failure).
- `frontend/src/lib/store.jsx` — `maps.h2hFor(codeA, codeB)` → `{ played, w, d, l, gf, ga, gd,
  meetings: [{year, stage, team_a, team_b, score_a, score_b}] }`, backed by a code-pair index.
- `frontend/src/components/MatchCard.jsx` — `useState` expand toggle; when both teams are known
  it renders an H2H panel (W-D-L, GF/GA, goal diff, past meetings). Knockout placeholder cards
  show no panel. All labels via `t(...)`.

### RAG
- `scripts/build_history_rag.py` → `data/history_rag_docs.json`: a "World Cup all-time records
  (2026 teams)" doc and a "head-to-head & finals history" doc, ingested into the `worldcup`
  collection so the AI chat answers historical questions.

---

## Feature 4 — Per-match live-score jobs (schedule table + dispatcher)

### Schema (`manage_schema`)
- **match_jobs** — `id` uuid pk, `match_id` uuid fk→matches (unique), `match_number` int,
  `starts_at` timestamptz (= kickoff), `ends_at` timestamptz (= kickoff + 150 min),
  `status` text default `'pending'` (`pending`|`active`|`done`), `last_polled_at` timestamptz,
  `poll_count` int default 0. Indexes on `status`, `starts_at`. RLS enabled, service-only
  (no anon policy — the frontend never reads it).

### Function (`functions/refresh-scores.ts`, redeployed cron `* * * * *`)
Rewritten as a **dispatcher** (service role) that each minute:
  1. **Self-seeds** `match_jobs` from any matches missing a job row (window = kickoff..+150min)
     — replaces a one-off seed step (Butterbase `manage_migrations` cannot run arbitrary SQL).
  2. Activates pending jobs whose `starts_at <= now()`.
  3. Selects active jobs with `ends_at >= now()` (open window); if `SCORES_FEED_URL` is set,
     fetches it and updates `matches` only for those `match_number`s; bumps `last_polled_at`/
     `poll_count`.
  4. Marks played matches finished and closes jobs whose `ends_at < now()`.
  5. Recomputes group standings only when something changed this tick.

> Live scores require a real `SCORES_FEED_URL` (matches are in the future); absent one the
> dispatcher runs and no-ops on score updates. This milestone builds the scheduling framework.

---

## Critical files

**New:** `frontend/src/lib/i18n.jsx`; `frontend/src/locales/{en,zh}.js`;
`scripts/{parse_history,insert_history,build_history_rag}.py`;
`data/history_matches.json`, `data/history_rag_docs.json`, `data/source/worldcup_matches.csv`.

**Modified:** `frontend/src/main.jsx`; `frontend/src/lib/{util.js,api.js,store.jsx}`;
`frontend/src/components/{Navbar,MatchCard,Countdown,GroupTable,ChatBox}.jsx`;
`frontend/src/pages/*.jsx`; `functions/refresh-scores.ts`;
`scripts/{insert,insert_matches}.py` (fixed old `DATA` path).

**Backend (Butterbase MCP):** `manage_schema` (add `history_matches`, `match_jobs`);
`manage_rls` (anon-read on history; enable on match_jobs); `seed_database`/one-off loader fn
(history rows); `manage_rag_content` (ingest history docs); `deploy_function` (redeploy
`refresh-scores` cron `* * * * *`); frontend rebuild → `zip-dist.js` →
`create_frontend_deployment` → `start_deployment`.

---

## Verification

1. **Timezone** — non-local zone shifts `MatchCard` times + `Schedule` day grouping; persists.
2. **i18n** — loads in Chinese by default; EN|中文 toggles all UI text; persists.
3. **History/H2H** — `GET {api}/history_matches` returns 964 rows; H2H panel shows correct
   record + past meetings (verified Argentina–Germany = 7 meetings); AI `ask` answers a
   historical question via the new RAG docs.
4. **Jobs** — 104 `match_jobs` with `ends_at = starts_at + 150min`; lifecycle test confirmed
   activate→finished→done and restore.
5. **Live site** — new build serves at https://worldcup-2026.butterbase.dev with JS as
   `application/javascript`; deployed bundle contains the M2 markers.

---

## As-built notes (deviations from the plan)

- **History source:** used the vendored Fjelstul CSV (`data/source/worldcup_matches.csv`)
  instead of a live Wikipedia scrape — cleaner and attributable. Normalization is a `CODE_MAP`
  (ISO→FIFA) rather than the planned `NAME_ALIASES`.
- **History load:** the live 964-row load ran via a one-off `load-history` Butterbase function
  that fetched the CSV server-side and bulk-inserted (then deleted), avoiding 964 client POSTs;
  `scripts/insert_history.py` remains the reproducible key-based equivalent.
- **match_jobs seed:** seeded by the dispatcher's self-seed step, not `manage_migrations`
  (which only handles app region moves, not SQL).
- **Store helpers:** shipped `h2hFor` only; `allTimeFor` was not needed by the UI.
