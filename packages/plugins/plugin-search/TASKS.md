# plugin-search — Tasks

_Resume: Milestones 1 and 1.5 COMPLETE. FTS + type composition (Milestone 3, first half) COMPLETE — the planner folds `and(text-search, type)` into a type-scoped `TextSelector`, the FTS SQL filters on `typeDXN`, and plugin-search scopes its query to user-visible types (`useSearchableTypeUris` + `TypeOptions.isUserType`, shared with the nav tree's Database section; collections stay searchable). Remaining in M3: in-memory text-search matcher, mailbox mixed text+structural adoption, agent-tool searchKind. Next: those, or Milestone 2 (cross-space fan-out + RRF merge)._

Work-stream: unify Composer search across lexical (FTS5), semantic (vector),
structured/RDF, and agent planes; tiered client/EDGE vector index synced via feeds.
Design in [`docs/DESIGN.md`](./docs/DESIGN.md); current state in
[`docs/AUDIT.md`](./docs/AUDIT.md); sequencing in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Milestone 1: Real lexical search (quick win)

Wire `plugin-search` + `MailboxArticle` to the shipped FTS5 index with ranking and
(optional) highlighting; the search box actually filters. No new infra. Full plan:
[`docs/M1-lexical-search-plan.md`](./docs/M1-lexical-search-plan.md).

### Tasks

- [x] **FTS query + ranking helpers** — `src/hooks/search-query.ts`
      (`buildSearchQuery`, `toSearchResults`, `byRelevance`, `computeMatchSpans`) + unit
      tests; export `getIcon` from `sync.ts`.
- [x] **Wire search containers to FTS** — `SearchDialog` / `SearchArticle` use
      `Filter.text` + ranked results; drop stale regex-results path and deprecated web
      search; strengthen the storybook play test to assert real matches.
- [x] **Mailbox selection helper** — `MailboxArticle/mailbox-search.ts`
      (`buildMailboxSelection`: free-text → FTS over feed; structural → AND with type) +
      unit tests.
- [x] **Apply the mailbox filter** — use `buildMailboxSelection` in the message
      query; verify threading/aggregate under a text query (fallback: bypass grouping
      while querying).
- [x] **(Optional) Highlighting** — `Highlighted` component used in
      `SearchResultStack`.
- [x] **Reconcile copy** — fix `dx.config.ts` / `PLUGIN.mdl` overstated claims (no
      working web search).

### References

- Executor now ANDs one `text-search` with root-executable type/props filters (typename pushed
  into the `TextSelector` and down to the FTS SQL) — `query-planner.ts` `case 'and'`,
  `fts-index.ts` `typeDxns`. Two text filters or a negated composition remain "Query too complex".
- FTS single-space, whole-object-JSON, no snippet — `index-core` `FtsIndex`.

## Milestone 1.5: MailboxFilter extraction + search result surfaces

Extract `MailboxFilter` from `MailboxArticle`; add a realistic shared message corpus;
ship best-match search snippets in mailbox cards; add a `SearchResultList`
(react-ui-list) with a plugin-search storybook over the corpus. Shared search-text
utilities move to `@dxos/react-ui-search` so plugin-inbox can reuse them without
depending on plugin-search.

### Tasks

- [x] **Shared search-text utils** — move `computeMatchSpans` + `Highlighted` to
      `@dxos/react-ui-search` (`src/util`, `src/components/Highlighted`); add pure
      `buildSnippet(text, query)`; update plugin-search call sites (no shims).
- [x] **Shared sample corpus** — pure-data `SAMPLE_MESSAGES` (~18 realistic messages
      across projects/invoices/meetings/hiring/incidents) in `@dxos/plugin-testing`.
- [x] **Best-match snippet in mailbox cards** — thread the active query to `MessageStack`
      tiles; when searching, show `buildSnippet(Message.extractText(m), query)` highlighted
      instead of the default preview.
- [x] **Extract MailboxFilter** — `MailboxFilter.tsx` + `MailboxFilter.stories.tsx`;
      reseed `MailboxArticle.stories.tsx` with the corpus; play test exercises search + snippet.
- [x] **SearchResultList** — react-ui-list `Listbox` result list (icon + highlighted
      title/snippet + metadata) + `SearchResultList.stories.tsx` over the corpus.

### Follow-ups

- [ ] **Predicate search** — parse `from:`/`to:` DSL predicates in mailbox search (e.g.
      `from:rich`) so a field-scoped term filters on that field only, distinct from free-text
      matching. Depends on Milestone 3 (FTS + type/structural composition in the executor).
- [ ] **Reusable first-class test data** — promote the hand-authored corpus into a
      shared, realistic message/object dataset + generator for stories and tests across
      packages (beyond the single `SAMPLE_MESSAGES` fixture).

## Milestone 2: Global (cross-space) search

Client fan-out across loaded spaces + RRF merge; scope toggle. See ROADMAP M2.

### Tasks

- [ ] Fan-out `Filter.text` across loaded space DBs; fuse with Reciprocal Rank Fusion.
- [ ] Result items carry originating space + `source: 'global'`; group by space in UI.
- [ ] Scope toggle (this space / all spaces).

## Milestone 3: Hybrid lexical + structured, agent search

### Tasks

- [ ] Implement the in-memory `text-search` matcher (currently `return false`) in
      `echo-host/src/filter/filter-match.ts` + `echo/src/internal/Filter/match.ts`.
- [x] **Enable FTS + type composition** — planner folds `and(text-search, type|or-of-types|
    type-with-props)` into a type-scoped `TextSelector`; FTS SQL filters on `typeDXN`
      (shared `buildTypeDxnCondition`); plugin-search scopes its query to user-visible types
      (`TypeOptions.isUserType`, shared with the nav Database section; collections included).
- [ ] Adopt the composition in the mailbox (mixed text+structural — see
      `mailbox-search.ts` `buildMailboxSelection`).
- [ ] Add `searchKind: 'full-text' | 'vector' | 'hybrid'` to the `database.query`
      agent tool.

## Milestone 4: Vector index MVP (local, flagged)

### Tasks

- [ ] `@dxos/pipeline` flow: chunk → contentHash-gate → embed (`@xenova/transformers`)
      → write `EmbeddingRecord` to a per-space feed.
- [ ] New `VectorIndex` in `index-core` (benchmark `sqlite-vec` vs `usearch`), fed by
      `IndexTracker` cursors.
- [ ] Wire the `type: 'vector'` executor stub → `VectorIndex`; add `type: 'hybrid'`
      (RRF).
- [ ] Storybook + eval (lexical vs vector vs hybrid).

## Milestone 5: EDGE embedding + Vectorize mirror

### Tasks

- [ ] EDGE Workers-AI embedding (`bge-m3` / `qwen3-embedding-0.6b`) for backfill.
- [ ] EDGE mirrors the embedding feed into Cloudflare Vectorize. _(external EDGE repo)_
- [ ] Client falls back to EDGE query when local index is cold.

## Milestone 6: Per-user EDGE global index service

### Tasks

- [ ] New EDGE service (FTS + Vectorize) over all replicated spaces. _(external repo)_
- [ ] Client contract via `client.edge.query`; "everywhere" scope in UI.

## Milestone M-RDF (parallel track, gated on benchmark)

FactStore GraphRAG — durable store + fact→source retrieval. See DESIGN §8.

### Tasks

- [ ] Persist `plugin-brain` FactStore (`FactStore.layer` SQLite/OPFS) — replace
      in-memory N3 so facts survive reload.
- [ ] Promote the `stories-brain` `hybrid` fact→source bridge into a shipped operation.
- [ ] Surface it: entity-resolved result group in search + agent tool.
- [ ] Expand only if `brain-skill-eval` shows facts/hybrid beating thread-RAG.
