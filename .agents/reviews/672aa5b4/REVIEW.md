---
branch: dm/space-root-json
commit: 672aa5b4cf35a852f51b13ea4cb4d5beedac2ec4
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-29T10:31:44.216Z
isFinalized: true
groups: 158
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, dont-leak-internal-api-through-public-surface, error-messages-carry-context, event-handler-naming-convention, log-fire-and-forget-rejections, minimal-precise-tests, named-durations-and-budgets, no-casts, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, retries-via-schedule-with-evidence, store-events-not-projections, structured-logging-not-console, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: 672aa5b4
---

_12 error(s), 34 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 672aa5b4-1 - ignored - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/automerge-retention.test.ts:52
- 672aa5b4-2 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- 672aa5b4-3 - ignored - minimal-precise-tests - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- 672aa5b4-4 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:176
- 672aa5b4-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:159
- 672aa5b4-6 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:327
- 672aa5b4-7 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:375
- 672aa5b4-8 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:615
- 672aa5b4-9 - ignored - store-events-not-projections - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:615
- 672aa5b4-10 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:807
- 672aa5b4-11 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:975
- 672aa5b4-12 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:311
- 672aa5b4-13 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:347
- 672aa5b4-14 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384
- 672aa5b4-15 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:346
- 672aa5b4-16 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:394
- 672aa5b4-17 - ignored - named-durations-and-budgets - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1028
- 672aa5b4-18 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2023
- 672aa5b4-19 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2431
- 672aa5b4-20 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:575
- 672aa5b4-21 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/automerge/automerge-host.ts:2233
- 672aa5b4-22 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:177
- 672aa5b4-23 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145
- 672aa5b4-24 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:212
- 672aa5b4-25 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:308
- 672aa5b4-26 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:468
- 672aa5b4-27 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1051
- 672aa5b4-28 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:1528
- 672aa5b4-29 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1720
- 672aa5b4-30 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:79
- 672aa5b4-31 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:247
- 672aa5b4-32 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:415
- 672aa5b4-33 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:56
- 672aa5b4-34 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:188
- 672aa5b4-35 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1146
- 672aa5b4-36 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:1800
- 672aa5b4-37 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:2016
- 672aa5b4-38 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:2208
- 672aa5b4-39 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:2208
- 672aa5b4-40 - ignored - dont-leak-internal-api-through-public-surface - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:172
- 672aa5b4-41 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:229
- 672aa5b4-42 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:241
- 672aa5b4-43 - ignored - event-handler-naming-convention - packages/sdk/client-services/src/internal/spaces/data-space.ts:69
- 672aa5b4-44 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space.ts:319
- 672aa5b4-45 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space.ts:583
- 672aa5b4-46 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202

## Issues

# WARN 672aa5b4-1 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/automerge-retention.test.ts:52`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 52-64 (`const queryAll = async (db: EchoDatabase, expected: number): Promise<Obj.Unkn...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-2 test-asserts-real-behavior `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.93. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-3 minimal-precise-tests `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.81. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.26). Judged with added `diff, test` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-4 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:176`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 176-199 (`this.#shown.wake();`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-5 consistent-private-field-convention `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:159`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 159-182 (`#stoppedBy: { reason: string; error: Error } | undefined = undefined;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-6 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:327`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 327-350 (`if (disk) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-7 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:375`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 375-398 (`void saved.finally(() => this._diskFlushes.delete(saved)).catch(() => {});`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-8 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:615`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 615-638 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-9 store-events-not-projections `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:615`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.80. The likeliest place is lines 615-638 (`}`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-10 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:807`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 807-830 (`handle.on('change', onChange);`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-11 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:975`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 975-998 (`log.catch(err, { documentId });`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-12 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:311`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 311-322 (`}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-13 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:347`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 347-358 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-14 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 384-407 (`getObjectDocHandle(db.getObjectById(ids[0])).change((newDoc: any) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-15 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:346`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 346-369 (`scheduleTaskInterval(ctx, async () => this.#expireIdleDocuments(), this._docu...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-16 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:394`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 394-417 (`if (this._branchStore) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-17 named-durations-and-budgets `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1028`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 1028-1051 (`}`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-18 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2023`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.85. The likeliest place is lines 2023-2046 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-19 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2431`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 2431-2454 (`this._onObjectDocumentLoaded({ handle, objectId });`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-20 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:575`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 575-598 (`let updatingAuthScope = false;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-21 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/automerge/automerge-host.ts:2233`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 2233-2256 (`try {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-22 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:177`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 177-188 (`for (const { documentId, heads: docHeads } of changedDocuments) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-23 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 145-156 (`const delta = sent.get(handle.documentId)!;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-24 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:212`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 212-223 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-25 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:308`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 308-319 (`await this._params.automergeHost.flush(ctx, {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-26 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:468`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 468-491 (`let running = 0;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-27 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:1051`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 1051-1074 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-28 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:1528`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 1528-1551 (`try {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-29 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1720`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 1720-1743 (`if (generation !== this.#ftsFlushGeneration && performance.now() < deadline) {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-30 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 79-90 (`await manager.close();`, location confidence 0.16). Judged with added `imports, test` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-31 no-casts `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:247`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 247-258 (`const root = await host.loadDoc<SpaceRoot>(Context.default(), spaceRootUrl);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-32 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:415`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 415-426 (`await expect.poll(() => updates.includes(spaceB), { timeout: 2_000 }).toBe(tr...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-33 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:56`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 56-67 (`table: MIGRATIONS_TABLE,`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-34 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:188`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.89. The likeliest place is lines 188-202 (`manifest?: readonly QueryService.ManifestEntry[];`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-35 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 1146-1169 (`trace.name = 'Root';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-36 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:1800`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 1800-1823 (`this.#inQueryTracesAttached.add(cacheKey);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-37 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:2016`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 2016-2039 (`switch (step.traversal._tag) {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-38 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:2208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 2208-2231 (`throw new Error(`Unknown traversal type: ${(step.traversal as any)._tag}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-39 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:2208`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 2208-2231 (`throw new Error(`Unknown traversal type: ${(step.traversal as any)._tag}`);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-40 dont-leak-internal-api-through-public-surface `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:172`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.83. The likeliest place is lines 172-183 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-41 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:229`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 229-240 (`const namespace = (obj as any).namespace === 'trace' ? 'trace' : 'data';`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-42 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:241`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.94. The likeliest place is lines 241-248 (`} catch (err) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-43 event-handler-naming-convention `packages/sdk/client-services/src/internal/spaces/data-space.ts:69`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 69-85 (`beforeClose?: () => Promise<void>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-44 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space.ts:319`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 319-342 (`} catch (err) {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 672aa5b4-45 no-casts `packages/sdk/client-services/src/internal/spaces/data-space.ts:583`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 583-606 (`return;`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

# WARN 672aa5b4-46 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.92. The likeliest place is lines 202-213 (`async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 46 violations written to fragments, 305 uncertain, 1032 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 735 (192 verdicts re-asked with context the model requested)
estimated input tokens: 11730680
billed input tokens: 11668727 (cost $0.4901)
measured chars per token: 3.02
```
