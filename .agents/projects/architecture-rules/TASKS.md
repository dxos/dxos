# Architecture Rules — Tasks

_Resume: PR #13373 open. 70 mined rules shipped as `.mdl` with `unit`/`context` fields; System One checker built, calibrated and trialled on 202 files ($2.73, 3m44s, 312 reported). The TypeSafe key ran out of credits after the trial. NEXT: add credits, calibrate context-dependent rules with context fetched, compare the uncertain band with a subagent review._

## Phase 0: Bounded state (done)

- [x] **`bounded-live-state` + `collect-dead-entities`** — in `non-negotiables.mdl`, PR #13373.

## Phase 1: Mine review comments

Build the dataset that grounds every later rule.

### Tasks

- [x] **Scrape** — `dataset/scrape.ts`: every human inline review comment on dxos/dxos, last 12 months, with diff hunk and PR metadata.
- [x] **Chunk** — mechanical filter (drop self-replies, trivial bodies), ≤ 40 comments per chunk.
- [x] **Classify** — one Sonnet subagent per chunk: rule-worthy?, category, principle.
- [x] **Cluster** — merge classifications into `dataset/CANDIDATES.md`: candidate rules, counts, example links, overlap with the seed list.

## Phase 2: Write the rules

- [x] **Rule schema** — `unit`, `context`, `system-one`, `question` in `lib/mdl.ts`; every appendix documents them.
- [x] **Rules** — all kept clusters converted: `architecture.mdl` (25), `api-design.mdl` (18), `testing.mdl`, `effect.mdl`, `process.mdl`, and additions to `ui.mdl`, `echo.mdl` (27). Clusters an existing rule enforces are mapped, not duplicated.
- [ ] **Context for the older rules** — the 31 rules that predate `context` declare none; `bounded-live-state` and `collect-dead-entities` at least need `diff`.
- [ ] **Trial with subagents** — run the agentic review over three or four packages; prune rules that produce noise.

## Phase 3: System One checker

- [x] **Checker** — `scripts/system-one.ts` with `lib/system-one/`: context fetchers, budgeted states and windows, two rounds (context requests, locations), store fill and follow-up batches, probe and dry-run modes; 18 unit tests.
- [x] **Calibration** — `dataset/calibrate.ts` → `dataset/CALIBRATION.md`; defaults: report at 0.8, uncertain from max(0.15, rule median + 0.15).
- [x] **Trial** — 202 files, see `TRIAL.md`.
- [ ] **Top up the TypeSafe key** — it answered `402 billing_error` after the trial.
- [ ] **Calibrate with context** — score context-dependent rules on full files with their declared context, not bare hunks.
- [ ] **Location** — the chosen segment is wrong about one time in five; try smaller segments or a second choice within the segment.
- [ ] **Compare with subagents** — run subagents on one trial's uncertain band and on a sample of its dismissed pairs, to measure what the triage misses.
