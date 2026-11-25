---
branch: dm/wizardly-maxwell-4ibvdi
commit: bd81daef6da120f055d759bea8d2bc5462b2311b
base: ab300771b26a09774b283e6e70f038d9d8ff5bd9
mode: fast
createdAt: 2026-11-25T16:02:52.291Z
isFinalized: true
groups: 166
rules: [atom-lifetime-bound-to-owner, bounded-live-state, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-layer-composition, import-as-namespace-is-all-or-nothing, no-casts, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, structured-logging-not-console, test-asserts-real-behavior]
reviewId: bd81daef
---

_10 error(s), 19 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd81daef-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/common/sql-sqlite/src/internal/opfs-client.ts:116
- bd81daef-2 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:140
- bd81daef-3 - ignored - structured-logging-not-console - packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:74
- bd81daef-4 - ignored - no-casts - packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:110
- bd81daef-5 - ignored - test-asserts-real-behavior - packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:256
- bd81daef-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:55
- bd81daef-7 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:484
- bd81daef-8 - ignored - flat-layer-composition - packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.test.ts:29
- bd81daef-9 - resolved - error-messages-carry-context - packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.ts:112
- bd81daef-10 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/tool-runtime/services.ts:114
- bd81daef-11 - ignored - error-messages-carry-context - packages/core/compute/assistant/src/tool-runtime/services.ts:149
- bd81daef-12 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- bd81daef-13 - ignored - no-module-level-object-caches - packages/core/compute/assistant/src/tool-runtime/services.ts:249
- bd81daef-14 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/SqlService.ts:48
- bd81daef-15 - ignored - no-try-catch-in-effect-code - packages/core/compute/mcp-server/src/McpServer.ts:979
- bd81daef-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/McpServer.ts:1004
- bd81daef-17 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/mcp-server/src/McpServer.ts:1233
- bd81daef-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/scheduler.ts:121
- bd81daef-19 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:469
- bd81daef-20 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1052
- bd81daef-21 - ignored - bounded-live-state - packages/core/echo/echo-sqlite/src/automerge-source.ts:121
- bd81daef-22 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-sqlite/src/automerge-source.ts:169
- bd81daef-23 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:1189
- bd81daef-24 - ignored - no-casts - packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30
- bd81daef-25 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:49
- bd81daef-26 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- bd81daef-27 - ignored - atom-lifetime-bound-to-owner - packages/sdk/app-framework/src/core/capability-manager.test.ts:49
- bd81daef-28 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:1053
- bd81daef-29 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:241

## Issues

# WARN bd81daef-1 effect-fn-not-hand-wrapped-gen `packages/common/sql-sqlite/src/internal/opfs-client.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 116-127 (`export const makeOpfs = (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-2 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:140`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 140-151 (`instrumentVfs(vfs);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-3 structured-logging-not-console `packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:74`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 74-85 (`SQLiteAsyncESMFactory({`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-4 no-casts `packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 110-121 (`sqlite3.bind_collection(stmt, params as any);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-5 test-asserts-real-behavior `packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:256`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 256-267 (`// // Update data.`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-6 no-try-catch-in-effect-code `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:55`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 55-79 (`const unknownError = (method: string, detail: string, cause?: unknown) =>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-7 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:484`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 484-509 (`const toolsToRequest = (tools: ReadonlyArray<Tool.Any>): ChatTool[] | undefin...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-8 flat-layer-composition `packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.test.ts:29`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 29-35 (`const serviceLayer = (apiKey: string) =>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-9 error-messages-carry-context `packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.ts:112`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 112-123 (`return {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-10 no-try-catch-in-effect-code `packages/core/compute/assistant/src/tool-runtime/services.ts:114`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 114-125 (`.map((record) => Operation.getKey(record))`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-11 error-messages-carry-context `packages/core/compute/assistant/src/tool-runtime/services.ts:149`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 149-160 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-12 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 185-197 (`return toolkit.of(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-13 no-module-level-object-caches `packages/core/compute/assistant/src/tool-runtime/services.ts:249`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 249-261 (`const toolCache = new WeakMap<Operation.Definition.Any, Tool.Any>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-14 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/SqlService.ts:48`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 48-53 (`export const key = SqlService.key;`, location confidence 0.40). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-15 no-try-catch-in-effect-code `packages/core/compute/mcp-server/src/McpServer.ts:979`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 979-1003 (`export const describeSpace = (spaceId: string, space: DescribableSpace | unde...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/McpServer.ts:1004`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 1004-1029 (`export const resolveDownload = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-17 import-as-namespace-is-all-or-nothing `packages/core/compute/mcp-server/src/McpServer.ts:1233`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1233-1251 (`export const toolkit = McpServer$.toolkit;`, location confidence 0.61). Judged with added `public-api` context after a first pass of 0.63. This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-18 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/scheduler.ts:121`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 121-132 (`scheduleEffect = <A, E>(effect: Effect.Effect<A, E, never>): Effect.Effect<vo...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-19 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:469`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 469-492 (`let running = 0;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-20 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1052`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 1052-1075 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-21 bounded-live-state `packages/core/echo/echo-sqlite/src/automerge-source.ts:121`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 121-132 (`yield* sql`INSERT OR REPLACE INTO echo_sqlite_redirects (spaceId, fromId, toId)`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-22 no-try-catch-in-effect-code `packages/core/echo/echo-sqlite/src/automerge-source.ts:169`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 169-182 (`#changesSinceRecorded(documentId: string, doc: A.Doc<unknown>): A.ChangeMetad...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-23 no-casts `packages/core/echo/feed/src/feed-store.ts:1189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1189-1212 (``;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-24 no-casts `packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`describe('ChatModel', () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-25 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-61 (`const insertionOrderTimestamps = async (db: Database.Database, mailbox: Mailb...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-26 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 78-89 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-27 atom-lifetime-bound-to-owner `packages/sdk/app-framework/src/core/capability-manager.test.ts:49`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.84. The likeliest place is lines 49-60 (`const registry = Registry.make();`, location confidence 0.88). Judged with added `test` context after a first pass of 0.26. This is a single-shot classifier: confirm against the rule before acting.

# WARN bd81daef-28 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:1053`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 1053-1076 (`describe('registry lifetime', () => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd81daef-29 no-casts `packages/sdk/client/src/services/local-client-services.ts:241`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 241-252 (`this.signalMetadataTags.origin = 'undefined';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ab300771b26a09774b283e6e70f038d9d8ff5bd9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 29 violations written to fragments, 362 uncertain, 1092 clean, 0 unanswered
- left for an agentic reviewer: 95 batch(es)

```text
requests: 694 (214 verdicts re-asked with context the model requested)
estimated input tokens: 8674492
billed input tokens: 8452612 (cost $0.3550)
measured chars per token: 3.08
```
