# Discord Crawl Pipeline (Crawler Phase 2)

Date: 2026-07-07
Status: Approved
Builds on: [`2026-06-29-crawler-design.md`](./2026-06-29-crawler-design.md) (phase 1, PR #12014), pipeline normalization (PR #12116).

## Context

Phase 1 delivered `@dxos/crawler`: a resumable, source-agnostic crawl loop (frontier `StateStore`, per-target cursors, depth-first thread descent) with a bespoke event-callback `Stage` interface, plus a live `DiscordSource` in `plugin-discord` and fact extraction via `@dxos/pipeline-rdf`. It predates the `@dxos/pipeline` normalization (uniform Stream-based `Stage` transforms and `Pipeline.run({ sink })`), and its only `StateStore`/`AgentRegistry` implementations are in-memory.

`plugin-discord` separately has a feed-sync operation (`SyncDiscordChannel`) that writes Discord messages into an ECHO `Feed` and tracks progress with an ECHO `Cursor` object. That path is untouched by this design.

## Goals

- An incremental crawler that visits all messages for a configured list of channels, optionally descending sub-threads, piping each message through a `@dxos/pipeline` assembly.
- Interruptible and resumable: durable per-channel/sub-thread sync points (a non-ECHO variant of the existing `Cursor` semantics) so a stopped crawl resumes exactly where it left off.
- Messages persisted in SQLite (not ECHO) during pipeline operation.
- Fact extraction in the style of `pipeline-email` / `pipeline-rdf`.
- A standing list of user questions the pipeline attempts to answer as it crawls.
- Browser- and EDGE-capable: every environment-specific dependency is an Effect `Layer`.

## Non-goals (this phase)

- Automated task execution (schedule a meeting, file a GH issue) — the `Automation` seam is specced below but not implemented.
- The Cloudflare worker/EDGE deployment itself — seams only.
- Entity resolution beyond the existing `AgentRegistry` `sameAs` merge.
- Rich-embed/attachment ingestion (text content only, as in phase 1).
- Any change to the ECHO feed-sync path.

## Architecture

```
plugin-discord (source + token + operation trigger; ECHO feed-sync unchanged)
   └─ @dxos/pipeline-discord   (new: assembly, MessageStore, QuestionStore, answer stage)
        ├─ @dxos/crawler        (refactored: traversal engine → Stream of events, SQLite state)
        ├─ @dxos/pipeline       (Stage/Pipeline primitives)
        └─ @dxos/pipeline-rdf   (extractFactsStage/indexFactsStage, FactStore, generateQuery)
```

- `@dxos/crawler` remains source-agnostic (Slack/email sources later). Discord specifics stay in `plugin-discord`; the existing `discordSourceLayer` already implements `Source` and is unchanged.
- `@dxos/pipeline-discord` lives at `packages/core/compute/pipeline-discord` (`"private": true`), mirroring `pipeline-email`'s shape (`pipeline.ts`, `stages/`, `types/`, `testing/`). It is chat-generic in practice (the `Source` is injected) but named for its first source.

## Crawler refactor: events as a Stream

Replace the bespoke `Stage`/`runStages` dispatch with a pull-based stream:

- `Crawler.stream(config): Stream.Stream<Event, CrawlError | StateError, Source | StateStore>` — unfolds `advance()` steps into the existing typed events (`ChannelStart | Message | ThreadStart | ThreadEnd | ChannelEnd`). Event and `Target` types are unchanged.
- Downstream consumers are ordinary `@dxos/pipeline` stages (`Stage.map` / `Stage.filter`), drained by `Pipeline.run({ sink })`. Interruption is structural: interrupting the run interrupts the stream and all in-flight stage work.
- `crawler/src/Stage.ts` is deleted. `stages/agent-profile.ts` and `stages/extract-facts.ts` are rewritten as pipeline stages over `Event`. All call sites (`stories-brain` CrawlPanel/story, crawler tests, demo) are updated in the same change — no compatibility shims.
- `run(config, stages, { maxSteps })` is removed with `Stage.ts`. The generic entrypoint becomes `Crawler.stream` composed with `@dxos/pipeline` stages; `DiscordPipeline.run` (below) is the packaged assembly and returns the existing `RunSummary` shape. Source-agnostic tests compose `Crawler.stream` with `Pipeline.run` directly.
- Per-target fetch-error isolation (mark `error`, continue the frontier) stays inside `advance()` exactly as today.

### Cursor semantics: commit-after-process

Phase 1 advanced the durable cursor at fetch time, so an interrupt between fetch and stage completion could skip messages on resume. This phase separates two positions:

- **Volatile fetch position**: held in-stream while a run is live; drives pagination within the run.
- **Durable commit cursor**: the per-target row in `StateStore` (the non-ECHO `Cursor` variant: `value`, `lastRunAt`, `lastError`). It advances only from the pipeline **sink**, after a page's events have cleared every stage — the `Cursor.commit` pattern from `@dxos/types` applied to per-target SQLite rows.

Resume refetches from the last committed cursor. The overlap window (bounded by pipeline buffer sizes, default 16) is absorbed by idempotent upserts keyed on message id: at-least-once delivery, exactly-once effect. To make the sink page-aware, `Message` events carry their originating page's high-water id (`pageCursor`), so the sink can advance the target's cursor when the last event of a page commits.

The target's terminal `done` status commits the same way: `advance()` no longer writes `done` at fetch time; the `ThreadEnd`/`ChannelEnd` event flowing through the sink performs the status write. Otherwise an interrupt between fetch-drain and sink could mark a target `done` while its final page of messages was never processed, and resume would skip it.

## Storage: one SQLite database, shared SqlClient

A single database with namespaced tables; one `SqlClient.SqlClient` layer bound per environment:

- Browser: `@dxos/sql-sqlite` (re-exports `@effect/sql-sqlite-wasm`, OPFS-backed).
- Node/tests: `@effect/sql-sqlite-node` (already a `pipeline-rdf` devDep).
- EDGE (deferred): Durable Object SQLite.

| Table | Owner | Contents |
|---|---|---|
| `crawl_target` | `@dxos/crawler` `StateStore.layerSql` (new) | frontier: `id`, `channel_id`, `thread_id`, `parent_message_id`, `depth`, `position` (stack order), `status`, `cursor`, `last_run_at`, `last_error` |
| `crawl_run` | `StateStore.layerSql` | single-row run status (`idle/running/paused/done/error`) |
| `message` | `@dxos/pipeline-discord` `MessageStore` (new) | `id` (snowflake PK, upsert), `target_id`, `author_id`, `text`, `created_at`, `raw` (JSON) |
| `agent`, `agent_identifier` | `@dxos/crawler` `AgentRegistry.layerSql` (new) | stable agent ids, multi-identifier, `sameAs` merges, message stats |
| fact tables | `@dxos/pipeline-rdf` `FactStore.layer` | existing schema, unchanged |
| `question` | `@dxos/pipeline-discord` `QuestionStore` (new) | `id`, `text`, `status` (`open/answered`), `answer`, `supporting_ids` (JSON: fact/message ids), `created_at`, `updated_at` |

Schema creation/migration follows `pipeline-rdf`'s existing pattern (idempotent `CREATE TABLE IF NOT EXISTS` at layer construction). Memory layers (`layerMemory`) remain for unit tests and demos.

## Pipeline assembly

`DiscordPipeline.run(config, options)` in `@dxos/pipeline-discord`, mirroring `EmailPipeline.run`:

```
Crawler.stream(config)
  → persistMessageStage      upsert into `message` (early, so later stages are replayable offline)
  → resolveAgentStage        author → AgentRegistry stable id (tokenized by id, not display name)
  → extractFactsStage        pipeline-rdf extraction (AiService; deterministic extractor injectable)
  → agentProfileStage        counts, first/last seen
  → answerQuestionsStage     on ThreadEnd/ChannelEnd and run end: attempt open questions
  → Pipeline.run({ sink })   sink commits the per-target durable cursor per page
```

- `options`: `maxSteps` (bounded batches for pause/resume), stores/services arrive via `R` (Layers provided at the edge): `Source`, `StateStore`, `MessageStore`, `AgentRegistry`, `FactStore`, `QuestionStore`, `AiService`.
- Returns `RunSummary` (`steps`, `done`, `errored`). Re-invoking over the same database resumes; `done: false` means paused at the step bound.
- Per-message stage failures are recorded on the target (`last_error`) and do not abort the crawl, preserving phase 1's isolation contract.
- Non-LLM runs (tests, offline demo): the extraction stage accepts the deterministic extractor used by the phase-1 demo, so the full pipeline runs without an `AiService`.

## Questions and automation

- `QuestionStore` holds standing user questions. `answerQuestionsStage` fires on `ThreadEnd`/`ChannelEnd` events and once at run end (not per message — cost control). For each `open` question:
  1. Use `pipeline-rdf` `generateQuery` (NL → fact query) to pull candidate facts; include recent messages from `MessageStore` for context.
  2. Ask `AiService` to answer with citations (fact/message ids).
  3. Persist `answer` + `supporting_ids` and mark `answered`; otherwise leave `open` for the next pass.
- **Automation seam (specced only)**: an `Automation` record binds a trigger (a standing question or predicate over new facts) to an `Operation` DXN plus an input mapping. When a trigger matches, the runtime invokes the operation via `Operation.invoke` (e.g. draft a meeting, file a GH issue) with human confirmation required by default. Implementation, storage, and UI are a later phase; this phase only ensures the answer stage's output shape (question id → answer + supporting ids) is sufficient input for such triggers.

## plugin-discord wiring

- New operation `DiscordOperation.CrawlChannels` alongside `SyncDiscordChannel`:
  - Input: connection ref, channel ids, `descendThreads`, `maxDepth`, `maxDays`, `maxSteps`.
  - Resolves the bot token from the `Connection`, binds `discordSourceLayer` + OPFS `SqlClient` + store layers, runs `DiscordPipeline.run` in bounded batches; surfaces progress via the existing toast pattern.
  - Pause = stop invoking; resume = invoke again (state is in SQLite).
- The ECHO `Cursor`/`Feed` sync path is untouched. An ECHO mirror of crawl status (a summary `Cursor` for UI visibility) is deferred.

## Testing

- **Crawler**: extend the existing suites — stream unfold over memory `Source`, interrupt/resume with commit-after-process semantics (interrupt mid-page, assert refetch + no skipped/duplicated effects), frontier/thread descent unchanged, `StateStore.layerSql` against sqlite-node incl. resume across a fresh layer over the same file.
- **pipeline-discord**: end-to-end over the deterministic extractor (no LLM in CI): crawl fixture channels → assert `message` rows, agent registry contents, facts, and resumability. Answer stage covered with a memoized-LLM test (per `regenerate-memoized-llm` conventions).
- **Storybook**: rewire the `stories-brain` CrawlPanel to the new assembly (crawl → facts → questions), verifying the browser (wasm SQLite) binding.
- Every step is runnable locally via `moon run crawler:test` / `moon run pipeline-discord:test` / `moon run storybook-react:serve`.

## EDGE readiness

All environment dependencies are Layers (`Source`, `SqlClient`, `AiService`). A Cloudflare worker binding (DO SQLite `SqlClient`, scheduled/alarm-driven `run` batches) is a drop-in later phase; nothing in this design assumes a DOM or Node API outside the layer implementations.

## Impacted call sites (updated in the same change, no shims)

- `packages/core/compute/crawler/*` — stream refactor, `Stage.ts` removed, stages rewritten, new `layerSql` implementations.
- `packages/stories/stories-brain` — CrawlPanel/SemanticFactsCrawler story rewired to the pipeline assembly.
- `packages/plugins/plugin-discord` — new `CrawlChannels` operation; `discord-source.ts` unchanged.

## Resolved decisions

1. Crawler refactored onto `@dxos/pipeline` (no adapter, no parallel stage abstractions).
2. One SQLite database with a shared `SqlClient`; per-concern stores as separate Layers over it.
3. Questions implemented now; automated task operations specced only.
4. Browser-first with EDGE-ready seams; worker deployment deferred.
