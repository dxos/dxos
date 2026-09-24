# Architecture Rules — Tasks

_Resume: bounded-state rules landed in PR #13373 (dxos) and edge#1153. Seed list chosen. Mining pipeline: scrape → chunk → classify → cluster, all under `dataset/`._

## Phase 0: Bounded state (done)

- [x] **`bounded-live-state` + `collect-dead-entities`** — in `non-negotiables.mdl`, PR #13373.

## Phase 1: Mine review comments

Build the dataset that grounds every later rule.

### Tasks

- [ ] **Scrape** — `dataset/scrape.mjs`: every human inline review comment on dxos/dxos, last 12 months, with diff hunk and PR metadata.
- [ ] **Chunk** — mechanical filter (drop self-replies, trivial bodies), ≤ 40 comments per chunk.
- [ ] **Classify** — one Sonnet subagent per chunk: rule-worthy?, category, principle.
- [ ] **Cluster** — merge classifications into `dataset/CANDIDATES.md`: candidate rules, counts, example links, overlap with the seed list.

## Phase 2: Write the rules

- [ ] **`architecture.mdl`** — the seed rules that survive the data, plus the top mined clusters; each with a canonical example and a grep no narrower than the prose.
- [ ] **Trial** — full-project agentic review over three or four packages; prune noisy rules.
- [ ] **PR** — open with a changeset-free summary; cite the dataset.
