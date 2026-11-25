# @dxos/crawler — Incremental Source Crawl + Stage Pipeline

- **Status:** Phase 1 prototype implemented (`packages/core/compute/crawler`); browser/worker hosts deferred.
- **Date:** 2026-06-29
- **Related:** [@dxos/semantic-index design](./2026-06-27-semantic-index-design.md), `packages/plugins/plugin-discord`

> Sections 1–14 are the original design. Sections 15–18 record decisions locked during review,
> what the phase-1 prototype actually implements, and research-informed next steps.

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
  this — they bound _what we fetch_, semantic-index bounds _what we re-extract_.
- `plugin-discord` already has a testable `fetchChannelMessages()` (dfx + CORS-proxy transport,
  snowflake pagination, thread discovery) and a 216-message fixture, now mirrored at
  `semantic-index/src/testing/discord-messages.json`. The Discord `Source` adapter wraps these;
  the fixture backs the crawler's deterministic test.
- Cloudflare Workers are evicted between requests and bounded on CPU/wall-clock. Resumability
  must come from **persisted state**, never an in-memory continuation.

## 3. Architecture

```text
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
  | { _tag: 'UserSeen'; author: CrawlUser } // emitted with each Message
  | { _tag: 'ThreadStart'; target: CrawlTarget; parentMessageId: string }
  | { _tag: 'ThreadEnd'; target: CrawlTarget } // triggers summarize/aggregate stages
  | { _tag: 'ChannelEnd'; target: CrawlTarget };
```

`CrawlMessage` and `CrawlUser` are source-neutral shapes (id, text, author, timestamp, raw
metadata bag) the Discord adapter populates; the core never sees a Discord type.

**Frontier** is a _persisted_ LIFO stack of crawl targets:

```ts
type CrawlTarget = {
  id: string; // stable: `${channelId}` or `${channelId}:${threadId}`
  channelId: string;
  threadId?: string;
  parentMessageId?: string;
  cursor?: string; // snowflake — the per-thread sync point
  depth: number;
  status: 'pending' | 'active' | 'done' | 'error';
  lastError?: string; // set when status === 'error'
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
  readonly handles: ReadonlyArray<CrawlEvent['_tag']>; // events this stage wants
  readonly apply: (event: CrawlEvent) => Effect.Effect<void, StageError, Env>;
}
```

Dependencies are provided via the Effect context (`Env`) rather than an explicit context argument:
a stage requires whatever services it uses (`StateStore`, `SemanticStore` from `@dxos/semantic-index`,
`AiService` for LLM stages, the `AgentRegistry`), and the runtime supplies them through layers.

Stages run in configured order for each event. A stage error is isolated — it is a typed
`StageError` (via `BaseError.extend`), recorded against the target's `lastError`, and the crawl
continues (matching the per-target isolation `plugin-discord` already uses). semantic-index is
**just one stage**, not a privileged path.

## 7. StateStore interface (two implementations)

```ts
interface StateStore {
  // frontier
  pushTargets(targets: CrawlTarget[]): Effect.Effect<void, StateError>;
  listTargets(): Effect.Effect<CrawlTarget[], StateError>;
  nextActionable(): Effect.Effect<CrawlTarget | undefined, StateError>; // top pending/active, no pop
  hasActionable(): Effect.Effect<boolean, StateError>;
  setCursor(targetId: string, cursor: string): Effect.Effect<void, StateError>;
  setStatus(targetId: string, status: CrawlTarget['status'], error?: string): Effect.Effect<void, StateError>;
  // run control (RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error')
  setRunStatus(status: RunStatus): Effect.Effect<void, StateError>;
  getRunStatus(): Effect.Effect<RunStatus, StateError>;
}
```

Agent identity moved to a dedicated `AgentRegistry` service (canonical agents keyed by stable id,
with `resolve`/`observe`/`merge`); stage artifacts (summaries, tags, FAQ) are deferred.

- **EchoStateStore** (browser, in `plugin-discord`): frontier + cursors as `SyncBinding`-style
  relations; agent profiles as ECHO objects so Composer can render them.
- **SqliteStateStore** (worker, in `apps/crawler-worker`): tables in the DO's SQLite — the same
  store-swap pattern semantic-index uses (`layer` vs `layerMemory`). A memory impl backs tests.

## 8. Configuration

```ts
type SyncConfig = {
  channels: ChannelSelector[]; // explicit ids and/or guild glob
  descendThreads: boolean;
  maxDepth?: number; // thread recursion bound
  seed: { maxDays?: number }; // initial lookback when a target has no cursor
  batch: { pageSize: number; maxStepsPerTick: number; concurrency: number };
  stages: StageConfig[]; // ordered; each { name; enabled; params }
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

## 15. Decisions locked during review

1. **Package name:** `@dxos/crawler` (source-agnostic; intended for server-side reuse).
2. **Worker host:** the Cloudflare Worker driver lives in **`@dxos/edge`**, and is **deferred** — phase 1
   ships the browser/in-process path with in-memory stores only.
3. **State store:** pluggable `StateStore`; the ECHO-backed (browser) and DO-SQLite (worker) impls are
   deferred. The browser impl may generalize `SyncBinding` to per-thread targets.
4. **Entity resolution is two distinct problems** (a key correction):
   - **Layer 1 — agent identity (authoritative).** Senders/authors are _known_ by a stable identifier
     (Discord `userid`, later email). Resolved by exact lookup into an **agent registry** — a first-order
     concept, _not_ part of fuzzy mention-extraction. Each agent carries a SET of identifiers across
     namespaces; identity-merge (`sameAs`) unions them (e.g. when an email corpus later matches a Discord
     user). Tokenized by stable id, never display name.
   - **Layer 2 — mention resolution (fuzzy).** Names _mentioned in text_ resolve to ECHO objects via the
     shared `EntityLookup` (FTS + context). This is where the semantic index adds value: accumulated facts
     disambiguate ambiguous mentions; thread participants are supplied as `LookupContext` priors.
5. **Shared entity-resolution abstraction** (`EntityLookup` / `resolveEntities` / `LookupContext`) moves
   into **`@dxos/extractor`** (alongside `Resolver`/`getOrCreate`); transcription-pipeline rewires onto it
   (no compat shim). Fulfills transcription's documented "LLM NER + context disambiguation" TODO.
6. **Sender/interlocutor context = provenance metadata, not facts.** Minting `(Alice) sent (msgX)` facts
   per message would dwarf the real assertions. Authorship lives in `Attribution` (`source` = message DXN,
   `agent` = resolved sender). The agent is an ordinary `Type.Entity` whose `ref` is populated — **no
   `Attribution` schema change**. Thread participants live in the StateStore, fed to the resolver as
   context.
7. **Fact scoring is a deferred, query-time function** — `weight(fact) = f(agent role/team, expertise,
forum kind, recency, confidence, corroboration)`. Phase 1 only guarantees the _inputs_ are captured
   (resolved agent, profile, source metadata). **Learned expertise is itself facts** (`(Alice) hasExpertise
(X)`), which feed the scorer — closing the loop. Canonical token = ECHO `Person` DXN in the browser;
   the raw identifier (e.g. `discord-user:<id>`) is the provisional token in the deferred worker.

## 16. Phase 1 — implemented prototype

Built in `packages/core/compute/crawler` (`@dxos/crawler`), pure Effect, depends only on
`@dxos/semantic-index`, `@dxos/ai`, `@dxos/errors`, `@dxos/log`, `effect`. Green build + lint; 7 tests pass.

- **Crawl loop** — `advance()` (one resumable step) + `run()` (loop, with `maxSteps` for bounded
  start/stop). Depth-first descent into threads via a persisted LIFO frontier; per-target snowflake
  cursors. Resumability lives entirely in the `StateStore` (no in-memory continuation).
- **Typed event stream** — `ChannelStart | Message | ThreadStart | ThreadEnd | ChannelEnd`.
- **`Source`** seam — `FixtureSource` replays a captured Discord fixture (no token). The live
  `DiscordSource` (wrapping `fetchChannelMessages()`) is the next adapter.
- **`StateStore`** seam — in-memory frontier/cursors/run-status impl. ECHO + DO-SQLite impls deferred.
- **Agent registry** (`AgentRegistry`) — first-order, identifier-keyed, multi-identifier, with
  `observe` (stats), `resolve`, and `merge` (`sameAs` union). In-memory; ECHO-`Person` backing deferred.
- **Stages** — `extract-facts` (resolves author → agent, runs `SemanticPipeline.run` with `source =
discord:<id>`), `agent-profile` (counts, first/last seen). `summarize-thread` is specced; not yet wired.
- **Topics output** — `extractTopics()` aggregates the fact graph into topics ranked by reach (distinct
  agents), excluding agent entities. Each topic's `entity` drives `SemanticStore.query({ entity })` — the
  bridge from "topics discussed" to "ask the system".
- **Deterministic extractor** (`testing/`) — a content-aware `AiService` fake that derives facts from real
  message text, so the fact graph is genuinely populated **offline**; swap in a live `AiService` for
  model-quality extraction over the same pipeline.
- **Runnable demo** — `moon run crawler:demo` crawls the real fixture and prints crawl stats, the agent
  registry, ranked topics, and a sample topic query. (Runs via vitest, since `@dxos/ai` has a `parsimmon`
  CJS/ESM interop that breaks under `tsx`.)

**Not yet implemented (next):** `entity-resolution` stage (Layer-2, on the shared
`@dxos/extractor` lookup, populating `Entity.ref`); `summarize-thread`; ECHO `StateStore`/agent backing;
the `@dxos/edge` worker driver.

## 17. Research-informed model extensions (future)

A query/insight-catalog study (Discord support + company email corpora) surfaced gaps worth folding into
the **semantic-index** model to unlock the high-value queries and the "canonical idea thread" vision:

- **Speech-act type** on the assertion (`asks | answers | requests | commits | proposes | reports |
confirms | decides`) — distinct from the domain `predicate`. Powers unanswered-question, commitment, and
  decision-log queries.
- **Fact→fact typed edges** (`answers | confirms | contradicts | supersedes | fulfills | cites`) — the
  single biggest gap; many marquee queries are traversals over these. These edges are also the spine of
  **idea threads** (vs message threads).
- **Source/agent class on `Attribution`** (`sourceKind`, `agentRole`) — makes the public/private/
  third-party distinction and the deferred scoring queryable without external joins.
- **Richer entity kinds** (`feature`, `error`, `task`, `decision`, `document`, `release`) and a
  topic/`broader` grouping so "all auth questions" is one query.

These are semantic-index changes, tracked here because the crawler is their primary producer.

## 18. References

- Design research (query/insight catalog; idea-thread construction) was conducted during brainstorming;
  the idea-thread construction study (argumentation mining / discourse graphs / IBIS / TDT) informs the
  fact→fact edge vocabulary above.

## 19. Temporal dynamics: send-time, medium, TTL / atrophy, as-of

Facts are not timeless; weight and relevance change with time and channel.

- **Send-time & medium are weighting inputs.** Each fact already carries `generatedAtTime` (when it was
  said) and `recordedAt` (when ingested). Add **`medium`** to source metadata
  (`discord | meeting | email | article | …`): a decision minuted in a meeting or committed in email
  typically weighs more than a public Discord aside. Medium + send-time join the scoring inputs in §15.7.
- **TTL / atrophy.** Facts lose weight over time via a **decay function**, so stale or likely-outdated
  facts fade _without being deleted_ (the append-only model is preserved — atrophy is computed at
  query/scoring time, not by mutation). The decay rate is keyed by predicate/entity kind and medium:
  durable facts (a birthdate) barely decay; volatile ones (status, plans, "currently working on") decay
  fast. This is how the system "forgets" things that may no longer be true.
- **As-of / time-window queries.** Support "**what did we know as of T?**" by filtering on `recordedAt <= T`
  (and `validFrom`/`validTo` for when the asserted state _held_). This enables both historical
  reconstruction and forgetting (exclude atrophied/superseded facts), and pairs with the `supersedes`
  fact→fact edge (§17). semantic-index's append-only conflicting-facts + temporal validity already
  underpin as-of; `medium` and the atrophy function are the additions.

## 20. Subject framing — graph-as-tool for grounded LLM answers

The payoff: an LLM answers about a subject by **using the fact graph as a tool**, not from parametric
memory alone.

1. **Frame what is known.** A `subject(entity)` tool assembles a dossier from the graph: every fact where
   the entity is subject/object, with agents, valence, time, and relationship edges — i.e. an attributed,
   time-stamped, provenance-carrying picture of what is known and how certain/contested it is.
2. **Augment with ECHO.** Join the entity's `ref` to its ECHO object (Person/Org/Event) for structured
   fields and links the graph doesn't hold.
3. **Research & fact-check.** The LLM then calls _other_ tools (web research, email search, verification)
   to extend and check the framed dossier, citing sources.

This grounded loop (graph priors + ECHO structure + research tools) is materially more powerful and less
hallucination-prone than an LLM-only system, because every claim is attributed, dated, valenced, and
citable, and disagreements/atrophy are explicit rather than averaged away.

## 21. Example queries to support

These motivate concrete model additions (current-user-as-agent, event entities, n-ary relationship facts,
and the fact→fact edges of §17):

- **"Who is Chad?"** — subject dossier (§20): aggregate all facts about entity `chad` (+ ECHO Person),
  summarized by role/expertise/recent activity, with citations and confidence; atrophy de-emphasizes stale
  facts.
- **"Who has Chad ever introduced me to?"** — relationship traversal over `introduced` facts
  (`(chad) introduced (me) → (X)`). Requires **the current user as a first-class agent** and an n-ary
  `introduced` relation (reified: introducer, introducee, recipient, time, source).
- **"Who did I meet at the BlueYard event?"** — event-scoped relationship: `(me) met (X)` whose context is
  the `BlueYard` **event entity**. Requires event entities and event-scoping on facts.

## 22. Sidekick plugin (concept)

A plugin that builds a small, **ephemeral, locally-scoped** knowledge base of the _user's_ priorities and
goals — by **interrogating the user** (and brainstorming a plan with them) — then layers that kbase over
the persistent fact graph + agent registry to do real work: triage and analyze emails, draft auto-responses
to colleagues / users / customers in the user's voice and priorities, and surface what needs attention.

The sidekick kbase is distinct from the durable fact graph (session/task-scoped, not append-only history),
and it feeds **relevance re-weighting**: user priorities bias the §15.7 scorer toward facts that matter for
the task at hand. This is a downstream consumer of the crawler/semantic-index stack, tracked here to keep
the producing model aligned with it.
