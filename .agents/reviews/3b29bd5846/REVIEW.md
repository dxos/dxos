---
branch: dm/elegant-euler-at56gd
commit: 3b29bd58468e0de94736ed45f85f28796d2f4ca5
base: a7beb5124a8f975005450c4602de29c85b964e12
mode: fast
createdAt: 2026-10-17T05:53:18.522Z
isFinalized: true
groups: 380
rules: [atom-lifetime-bound-to-owner, bounded-live-state, change-behavior-inside-existing-api, comment-hygiene, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-layer-composition, inline-obj-parent, log-fire-and-forget-rejections, named-durations-and-budgets, no-bare-ref-schema-alias, no-casts, no-env-vars-in-low-level-modules, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, no-try-catch-in-effect-code, one-changeset-per-pr, per-test-mutable-fixtures, schema-declare-and-brand, setter-must-not-own-transaction, store-events-not-projections, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 3b29bd5846
---

_11 error(s), 38 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3b29bd5846-1 - resolved - one-changeset-per-pr - .changeset/crawler-batch-extraction.md:1
- 3b29bd5846-2 - resolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/TriggerManager.test.ts:77
- 3b29bd5846-3 - ignored - log-fire-and-forget-rejections - packages/core/compute/compute-runtime/src/TriggerManager.ts:79
- 3b29bd5846-4 - ignored - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:125
- 3b29bd5846-5 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:432
- 3b29bd5846-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:992
- 3b29bd5846-7 - ignored - store-events-not-projections - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1148
- 3b29bd5846-8 - resolved - setter-must-not-own-transaction - packages/core/compute/crawler/src/CrawlState.ts:129
- 3b29bd5846-9 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/internal/state-store-echo.ts:24
- 3b29bd5846-10 - ignored - bounded-live-state - packages/core/compute/crawler/src/internal/state-store-sql.ts:62
- 3b29bd5846-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/internal/state-store-sql.ts:98
- 3b29bd5846-12 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/stages/extract-facts.ts:53
- 3b29bd5846-13 - ignored - flat-layer-composition - packages/core/compute/crawler/src/StateStore.test.ts:139
- 3b29bd5846-14 - ignored - comment-hygiene - packages/core/compute/crawler/src/testing/index.ts:270
- 3b29bd5846-15 - ignored - no-casts - packages/core/compute/crawler/src/testing/index.ts:282
- 3b29bd5846-16 - resolved - no-try-catch-in-effect-code - packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:235
- 3b29bd5846-17 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/pipeline.ts:17
- 3b29bd5846-18 - resolved - change-behavior-inside-existing-api - packages/core/compute/pipeline-rdf/src/pipeline.ts:41
- 3b29bd5846-19 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35
- 3b29bd5846-20 - ignored - no-retries-or-skips-for-flaky-tests - packages/core/mesh/edge-client/src/edge-http-client.test.ts:18
- 3b29bd5846-21 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:583
- 3b29bd5846-22 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:612
- 3b29bd5846-23 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:948
- 3b29bd5846-24 - resolved - no-bare-ref-schema-alias - packages/plugins/plugin-agent/src/types/AgentOperation.ts:339
- 3b29bd5846-25 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/Binding.test.ts:284
- 3b29bd5846-26 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:557
- 3b29bd5846-27 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:726
- 3b29bd5846-28 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:942
- 3b29bd5846-29 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/operations/configure-back-index.ts:16
- 3b29bd5846-30 - resolved - flat-layer-composition - packages/plugins/plugin-discord/src/operations/crawl.test.ts:76
- 3b29bd5846-31 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:158
- 3b29bd5846-32 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:31
- 3b29bd5846-33 - ignored - named-durations-and-budgets - packages/plugins/plugin-discord/src/services/discord-source.test.ts:149
- 3b29bd5846-34 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:172
- 3b29bd5846-35 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/fetch.ts:51
- 3b29bd5846-36 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-routine/src/operations/run-routine.test.ts:13
- 3b29bd5846-37 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- 3b29bd5846-38 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- 3b29bd5846-39 - resolved - no-retries-or-skips-for-flaky-tests - packages/sdk/client-e2e/src/spaces.test.ts:809
- 3b29bd5846-40 - ignored - schema-declare-and-brand - packages/sdk/client-protocol/src/space.ts:182
- 3b29bd5846-41 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:171
- 3b29bd5846-42 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:273
- 3b29bd5846-43 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:189
- 3b29bd5846-44 - ignored - no-casts - packages/sdk/client/src/echo/space-list.ts:184
- 3b29bd5846-45 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:90
- 3b29bd5846-46 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:467
- 3b29bd5846-47 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:635
- 3b29bd5846-48 - ignored - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:803
- 3b29bd5846-49 - ignored - use-context-scoped-cancellation - packages/stories/stories-agent/src/testing/back-index.ts:91

## Issues

# WARN 3b29bd5846-1 one-changeset-per-pr `.changeset/crawler-batch-extraction.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.94. This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Merged the three changesets into one `.changeset/discord-back-index.md` covering every package (`@dxos/compute` and `@dxos/plugin-discord`, minor).

# WARN 3b29bd5846-2 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/TriggerManager.test.ts:77`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 77-82 (`const remoteResets: string[] = [];`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `recordingRemoteManager()` now builds its `invocations` / `resets` records per test, inside the test closure.

# WARN 3b29bd5846-3 log-fire-and-forget-rejections `packages/core/compute/compute-runtime/src/TriggerManager.ts:79`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 79-90 (`};`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-4 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:125`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.80. The likeliest place is lines 125-142 (`const TracedOp = Operation.make({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-5 atom-lifetime-bound-to-owner `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:432`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.90. The likeliest place is lines 432-455 (`triggers: [],`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-6 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:992`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 992-1003 (`(processedVersions as Record<string, string>)[object.id] = currentSignature;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-7 store-events-not-projections `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1148`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.87. The likeliest place is lines 1148-1159 (`if (nextExecution === undefined) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-8 setter-must-not-own-transaction `packages/core/compute/crawler/src/CrawlState.ts:129`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.90. The likeliest place is lines 129-140 (`export const setCursor = (state: CrawlState, targetId: string, cursor: string...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The `CrawlState` setters now mutate a draft; callers (`StateStore.layerEcho`, `CrawlDiscordChannels`, `ConfigureBackIndex`, the fact-feed store, stories) open one `Obj.update` per batch of writes.

# WARN 3b29bd5846-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/internal/state-store-echo.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 24-37 (`setCursor: (targetId, cursor) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `setCursor` is an `Effect.fnUntraced` generator.

# ERROR 3b29bd5846-10 bounded-live-state `packages/core/compute/crawler/src/internal/state-store-sql.ts:62`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.85. The likeliest place is lines 62-73 (`export const makeSql = (sql: SqlClient.SqlClient): StateStore.Service => ({`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/internal/state-store-sql.ts:98`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 98-109 (`}).pipe(Effect.asVoid, Effect.mapError(fail('Failed to set cursor'))),`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-12 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/stages/extract-facts.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 53-64 (`const docs: RDF.ExtractDocument[] = [];`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `extract` is an `Effect.fnUntraced` generator.

# WARN 3b29bd5846-13 flat-layer-composition `packages/core/compute/crawler/src/StateStore.test.ts:139`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 139-150 (`const client = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-14 comment-hygiene `packages/core/compute/crawler/src/testing/index.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 270-281 (`export const deterministicAiService = (`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The only comment the PR adds here is the `prompts` JSDoc, which states why; the TODO and the `// ---` separator are pre-existing on main.

# ERROR 3b29bd5846-15 no-casts `packages/core/compute/crawler/src/testing/index.ts:282`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 282-293 (`generateObject: (request: { prompt: string }) =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-16 no-try-catch-in-effect-code `packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:235`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 235-246 (`const salvageFacts = <F>(raw: string, decode: (entry: unknown) => Option.Opti...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `salvageFacts` decodes each span with `Schema.decodeUnknownOption(Schema.fromJsonString(...))`; no try/catch.

# WARN 3b29bd5846-17 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/pipeline.ts:17`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 17-28 (`export const FactPipeline = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Pre-existing `run`, but the PR copied its hand-wrapped `Effect.gen` into `runBatch`; `run` (now the only entry point) is an `Effect.fnUntraced` generator.

# WARN 3b29bd5846-18 change-behavior-inside-existing-api `packages/core/compute/pipeline-rdf/src/pipeline.ts:41`

System One judges this a likely violation of `change-behavior-inside-existing-api` (Put a fix or variant inside the existing API; don't grow a sibling, hybrid, or /lazy twin), p=0.80. The likeliest place is lines 41-52 (`options?: IndexBatchOptions,`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `FactPipeline.runBatch` is gone: `FactPipeline.run(docs, { batchSize })` batches, and without `batchSize` keeps the single-document request its current callers depend on.

# ERROR 3b29bd5846-19 bounded-live-state `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 35-44 (`const ontology = (options?.ontology ?? Ontology.DEFAULT).include(yield* store...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-20 no-retries-or-skips-for-flaky-tests `packages/core/mesh/edge-client/src/edge-http-client.test.ts:18`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.91. The likeliest place is lines 18-43 (`const DEV_SERVER = 'https://dev.dxos.network';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-21 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:583`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 583-609 (`const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-22 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:612`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 612-635 (`): Promise<any> {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-23 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:948`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 948-971 (`withLogging,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-24 no-bare-ref-schema-alias `packages/plugins/plugin-agent/src/types/AgentOperation.ts:339`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.89. The likeliest place is lines 339-342 (`const FactFeedAgent = Ref.Ref(Agent.Agent).annotate({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `FactFeedAgent` is gone; each operation declares `Ref.Ref(Agent.Agent)` inline with its own description.

# WARN 3b29bd5846-25 flat-layer-composition `packages/plugins/plugin-connector/src/Binding.test.ts:284`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 284-307 (`expect(fired).toEqual([trigger.id]);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-26 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:557`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 557-580 (`const dormantBinding = async (account: string) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-27 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:726`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 726-749 (`const dieFor = new Map<string, unknown>();`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-28 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:942`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 942-965 (`);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-29 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/operations/configure-back-index.ts:16`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 16-26 (`const loadInput = <S extends Type.AnyObj>(type: S, value: unknown) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `loadInput` is an `Effect.fnUntraced` generator.

# WARN 3b29bd5846-30 flat-layer-composition `packages/plugins/plugin-discord/src/operations/crawl.test.ts:76`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 76-87 (`const run = (maxSteps = 10) =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** One `Effect.provide` of a `Layer.mergeAll`; the endpoint layer is a module value and only the AI stand-in, which records into the test's `prompts`, is built per test.

# WARN 3b29bd5846-31 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:158`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 158-169 (`const accessToken = yield* Database.load(binding.spec.source).pipe(Effect.pro...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-32 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-40 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-33 named-durations-and-budgets `packages/plugins/plugin-discord/src/services/discord-source.test.ts:149`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.91. The likeliest place is lines 149-159 (``No facts in the last ${maxDays}d (${agents.length} agents seen). Widen with ...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-34 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:172`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 172-181 (`for (const channel of channels) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-35 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/fetch.ts:51`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 51-62 (`const drainMessages = (channelId: string, after: string): Effect.Effect<Messa...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-36 per-test-mutable-fixtures `packages/plugins/plugin-routine/src/operations/run-routine.test.ts:13`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 13-33 (`import * as Capability from '@dxos/app-framework/Capability';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-37 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-38 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-39 no-retries-or-skips-for-flaky-tests `packages/sdk/client-e2e/src/spaces.test.ts:809`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.94. The likeliest place is lines 809-832 (`test('import space archive (JSON)', { timeout: 5_000, retry: 1 }, async () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Line 809 is pre-existing, but the PR's new merge test copied `retry: 1`; removed from the PR's tests.

# WARN 3b29bd5846-40 schema-declare-and-brand `packages/sdk/client-protocol/src/space.ts:182`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.94. The likeliest place is lines 182-186 (`export const SpaceSchema: Schema.Codec<Space> = Schema.Any.pipe(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-41 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:171`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 171-182 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-42 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:273`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 273-284 (`feedIds: [feedId],`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-43 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:189`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 189-200 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-44 no-casts `packages/sdk/client/src/echo/space-list.ts:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 184-195 (`}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# ERROR 3b29bd5846-45 no-casts `packages/sdk/client/src/echo/space-proxy.ts:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 90-106 (`export const getSpace = (object?: any): Space | undefined => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-46 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:467`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 467-490 (`try {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-47 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:635`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 635-658 (`},`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-48 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:803`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 803-826 (`private async _syncToEdge(opts?: {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing on main; not changed by this PR.

# WARN 3b29bd5846-49 use-context-scoped-cancellation `packages/stories/stories-agent/src/testing/back-index.ts:91`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 91-102 (`errored: 0,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** A story fake with no owning `Context`: the interval is tied to the story through the returned stop function, which the story's `beforeEach` cleanup calls.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a7beb5124a8f975005450c4602de29c85b964e12`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 49 violations written to fragments, 596 uncertain, 2915 clean, 0 unanswered
- left for an agentic reviewer: 110 batch(es)

```text
requests: 1517 (431 verdicts re-asked with context the model requested)
estimated input tokens: 13217073
billed input tokens: 12478967 (cost $0.5241)
measured chars per token: 3.18
```
