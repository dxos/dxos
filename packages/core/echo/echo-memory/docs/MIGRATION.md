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
- [x] `RdfStore` port: `Quad`, `Write`, `Batch`, `Format`, `RdfStoreError` and the `RdfStore` tag [D-39].
- [x] The RDF mapping modules `Graph`, `Mapping`, `Ontology`, `Predicate`, `Sparql`, `Vocab` and `Hash`, moved
      from `@dxos/pipeline-rdf` with every call site [D-38, D-48]; `Fact.make` and `Fact.makeMany` [D-41].
- [ ] Add the `## Rules` checks (`no-implementation-deps`, `port-modules-no-n3`) to CI's agentic review scope.

## 2. `@dxos/echo-memory-sqlite` (local implementations) — done

`RdfMemory.make(rdf)` serves `MemoryService` over any `RdfStore` [D-42]. Facts are quads in the store's
shared part; subscriptions, outboxes and the last evaluation time are quads (JSON literals) in its local
part [F-9.6]. Rules are evaluated by `@dxos/brain`'s `Evaluator`. `LocalRdfStore` is the port over
`@dxos/sparql-sqlite`'s quad store in the same process, and `MemorySqlite.layerMemory` / `layerFile` put the
two together over native SQLite for the CLI and tests. The package depends on no other SPARQL store [D-34].

- [x] Package `packages/core/echo/echo-memory-sqlite`.
- [x] `RdfMemory`: the core over the `RdfStore` port, exported on its own subpath so the page loads no SQLite.
- [x] Event base as local quads, at most `MAX_EVENTS` acknowledged events kept per subscription [F-4, F-7.2].
- [x] Time-driven rules: a fiber in the scope sleeps until `nextDueAt`, is woken early by `put`, `subscribe`,
      `reset` and other replicas' batches, and a reopened memory catches up on open [F-4.5, F-7.5].
- [x] `put` writes the facts and moves the read cursor in one batch, so one transaction [F-3.1].
- [x] `LocalRdfStore` and `MemorySqlite.layer(options)`, `layerMemory`, `layerFile(path)` [F-7.1].
- [x] Tests T-1 to T-5, T-8 (rebuild and follow over a shared log), T-9 (export and import), owner filter,
      unsubscribe-once, rules that do not compile, a clock-driven wake, SPARQL answers.
- [ ] HTTP client layer and fetch-style handler for `RdfStore`, from `FactStoreHttp` [F-7.3]. Move
      `pipeline-rdf/src/testing/fact-server.ts` here.
- [ ] Port the remaining cases of `fact-store.test.ts`, `fact-store-live.test.ts` and `BrainMemory.test.ts`.

## 2b. The fact feed and the thin backend [F-9] — done

- [x] `facts` is a `FeedProtocol.WellKnownNamespaces` entry.
- [x] `@dxos/sparql-sqlite`'s `QuadStore`: a log-first quad store with a shared and a local part. Each logged
      batch is applied in one transaction with the log cursor; the store follows batches other replicas add and
      rebuilds itself from the log when empty [F-9.2–F-9.4].
- [x] `@dxos/sparql-sqlite/exchange`: TriG and binary serializations [F-10].
- [x] `@dxos/sparql-sqlite/async`: one engine over a sync or an async driver [F-9.7]; table prefixes [F-9.8].
- [x] `RdfStoreService` RPCs (`@dxos/protocols/rpc`), served by client-services' `RdfHostLayer`: one
      `QuadStore` per space, opened on first call, over the host database and `factFeedLog` on the host's
      `FeedStore`; export and import are formed in the host [F-9.1, F-10].
- [x] `client.rdf(spaceId)` (`createRpcRdfStore`) and `client.memory(spaceId)` (`createRpcMemory`) over the bridge;
      the memory itself runs in the host, one per space (`SpaceMemories`) [F-9.1, F-9.9, D-50].
- [x] The fact feed id is `EntityId.deterministic('org.dxos.memory.facts', spaceId)`, the same on every device.
- [x] The feed syncer replicates `facts` when the stack option `replicateFacts` is set; a test shows a fact
      feed replicating and a store over it applying what arrives [F-9.5].
- [ ] EDGE: bump the pinned `@dxos/feed` / `@dxos/protocols` so `FeedSpace` accepts `facts`, then add `facts` to
      its space deletion (`FEED_SPACE_NAMESPACES`), backups (`FEED_NAMESPACES`) and `QueueSubspaceTag`; then turn
      `replicateFacts` on by default.
- [ ] Space archives: export and import map every non-trace namespace to `data`; keep `facts` as `facts`.
- [x] Operations get `MemoryService` and `RdfStore` for their space from plugin-client's space-affinity layers,
      like `Database.Service` [F-1.5].
- [x] plugin-brain: operations declare `MemoryService`; `FactStoreRegistry` and the `FactStore` layer are over the
      space memory (D-52, D-55).
- [x] plugin-agent: `BrainMemory` is a `BrainService` over the space memory, provided by a space layer (D-53).
- [ ] Carry `quiet` across replicas, if it turns out to matter [D-44].

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
- [x] `brain/BrainMemory.ts`: a `BrainService` over the space's `MemoryService`, a trigger stored as a subscription
      owned by its agent with the trigger as payload (D-53).
- [ ] `brain/BrainWire.ts`, `capabilities/edge-brain.ts`: proxy `MemoryService` over the host wire.
- [ ] `brain/BrainInspection.ts`, `operations/inspect-brain.ts`, `reset-brain.ts`.
- [x] `tick` is a no-op and `nextDueAt` a one-minute poll while an agent has watches, so `run-due` and the host
      timers only drain and deliver what the memory's own clock queued (D-53, D-54).
- [ ] Operations: `recall`, `remember`, `knowledge`, `watch-facts`, `read-source`, `run-due`, `deliver`,
      `send-message`, `compose-update`, `update-profile`, `list-triggers`, `cancel-trigger`.
- [ ] Types: `AgentOperation`, `TriggerOperation`, `MemoryOperation`, `AgentPresence`, `Profile`.
- [ ] UI: `containers/useAgentKnowledge.ts`, `useProfileKnowledge.ts`, `AgentState/AgentState.tsx`;
      `skills/BrainSkill.ts`; `capabilities/brain.ts`.
- [ ] Tests: `brain/*.test.ts`, `types/BrainService.test.ts`, `operations/*.test.ts`; `vite.config.ts`.

## 6. Move `@dxos/plugin-brain` and other plugins

- [x] `plugin-brain` `FactStoreRegistry`: over the space memory, notified by the store's batches (D-55).
- [ ] `plugin-brain` operations: `query-facts`, `facts`, `summarize-subject`, `generate-reply`,
      `analyze-mailbox`; `capabilities/mailbox-processor.ts`; `types/BrainOperation.ts`,
      `BrainCapabilities.ts`; `containers/FactsCompanion/*`; `dx.config.ts`.
- [ ] `plugin-inbox` `capabilities/mailbox-processors.ts` and its tests.
- [ ] `plugin-discord` `services/fact-feed-store.ts`, `testing/fact-server.ts` and the demo tests.
- [ ] `plugin-google`, `plugin-jmap`, `composer-app`: imports of the fact types from `@dxos/pipeline-rdf`.

## 7. Move compute pipelines, stories and UI

- [ ] `@dxos/pipeline-rdf`: stages `extract-facts`, `index-facts`, `normalize-predicates`, `pipeline.ts`
      require `MemoryService`; remove `src/store` once empty. (Type imports already point at echo-memory.)
      `fact-graph.ts` (graph view over facts) moves to echo-memory if it stays pure, else to react-ui-rdf.
- [x] `@dxos/brain`: `Encoding` and the evaluator take `Fact` from echo-memory.
- [ ] `@dxos/pipeline-email` (`fact-pipeline.ts`, `corpus/ledger.ts`, `stages/extract-facts.ts`),
      `@dxos/pipeline-discord` (`pipeline.ts`, `stages/*`, `testing`), `@dxos/crawler`
      (`stages/extract-facts.ts`, `stages/topics.ts`, `testing`).
- [x] `@dxos/react-ui-rdf`: fact type imports. (`SparqlRow` still from pipeline-rdf.)
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
