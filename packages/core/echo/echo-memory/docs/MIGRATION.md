# Migration to `@dxos/echo-memory`

Tasks to replace `BrainService` (`@dxos/plugin-agent`) and `FactStore` (`@dxos/pipeline-rdf`) with
`MemoryService`. The spec is `../SPEC.mdl` (`org.dxos.echo-memory`); requirement ids below point into it.

Order: phases 1–3 add the new packages without touching callers; phase 4 marks the old surfaces
deprecated; phases 5–7 move callers; phase 8 deletes the old code. Open spec questions (Q-1 to Q-5)
block only the tasks that name them.

## 1. `@dxos/echo-memory` (interface) — done

- [x] Package `packages/core/echo/echo-memory` (`"private": true`); runtime dependencies `effect` and
      `@dxos/errors` only [F-1.2].
- [x] Fact schemas in `Fact`: `Fact`, `Assertion`, `Term` (`EntityTerm`, `LiteralTerm`), `Entity`,
      `EntityKind`, `Attribution`, `Factuality`, `Illocution`, `PredicateEntry`, `GraphStatus` [F-2.1].
      They are copies with branded ids; `pipeline-rdf` keeps its own until phase 7 points it at these.
- [x] Branded ids `FactId`, `GraphIri`, `EntityKey`, `SourceUri` (in `Fact`), `SubscriptionId`,
      `MemoryEventId` (in `Subscription`) [F-2.4].
- [x] `MemoryQuery`: the kinds `facts`, `graphs`, `sparql`, `predicates`, `cursor`, a constructor per kind,
      `results` (a result schema per kind) and `ResultOf<Q>` [F-3.2, F-3.7]; `FactQuery`, `SparqlTerm`,
      `SparqlRow`.
- [x] Pure functions `graphOf`, `graphStatus`, `currentFacts`, `termValue`, `termText`, `factText`
      [F-2.3]; no `n3` import.
- [x] `MemoryError` [F-6.1]; `MemoryService` tag and `Service` API, `ReadCursor`, `PutOptions`;
      `Subscription`, `MemoryEvent`, `MAX_SUBSCRIPTIONS` [F-4.1].
- [x] Tests: JSON round trip of `Fact`, every query kind, `Subscription` and `MemoryEvent` (T-6); a fact in
      today's stored shape decodes unchanged [F-2.1]; `currentFacts`; query answer types.
- [ ] `MemoryWire`: the JSON-in / JSON-out codec every transport shares (`docs/PACKAGES.md`).
- [ ] Add the `## Rules` check (`no-implementation-deps`) to CI's agentic review scope.

## 2. `@dxos/echo-memory-sqlite` (local implementations) — first cut

`MemorySqlite.make(storage)` serves `MemoryService` over one SQLite database. The knowledge base is
`FactStoreLive` from `@dxos/pipeline-rdf`, used as a library. The event base is new tables beside it,
evaluated by `@dxos/brain`'s `Evaluator`. The code assumes the first option of each open question:
Q-1 (keep the compute dependencies), Q-2 (keep SPARQL), Q-3 (no change stream), Q-4 (shared facts),
Q-5 (event-base reads stay ops).

- [x] Package `packages/core/echo/echo-memory-sqlite` (`"private": true`).
- [x] Event base, persisted: `memory_subscriptions`, `memory_events` (acknowledged rows kept as the dedup
      record, at most `MAX_EVENTS` each), `memory_state` (last evaluation time) [F-4, F-7.2]. Ported from
      EDGE's `BrainObject`.
- [x] Time-driven rules: a fiber in the layer's scope sleeps until `nextDueAt`, is woken early by
      `put`, `subscribe` and `reset`, and a reopened memory catches up on open [F-4.5, F-7.5].
- [x] `layer(storage)`, `layerFile(path)`, `layerMemory` [F-7.1].
- [x] Tests T-1 to T-5, owner filter, unsubscribe-once, rules that do not compile, a clock-driven wake,
      and SPARQL answers.
- [ ] Move the store itself (`fact-store-live.ts`, `internal/sparql/*`, `Mapping`, `Vocab`, `Ontology`
      resolution, TriG) out of `pipeline-rdf` into this package, so it stops depending on `pipeline-rdf`.
- [ ] `put` stores facts and moves the cursor in two transactions (facts first, so a failure re-reads
      the source and never skips it); make it one, as F-3.1 says.
- [ ] HTTP client layer and fetch-style handler, from `FactStoreHttp`, extended to the event-base ops
      [F-7.3]. Move `pipeline-rdf/src/testing/fact-server.ts` here.
- [ ] Port the remaining cases of `fact-store.test.ts`, `fact-store-live.test.ts` and `BrainMemory.test.ts`.

## 2b. The fact feed [F-9] — first cut

- [x] `facts` is a `FeedProtocol.WellKnownNamespaces` entry.
- [x] `FactLog`: `put` and `reset` entries; `FactLog.memory()` and `FactLog.feed({ feeds, spaceId, feedId })`
      over `@dxos/feed`'s `FeedStore`.
- [x] `MemorySqlite.make(storage, { log })`: writes go to the log first and are applied by reading it back;
      the store keeps its log cursor (`memory_state.log_cursor`), catches up on open, and follows entries
      other replicas add.
- [x] Tests (T-8): an empty store rebuilds from the log; resets replay; a replica follows another's
      writes and wakes its own subscriptions; rebuild from a real feed in the `facts` namespace.
- [ ] Apply an entry and move the log cursor in one transaction (today a crash between them replays the
      entry, which is harmless since `put` is idempotent and `reset` replays to the same state).
- [x] `@dxos/sparql-sqlite/async`: `SqlSparqlEngineAsync` over `SqlClient`, one engine shared with the sync
      variant; every benchmark query answers the same on both [F-9.7].
- [ ] Async variants of pipeline-rdf's store (`FactStoreLive`) and of `MemorySqlite`, over
      `SqlSparqlEngineAsync` and `SqlClient`, so the backend needs no synchronous handle.
- [ ] `MemoryHost` in client-services: one `MemorySqlite` per open space over the host's database, with a
      `FactLog.feed` over the host's `FeedStore`; served over the client-services bridge through
      `MemoryWire` [F-9.1]. Needs the async `MemorySqlite`.
- [ ] Choose the space's fact feed id (one feed per space) and create it with the space.
- [ ] Replicate the `facts` namespace through the feed sync client; EDGE must accept it first
      (`docs/PACKAGES.md` question 3).

## 3. EDGE implementation (`dxos/edge`) — missing

- [ ] Memory moves from the per-agent `BrainObject` to one Durable Object per space, built with
      echo-memory-sqlite's `layer(ctx.storage.sql)` [F-7.4]. `BrainObject` keeps sessions, provisioning
      and identity, which are not memory. The space DO's alarm drives time-driven rules; the memory
      core exposes that to the DO, not through MemoryService [F-4.5].
- [ ] Migrate data: merge each agent's facts, cursors, triggers and outboxes from its `BrainObject`
      into its space's memory; set each subscription's `owner` to the agent (Q-4 decides whether facts
      stay private to the agent).
- [ ] `BrainServiceEntrypoint` and `api.ts`: expose the `MemoryService` ops over RPC, with `query` taking a
      MemoryQuery as JSON and returning its result encoded by kind [F-3.7]; remember `rpcMethods` in `durable-objects.ts`.
- [ ] `brain/types.ts`: drop `BrainFactQuery`, `BrainReadCursor`, `MAX_TRIGGERS` in favour of the
      echo-memory types.
- [ ] `operation-service/src/brain-service.ts`: provide `MemoryService` instead of `BrainService`.
- [ ] Tests: `edge/test/brain.node.test.ts`, `brain-admin.node.test.ts`, `discord-agent/recall.node.test.ts`,
      `discord-backindex.node.test.ts`, `sample-host-services/*`.
- [ ] Link locally with `pnpm link-packages` while both sides change; bump the catalog once dxos lands.

## 4. Deprecate [F-8.1]

- [x] `@deprecated` JSDoc on `BrainService`, `FactStore` and `FactStoreApi`, naming the replacement.
- [ ] The same on `BrainMemory`, `BrainWire`, `FactStoreLive`, `FactStoreHttp`, `SemanticQuery`,
      `SemanticIndexError` and `BrainError`.

## 5. Move `@dxos/plugin-agent`

- [ ] Split `wake` out of `BrainService` into an agent-runtime service in plugin-agent [F-8.3]; keep
      `wakeBlocks` there.
- [ ] `Trigger` stays; map it to `Subscription` (`rules` + `payload: encodeTrigger(trigger)`) and back.
      Replaces `toSubscription`, `fromEvaluator`, `encodeEvent`/`decodeEvent`.
- [ ] `brain/BrainMemory.ts` → the space's `MemoryService` from echo-memory-sqlite `layerMemory` (or
      `layerFile` for persistence) plus the trigger mapping; `subscriptions(agent)` becomes
      `subscriptions(owner)` [F-5.3].
- [ ] `brain/BrainWire.ts`, `capabilities/edge-brain.ts`: proxy `MemoryService` over the host wire.
- [ ] `brain/BrainInspection.ts`, `operations/inspect-brain.ts`, `reset-brain.ts`.
- [ ] `run-due` and the host timers stop calling `tick`/`nextDueAt`; they only drain and deliver
      outboxes, since memory now schedules time-driven rules itself [F-4.5].
- [ ] Operations: `recall`, `remember`, `knowledge`, `watch-facts`, `read-source`, `run-due`, `deliver`,
      `send-message`, `compose-update`, `update-profile`, `list-triggers`, `cancel-trigger`.
- [ ] Types: `AgentOperation`, `TriggerOperation`, `MemoryOperation`, `AgentPresence`, `Profile`.
- [ ] UI: `containers/useAgentKnowledge.ts`, `useProfileKnowledge.ts`, `AgentState/AgentState.tsx`;
      `skills/BrainSkill.ts`; `capabilities/brain.ts`.
- [ ] Tests: `brain/*.test.ts`, `types/BrainService.test.ts`, `operations/*.test.ts`; `vite.config.ts`.

## 6. Move `@dxos/plugin-brain` and other plugins

- [ ] `plugin-brain` `capabilities/fact-store.ts` (`FactStoreRegistry`): becomes the per-space
      `MemoryService` provider [F-5.1]; keep its notify wrapper until Q-3 settles notifications.
- [ ] `plugin-brain` operations: `query-facts`, `facts`, `summarize-subject`, `generate-reply`,
      `analyze-mailbox`; `capabilities/mailbox-processor.ts`; `types/BrainOperation.ts`,
      `BrainCapabilities.ts`; `containers/FactsCompanion/*`; `dx.config.ts`.
- [ ] `plugin-inbox` `capabilities/mailbox-processors.ts` and its tests.
- [ ] `plugin-discord` `services/fact-feed-store.ts`, `testing/fact-server.ts` and the demo tests.
- [ ] `plugin-google`, `plugin-jmap`, `composer-app`: imports of the fact types from `@dxos/pipeline-rdf`.

## 7. Move compute pipelines, stories and UI

- [ ] `@dxos/pipeline-rdf`: stages `extract-facts`, `index-facts`, `normalize-predicates`, `pipeline.ts`
      require `MemoryService`; re-point type imports to echo-memory; remove `src/store` once empty.
      `fact-graph.ts` (graph view over facts) moves to echo-memory if it stays pure, else to react-ui-rdf.
- [ ] `@dxos/brain`: `Encoding` and the evaluator take `Fact` from echo-memory.
- [ ] `@dxos/pipeline-email` (`fact-pipeline.ts`, `corpus/ledger.ts`, `stages/extract-facts.ts`),
      `@dxos/pipeline-discord` (`pipeline.ts`, `stages/*`, `testing`), `@dxos/crawler`
      (`stages/extract-facts.ts`, `stages/topics.ts`, `testing`).
- [ ] `@dxos/react-ui-rdf`: fact and `SparqlRow` type imports.
- [ ] `stories-brain`: `modules/context.ts`, `pipeline-context.ts`, `testing/remote-fact-store.ts`,
      `testing/crawler-stores.ts`, `testing/harness/*`, tests; update `ROADMAP.md`, `docs/TASKS.md`.
- [ ] `app-framework/docs/EDGE-PLUGINS.mdl`: the `BrainService` host-service row becomes `MemoryService`
      (with a changelog decision).
- [ ] `pipeline-rdf` docs: `DESIGN.md`, `docs/ONTOLOGY.md`, `docs/AUDIT.md` point at echo-memory.

## 8. Delete [F-8.2]

- [ ] `rg 'BrainService|FactStore|SemanticQuery|SemanticIndexError|BrainError'` over dxos and edge
      returns nothing outside changelogs.
- [ ] Delete `plugin-agent` `types/BrainService.ts`, `brain/BrainMemory.ts`; `pipeline-rdf` `src/store`;
      the `./fact-store` export of `pipeline-rdf`. No re-exports left behind.
- [ ] Changesets for every published package whose exports changed.
