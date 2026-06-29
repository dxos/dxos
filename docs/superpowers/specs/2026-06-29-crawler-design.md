# @dxos/crawler — Incremental Source Crawl + Stage Pipeline

- **Status:** Draft (awaiting review)
- **Date:** 2026-06-29
- **Related:** [@dxos/semantic-index design](./2026-06-27-semantic-index-design.md), `packages/plugins/plugin-discord`

## 1. Problem

We have (a) a connector-style incremental sync in `plugin-discord` and (b) a fact-extraction
pipeline in `@dxos/semantic-index`. We want a single mechanism that, given a Discord token, can:

1. Enumerate channels.
2. Crawl all messages across a configured set of channels, descending depth-first into
   sub-threads when configured.
3. Pass each message through a configurable, ordered **stage pipeline** (extract facts, update
   user profiles, summarize threads, and — later — compile FAQs, tag messages).
4. Track every user and accumulate per-user metadata (message counts, frequency, profile).
5. Start/stop on demand and **resume from the last sync point, per thread**.

It must run **in the browser** (Composer) and — primarily — **headless as a Cloudflare Worker**.

## 2. Constraints & grounding

These are verified against the current code on this branch, not assumed:

- `SemanticPipeline.run(docs: ExtractDocument[])` is the ingest entrypoint, where
  `ExtractDocument = { text: string; source: string; author?: string; date?: string }`.
  The semantic-index integration test maps a Discord message to
  `{ text, source: \`discord:${messageId}\`, date: created, author: sender.name }`. The crawler's
  `extract-facts` stage formalizes exactly this mapping.
- `@dxos/semantic-index` exposes `SemanticStore.layerMemory` (browser/test) and
  `SemanticStore.layer` + `SqlClient` (worker/node). The crawler reuses these directly for the
  facts stage; it does **not** reimplement fact storage.
- semantic-index already de-duplicates at the fact level via a per-`source` text-hash cursor
  (unchanged re-ingest skips the LLM). The crawler's own per-thread cursors sit **on top of**
  this — they bound *what we fetch*, semantic-index bounds *what we re-extract*.
- `plugin-discord` already has a testable `fetchChannelMessages()` (dfx + CORS-proxy transport,
  snowflake pagination, thread discovery) and a 216-message fixture, now mirrored at
  `semantic-index/src/testing/discord-messages.json`. The Discord `Source` adapter wraps these;
  the fixture backs the crawler's deterministic test.
- Cloudflare Workers are evicted between requests and bounded on CPU/wall-clock. Resumability
  must come from **persisted state**, never an in-memory continuation.

## 3. Architecture

```
@dxos/crawler                 (new; pure Effect — no DOM, no Composer, no ECHO deps)
  ├─ crawl loop + frontier     depth-first thread descent, resumable via StateStore
  ├─ Stage interface + stages  extract-facts, user-profile, summarize-thread (v1)
  ├─ StateStore interface      cursors, frontier, user profiles, stage artifacts, run status
  ├─ Source interface          listChannels / fetchMessages / discoverThreads
  └─ Driver contract           advance() one bounded unit; persist; report done|more

plugin-discord                 (adapter + browser host)
  ├─ DiscordSource             implements Source over existing fetchChannelMessages()/dfx
  ├─ EchoStateStore            frontier/cursors/profiles/artifacts as ECHO objects+relations
  └─ BrowserDriver             runs advance() in an interruptible Effect fiber

apps/crawler-worker            (new Cloudflare Worker entrypoint)
  ├─ DiscordSource             same adapter (pure Effect, runs server-side)
  ├─ SqliteStateStore          tables in the Durable Object's SQLite
  └─ WorkerDriver              DO alarm runs a CPU-budgeted batch of advance(); re-arms alarm
```

`@dxos/crawler` depends only on `@dxos/semantic-index`, `@dxos/ai` (for `AiService`),
`@dxos/errors`, and `effect`. `Source` and `StateStore` are the two seams; everything
Discord- or runtime-specific lives behind them. The name is source-agnostic because the same
core is intended for non-Discord sources later.

## 4. Event & frontier model

The crawl loop emits a typed event stream that stages consume:

```ts
type CrawlEvent =
  | { _tag: 'ChannelStart'; target: CrawlTarget }
  | { _tag: 'Message'; target: CrawlTarget; message: CrawlMessage; author: CrawlUser }
  | { _tag: 'UserSeen'; author: CrawlUser }            // emitted with each Message
  | { _tag: 'ThreadStart'; target: CrawlTarget; parentMessageId: string }
  | { _tag: 'ThreadEnd'; target: CrawlTarget }         // triggers summarize/aggregate stages
  | { _tag: 'ChannelEnd'; target: CrawlTarget };
```

`CrawlMessage` and `CrawlUser` are source-neutral shapes (id, text, author, timestamp, raw
metadata bag) the Discord adapter populates; the core never sees a Discord type.

**Frontier** is a *persisted* LIFO stack of crawl targets:

```ts
type CrawlTarget = {
  id: string;                  // stable: `${channelId}` or `${channelId}:${threadId}`
  channelId: string;
  threadId?: string;
  parentMessageId?: string;
  cursor?: string;             // snowflake — the per-thread sync point
  depth: number;
  status: 'pending' | 'active' | 'done' | 'error';
  lastError?: string;          // set when status === 'error'
};
```

Depth-first descent: while draining a channel page, discovered threads are pushed onto the stack
and fully drained before the parent continues. Because the **frontier and per-target cursors both
live in the StateStore**, resume after stop/eviction is "pop the next target and continue" — there
is no in-memory state to lose. `maxDepth` (config) bounds recursion.

## 5. Execution / resumption model

Core exposes a single resumable step:

```ts
// Does ONE bounded unit: fetch one page (or one thread step), run its events through the
// stages, persist cursor + frontier, return whether more work remains.
const advance: (ctx: CrawlContext) => Effect.Effect<StepResult, CrawlError, CrawlDeps>;
type StepResult = { _tag: 'more' } | { _tag: 'done' };
```

Two thin drivers call `advance` at different cadences:

- **BrowserDriver** — loops `advance` in an interruptible fiber. `start` = fork, `stop` =
  interrupt. State is persisted each unit, so a page reload resumes from the StateStore.
- **WorkerDriver (Durable Object)** — each DO **alarm** runs a CPU-budgeted batch of `advance`
  calls (`batch.maxStepsPerTick`), persists, and re-arms the alarm if `more`. `start` = arm alarm,
  `stop` = cancel alarm + set status `paused`. DO eviction is safe — all state is in DO-SQLite.

**Alternatives rejected:** a single long-running fiber (dies on CF wall-clock/eviction); CF
Queues/Workflows per target (durable but heavier infra, worse browser parity, and depth-first
ordering is awkward to express as a queue).

## 6. Stage interface

```ts
interface Stage {
  readonly name: string;
  readonly handles: ReadonlyArray<CrawlEvent['_tag']>;   // events this stage wants
  apply(event: CrawlEvent, ctx: StageContext): Effect.Effect<void, StageError, StageDeps>;
}

type StageContext = {
  store: StateStore;
  semantic: SemanticStore;       // from @dxos/semantic-index
  ai: AiService.AiService;       // for LLM stages
  config: SyncConfig;
};
```

Stages run in configured order for each event. A stage error is isolated — it is a typed
`StageError` (via `BaseError.extend`), recorded against the target's `lastError`, and the crawl
continues (matching the per-target isolation `plugin-discord` already uses). semantic-index is
**just one stage**, not a privileged path.

## 7. StateStore interface (two implementations)

```ts
interface StateStore {
  // frontier
  pushTargets(targets: CrawlTarget[]): Effect.Effect<void, StateError>;
  popTarget(): Effect.Effect<CrawlTarget | undefined, StateError>;
  setCursor(targetId: string, cursor: string): Effect.Effect<void, StateError>;
  setTargetStatus(targetId: string, status: CrawlTarget['status'], error?: string):
    Effect.Effect<void, StateError>;
  // users
  upsertUserProfile(delta: UserProfileDelta): Effect.Effect<void, StateError>;
  // stage artifacts (summaries, tags, faq, …)
  putArtifact(kind: string, key: string, value: unknown): Effect.Effect<void, StateError>;
  // run control
  setRunStatus(status: 'running' | 'paused' | 'done' | 'error'): Effect.Effect<void, StateError>;
  getRunStatus(): Effect.Effect<'running' | 'paused' | 'done' | 'error', StateError>;
}
```

- **EchoStateStore** (browser, in `plugin-discord`): frontier + cursors as `SyncBinding`-style
  relations; user profiles and stage artifacts as ECHO objects so Composer can render them.
- **SqliteStateStore** (worker, in `apps/crawler-worker`): tables in the DO's SQLite — the same
  store-swap pattern semantic-index uses (`layer` vs `layerMemory`). A memory impl backs tests.

## 8. Configuration

```ts
type SyncConfig = {
  channels: ChannelSelector[];        // explicit ids and/or guild glob
  descendThreads: boolean;
  maxDepth?: number;                  // thread recursion bound
  seed: { maxDays?: number };         // initial lookback when a target has no cursor
  batch: { pageSize: number; maxStepsPerTick: number; concurrency: number };
  stages: StageConfig[];              // ordered; each { name; enabled; params }
};
```

## 9. v1 stages

1. **extract-facts** — on `Message`: call
   `SemanticPipeline.run([{ text, source: \`discord:${messageId}\`, author, date }])`. The
   message's own text-hash cursor inside semantic-index makes re-ingest idempotent.
2. **user-profile** — on `UserSeen`/`Message`: `store.upsertUserProfile` incrementally maintaining
   message count, first/last seen, frequency buckets, and the Discord author metadata bag.
3. **summarize-thread** — on `ThreadEnd`: an `AiService` summary over the thread's messages →
   `store.putArtifact('summary', threadId, …)`. LLM-heavy, so gated by config.

**Scaffolded but deferred (interface only, not wired in v1):** `faq-compile`, `message-tag`.
Raw-message persistence to a feed is an optional browser-only sink stage, not core v1.

## 10. Error handling

- Domain errors are typed: `CrawlError`, `StageError`, `StateError` via `BaseError.extend` (from
  `@dxos/errors`) so callers recover with `Effect.catchTag`. No untyped `Error` in error channels.
- Per-target isolation: a failing target is marked `status: 'error'` with `lastError`; sibling
  targets proceed.
- Transport rate limits stay delegated to dfx inside the Discord adapter (already handles 429
  retry); the core is transport-agnostic.

## 11. Testing

Fixtures-first, deterministic, no token:

- A `FixtureSource` backed by `semantic-index/src/testing/discord-messages.json` (216 messages,
  includes threads) implements `Source`.
- A unified, parametrized `TestLayer(opts?)` wires `FixtureSource` + memory `StateStore` +
  `SemanticStore.layerMemory` + `mockAiService`/`countingAiService` (the helpers semantic-index
  already exports).
- Assertions: depth-first traversal order; **per-thread resume** after a simulated stop
  (re-run `advance` from persisted frontier and confirm no message is re-emitted / no fact
  duplicated); fact count via `countingAiService`; user-profile aggregation; one thread summary
  per `ThreadEnd`.
- Tests live beside modules as `*.test.ts` using `describe`/`test` per repo convention; prefer
  extending one cohesive suite over many fragmented files.

## 12. Relationship to existing sync

The existing `SyncDiscordChannel` connector operation (flat channel → `Channel.feed`) stays as-is
for the simple "mirror messages into Composer" use case. The crawler is the richer path
(threads + stages + semantic index) and is additive in v1; a later change may let the connector
operation delegate to the crawler, but that is out of scope here.

## 13. Build order

1. Core skeleton: `Source`, `StateStore`, `Stage`, `CrawlEvent`, `CrawlTarget`, `advance`,
   `CrawlError`/`StageError`/`StateError`.
2. `FixtureSource` + memory `StateStore` + `TestLayer`; crawl-loop test (traversal + resume) with
   zero stages.
3. `extract-facts` stage over `SemanticStore.layerMemory`; assert against the fixture.
4. `user-profile` stage + aggregation assertions.
5. `summarize-thread` stage (gated) with `mockAiService`.
6. `DiscordSource` in `plugin-discord` (wrap `fetchChannelMessages()`); `EchoStateStore`;
   `BrowserDriver`.
7. `apps/crawler-worker`: `SqliteStateStore` over DO-SQLite; `WorkerDriver` (alarm loop).
8. (Deferred) `faq-compile`, `message-tag`, feed sink stage.

## 14. Out of scope (v1)

- FAQ compilation and message tagging (interfaces scaffolded only).
- Non-Discord source adapters.
- Vector/embedding retrieval (owned by semantic-index's own roadmap).
- ECHO replication inside the worker (the worker uses SqliteStateStore + semantic-index SQLite,
  not a replicated space).
