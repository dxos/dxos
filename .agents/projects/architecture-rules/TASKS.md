# Architecture Rules — Tasks

_Resume: PR #13373 landed the rules and the checker. Follow-up: context on 15 older rules, calibration with context (no gain over bare hunks), 12-line location segments, and a subagent comparison of one trial (75% of reported verdicts confirmed; the uncertain band below 0.5 is 3% real). NEXT: decide the uncertain floor on a second trial; prune noisy rules._

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
- [x] **Context for the older rules** — 15 of the 31 now declare what they need; the rest judge the file alone.
- [ ] **Trial with subagents** — run the agentic review over three or four packages; prune rules that produce noise.

## Phase 3: System One checker

- [x] **Checker** — `scripts/system-one.ts` with `lib/system-one/`: context fetchers, budgeted states and windows, two rounds (context requests, locations), store fill and follow-up batches, probe and dry-run modes; 18 unit tests.
- [x] **Calibration** — `dataset/calibrate.ts` → `dataset/CALIBRATION.md`; defaults: report at 0.8, uncertain from max(0.15, rule median + 0.15).
- [x] **Trial** — 202 files, see `TRIAL.md`.
- [x] **Top up the TypeSafe key**.
- [x] **Calibrate with context** — `dataset/calibrate-context.ts` → `dataset/CALIBRATION-CONTEXT.md`: whole files with context separate no better than bare hunks ($0.83).
- [x] **Location** — measured against reviewers' lines: 12-line segments hit as often as 40-line ones at half the span; a second choice inside the first loses hits. Default is now 12.
- [x] **Compare with subagents** — see `TRIAL.md`: 12 of 16 reported confirmed, 18 of 207 uncertain, 1 of 80 dismissed.
- [ ] **Uncertain floor** — the comparison favours 0.5 (69% less routed, 14 of 18 kept) but the mined-hunk calibration keeps 42% of positives at 0.4; settle it on a second trial before changing the default.
