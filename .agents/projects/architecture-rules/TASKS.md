# Architecture Rules — Tasks

_Resume: PR #13373 open and green. Phase 1 done: 5,613 comments scraped, 1,161 chunked, 834 rule-worthy, clustered into `dataset/CANDIDATES.md` with a recommended first batch of eight rules. NEXT: user confirms the batch, then write `architecture.mdl`._

## Phase 0: Bounded state (done)

- [x] **`bounded-live-state` + `collect-dead-entities`** — in `non-negotiables.mdl`, PR #13373.

## Phase 1: Mine review comments

Build the dataset that grounds every later rule.

### Tasks

- [x] **Scrape** — `dataset/scrape.mjs`: every human inline review comment on dxos/dxos, last 12 months, with diff hunk and PR metadata.
- [x] **Chunk** — mechanical filter (drop self-replies, trivial bodies), ≤ 40 comments per chunk.
- [x] **Classify** — one Sonnet subagent per chunk: rule-worthy?, category, principle.
- [x] **Cluster** — merge classifications into `dataset/CANDIDATES.md`: candidate rules, counts, example links, overlap with the seed list.

## Phase 2: Write the rules

- [ ] **`architecture.mdl`** — the seed rules that survive the data, plus the top mined clusters; each with a canonical example and a grep no narrower than the prose.
- [ ] **Trial** — full-project agentic review over three or four packages; prune noisy rules.
- [ ] **PR** — open with a changeset-free summary; cite the dataset.
