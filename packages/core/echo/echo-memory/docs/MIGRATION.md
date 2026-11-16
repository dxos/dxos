# Migration to `@dxos/echo-memory`

Tasks to replace `BrainService` (`@dxos/plugin-agent`) and `FactStore` (`@dxos/pipeline-rdf`) with
`MemoryService`. The spec is `../SPEC.mdl` (`org.dxos.echo-memory`); requirement ids below point into it.

Order: phases 1–3 add the new packages without touching callers; phase 4 marks the old surfaces
deprecated; phases 5–7 move callers; phase 8 deletes the old code. Open spec questions (Q-1 to Q-3)
block only the tasks that name them.

## 1. `@dxos/echo-memory` (interface)

- [ ] Scaffold `packages/core/echo/echo-memory`: `package.json` (`"private": true`), `moon.yml`,
      `tsconfig.json`, `vite.config.ts`. Dependencies: `effect`, `@dxos/errors`, `@dxos/util` only [F-1.2].
- [ ] Move the fact schemas from `pipeline-rdf/src/types` unchanged: `Fact`, `Assertion`, `Term`
      (`EntityTerm`, `LiteralTerm`), `Entity`, `EntityKind`, `Attribution`, `Factuality`, `Illocution` [F-2.1].
- [ ] Add `MemoryQuery<T>` and its kinds (`FactsQuery`, `GraphsQuery`, `SparqlQuery`, `PredicatesQuery`,
      `CursorQuery`), with a typed constructor and a result schema per kind [F-3.2, F-3.7]. Add `FactQuery`
      (merge of `BrainService.FactQuery` and `SemanticQuery`), `SparqlTerm`, `SparqlRow`,
      `PredicateEntry` (from `Ontology.Entry`), `ReadCursor`, `PutOptions`, `Subscription`, `MemoryEvent`,
      `GraphStatus`.
- [ ] Add the pure functions `graphStatus` (from `Graph.status`), `currentFacts`, `termValue`, `termText`,
      `factText` (from `BrainService`) [F-2.3]. Check each has no `n3` import.
- [ ] Add the branded ids `FactId`, `GraphIri`, `EntityKey`, `SourceUri`, `SubscriptionId`,
      `MemoryEventId` [F-2.4]; brand-only, so decoding existing JSON is unchanged.
- [ ] Add `MemoryError` [F-6.1] and the `MemoryService` tag (`@dxos/echo-memory/MemoryService`) with its API.
- [ ] Add `MAX_SUBSCRIPTIONS = 256` (replaces `BrainService.MAX_TRIGGERS` and edge's `MAX_TRIGGERS`).
- [ ] Tests: T-6 (JSON round trip of `Fact`, `Subscription`, `MemoryEvent`, every MemoryQuery kind); a decode test over facts
      fixtures already in the repo (`pipeline-rdf` testing data) for [F-2.1].
- [ ] Add a `## Rules` check run (`no-implementation-deps`) to CI's agentic review scope.

## 2. `@dxos/echo-memory-native` (local implementations) — missing

Nothing of this exists yet; today's pieces are split across `FactStoreLive`, `FactStoreHttp` and
`BrainMemory`. Location depends on **Q-1**.

- [ ] Scaffold `@dxos/echo-memory-native` (`"private": true`). Dependencies: `@dxos/echo-memory`,
      `@dxos/sparql-sqlite`, `@dxos/sql-sqlite`, `@dxos/brain`, `n3`, `sparqljs`.
- [ ] Move the knowledge-base core from `pipeline-rdf/src/store/fact-store-live.ts` and its internals
      (`internal/sparql/*`, `Mapping`, `Vocab`, `Ontology` resolution, TriG) behind `MemoryService`,
      one store per space, with no space or agent argument on any op [F-3, F-5.1].
- [ ] Event base, persisted: SQLite tables for subscriptions, outboxes, queued-event ids and read cursors;
      rules run on `@dxos/brain`'s `Evaluator` [F-4, F-7.2]. Time-driven rules are scheduled inside the
      layer's scope and caught up on open [F-4.5, F-7.5]. Port the logic from `BrainMemory` (client)
      and `BrainObject` (edge), which are two copies today.
- [ ] `layer(storage)`, `layerFile(path)`, `layerMemory` [F-7.1].
- [ ] HTTP client layer and fetch-style handler, from `FactStoreHttp` (extend it to the event-base ops)
      [F-7.3]. Move `pipeline-rdf/src/testing/fact-server.ts` here.
- [ ] Tests T-1 to T-5 and T-7; port `fact-store.test.ts`, `fact-store-live.test.ts`, `fact-store-http.test.ts`
      and `BrainMemory.test.ts`.
- [ ] Decide the `graphs`/`sparql` kinds per **Q-2**, event-base reads per **Q-5**, and change notifications per **Q-3** (plugin-brain's `withNotify`).

## 3. EDGE implementation (`dxos/edge`) — missing

- [ ] Memory moves from the per-agent `BrainObject` to one Durable Object per space, built with
      echo-memory-native's `layer(ctx.storage.sql)` [F-7.4]. `BrainObject` keeps sessions, provisioning
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

- [ ] `@deprecated` JSDoc on `BrainService`, `BrainMemory`, `BrainWire`, `FactStore`, `FactStoreLive`,
      `FactStoreHttp`, `SemanticQuery`, `SemanticIndexError`, `BrainError`, naming the replacement.

## 5. Move `@dxos/plugin-agent`

- [ ] Split `wake` out of `BrainService` into an agent-runtime service in plugin-agent [F-8.3]; keep
      `wakeBlocks` there.
- [ ] `Trigger` stays; map it to `Subscription` (`rules` + `payload: encodeTrigger(trigger)`) and back.
      Replaces `toSubscription`, `fromEvaluator`, `encodeEvent`/`decodeEvent`.
- [ ] `brain/BrainMemory.ts` → the space's `MemoryService` from echo-memory-native `layerMemory` (or
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
