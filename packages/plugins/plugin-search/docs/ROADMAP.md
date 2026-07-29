# Composer Search — Roadmap

_Date: 2026-07-14. Milestone-based (not calendar-based). Each milestone is
independently shippable and testable. See [`DESIGN.md`](./DESIGN.md) for the
architecture and [`AUDIT.md`](./AUDIT.md) for the current state. The first
milestone has a full implementation plan in
[`M1-lexical-search-plan.md`](./M1-lexical-search-plan.md)._

## Sequencing at a glance

```
M1 ─► M2 ─► M3 ─► M4 ─► M5 ─► M6
(lexical) (global) (hybrid+  (vector  (EDGE    (EDGE global
          fan-out)  structured) MVP)   embed+   index service)
                                       Vectorize)
                              M-RDF ───────────────► (parallel track)
```

Ordering rule: **quick wins that use shipped infrastructure first**, then the
vector subsystem, then the EDGE scale tier. The RDF track runs in parallel and is
gated on the `stories-brain` benchmark.

---

## M1 — Real lexical search (quick win) · _no new infra_

**Deliverable:** `plugin-search` and `MailboxArticle` use the shipped FTS5 index
with ranking and highlighting; the mailbox search box actually filters.

- Wire `plugin-search` (`SearchDialog`, `SearchArticle`) to
  `Filter.text(q, { type: 'full-text' })` instead of fetching-all + regex.
- Restore `command-score` ranking and add snippet highlighting via `MatchSpan`s.
- Apply `MailboxArticle`'s already-parsed `Filter` to its message query
  (message search + inline filtering).
- Remove the stale "indexer not available" TODOs and the dead regex path; delete
  the deprecated Exa web-search wiring from the article surface.

**Why first:** the engine already ships and runs client-side (§AUDIT 2.2); this is
wiring, not building. Covers use-cases **(b)** and **(d)**. Full plan:
[`M1-lexical-search-plan.md`](./M1-lexical-search-plan.md).

**Exit test:** typing in the search dialog returns BM25-ranked, highlighted
results from the FTS index (verified in the storybook play test + a unit test for
query construction and fusion); the mailbox search box narrows the message list by
`from:`, `#tag`, and free text.

## M2 — Global (cross-space) search · _client fan-out_

**Deliverable:** search spans all _loaded_ spaces.

- Fan out `Filter.text` across each loaded space's DB in parallel; fuse with
  Reciprocal Rank Fusion.
- Result items carry their originating space + `source: 'global'`; UI groups by
  space.
- Add a scope toggle (this space / all spaces) to the search surfaces.

**Why:** the headline "global space search" quick win; no core ECHO change.
Covers **(a)** near-term.

**Exit test:** a query returns merged, ranked results drawn from ≥2 open spaces,
each labeled with its space; single-space mode still works.

## M3 — Hybrid lexical + structured, and agent search · _small core change_

**Deliverable:** text predicates compose with structural filters, and the agent
can request hybrid search.

- Implement the in-memory `text-search` matcher (currently `return false`) so
  `text-search` composes as a post-select `FilterStep`.
- Enable FTS + type composition (`type:Message AND "invoice"`).
- Add `searchKind: 'full-text' | 'vector' | 'hybrid'` to the `database.query`
  agent tool input (vector degrades to full-text until M4).

**Why:** unblocks use-case **(c)** and prepares **(e)**; the matcher fix is a
localized `echo`/`echo-host` change with unit-test coverage.

**Exit test:** `Query.select(Filter.and(Filter.type(Message), Filter.text('invoice')))`
returns only matching messages; the agent tool accepts and honors `searchKind`.

## M4 — Vector index MVP (local, behind a flag) · _new subsystem_

**Deliverable:** semantic search over the active space, entirely client-side,
behind a feature flag.

- `@dxos/pipeline` indexing flow: `chunk → contentHash-gate → embed (local
`@xenova/transformers`) → write `EmbeddingRecord` to a per-space feed`.
- New `VectorIndex` in `index-core` (benchmark `sqlite-vec` vs `usearch`), fed by
  the feed via `IndexTracker` cursors.
- Wire the `type: 'vector'` executor stub → `VectorIndex`; add `type: 'hybrid'`
  (RRF over lexical + vector).
- Storybook + eval comparing lexical vs vector vs hybrid on a seeded corpus.

**Why:** delivers the semantic plane offline-first; establishes the feed seam that
EDGE later consumes. Covers **(c)/(e)** semantically.

**Exit test:** a semantic query ("invoice from the landlord") returns relevant
objects with no lexical term overlap; hybrid outranks either plane alone on the
eval set; feature flag off ⇒ zero behavior change.

## M5 — EDGE embedding + Vectorize mirror · _EDGE tier_

**Deliverable:** bulk/backfill embedding on EDGE and a server-side Vectorize
mirror, consuming the same feed.

- EDGE Workers-AI embedding (`bge-m3` / `qwen3-embedding-0.6b`) for backfill and
  large imports; feed records tagged with the EDGE model generation.
- EDGE mirrors the embedding feed into Cloudflare Vectorize.
- Client prefers local vectors, falls back to EDGE query when online and the local
  index is cold/incomplete.

**Why:** quality + throughput without keys; keeps client and EDGE consistent via
the shared feed (§DESIGN 4.5). _Depends on the external EDGE worker repo for the
Vectorize binding._

**Exit test:** a freshly-imported large space is searchable semantically before
the client finishes local embedding, served from the EDGE mirror.

## M6 — Per-user EDGE global index service · _scale_

**Deliverable:** a per-user index across _all_ spaces (including unopened),
queried remotely.

- New EDGE service (FTS + Vectorize) over the user's replicated spaces; client
  contract via `client.edge.query`.
- Search surfaces gain an "everywhere" scope backed by the global index.

**Why:** the scalable end-state for **(a)**; supersedes fan-out for large
accounts. _Worker lives in the external EDGE repo; this repo ships the client
contract._

**Exit test:** a query returns results from a space that was never opened this
session.

---

## M-RDF — FactStore GraphRAG (parallel track) · _gated on benchmark_

**Deliverable:** a durable FactStore and a fact-grounded retrieval path in search.

1. Persist `plugin-brain`'s FactStore (`FactStore.layer` SQLite backend, OPFS) so
   facts survive reload.
2. Promote the `stories-brain` `hybrid` fact→source bridge into a shipped
   operation.
3. Surface it: an entity-resolved result group in search + an agent tool.
4. Expand only if `brain-skill-eval` shows facts/hybrid beating thread-RAG on a
   question class.

**Why:** the concrete near-term step that moves search forward using the RDF
technology, reusing only in-repo pieces. Detailed sequencing in
[`DESIGN.md`](./DESIGN.md) §8; tasks in `TASKS.md`. Gated per the `stories-brain`
ROADMAP so we don't over-invest before validation. Contributes to **(e)**.

---

## Cross-cutting

- **Feature flags:** M4+ ships behind flags; M1–M3 are on by default.
- **Progress UX:** the indexing/embedding pipeline reports via `Stage.track` into
  the app progress panel (this worktree's branch).
- **Telemetry:** log dropped work when any milestone bounds coverage (fan-out
  space cap, top-N, `<3`-char LIKE fallback) — silent truncation reads as full
  coverage.
- **Docs:** update `dx.config.ts` / `PLUGIN.mdl` copy to match reality as each
  milestone lands (today it overstates capability — §AUDIT 1.2).
