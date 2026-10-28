---
branch: dm/serene-dijkstra-la97t0
commit: 18d04df1913a04de8f4b6fbf8c0338598eb266cb
base: 99708bd83f7e550c0e443d81f346d1d9b8305024
mode: fast
createdAt: 2026-10-24T07:07:20.525Z
isFinalized: true
groups: 277
rules: [comment-hygiene, consistent-private-field-convention, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, deprecated-tag-must-be-accurate, dont-leak-internal-api-through-public-surface, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, flat-layer-composition, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, prefer-branded-types-over-raw-primitives, retries-via-schedule-with-evidence, reuse-shared-test-layer, store-events-not-projections, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 18d04df19
---

_11 error(s), 40 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 18d04df19-1 - ignored - no-trivial-wrappers-over-official-apis - packages/core/echo/echo-client-e2e/src/sync-query.test.ts:22
- 18d04df19-2 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:46
- 18d04df19-3 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210
- 18d04df19-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402
- 18d04df19-5 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:78
- 18d04df19-6 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:510
- 18d04df19-7 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:510
- 18d04df19-8 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:750
- 18d04df19-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/feed/feed-handle.ts:896
- 18d04df19-10 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed-object-core.ts:271
- 18d04df19-11 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:700
- 18d04df19-12 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/hypergraph.ts:269
- 18d04df19-13 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/hypergraph.ts:936
- 18d04df19-14 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:982
- 18d04df19-15 - ignored - reuse-shared-test-layer - packages/core/echo/echo-client/src/query/local-query-engine.test.ts:22
- 18d04df19-16 - ignored - comment-hygiene - packages/core/echo/echo-client/src/query/working-set-executor.test.ts:558
- 18d04df19-17 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/query/working-set-executor.ts:746
- 18d04df19-18 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:198
- 18d04df19-19 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:241
- 18d04df19-20 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:859
- 18d04df19-21 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1255
- 18d04df19-22 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:1327
- 18d04df19-23 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/db-host/query-service.ts:115
- 18d04df19-24 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo-host/src/db-host/query-service.ts:242
- 18d04df19-25 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:314
- 18d04df19-26 - ignored - store-events-not-projections - packages/core/echo/echo-host/src/db-host/query-service.ts:470
- 18d04df19-27 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/query-service.ts:482
- 18d04df19-28 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/query-service.ts:506
- 18d04df19-29 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:494
- 18d04df19-30 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:710
- 18d04df19-31 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:179
- 18d04df19-32 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:246
- 18d04df19-33 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:718
- 18d04df19-34 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:758
- 18d04df19-35 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:1736
- 18d04df19-36 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1736
- 18d04df19-37 - ignored - deferred-callback-owns-its-context - packages/core/mesh/edge-client/src/edge-client.ts:218
- 18d04df19-38 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-client.ts:470
- 18d04df19-39 - ignored - flat-layer-composition - packages/plugins/plugin-client/src/capabilities/client.ts:189
- 18d04df19-40 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- 18d04df19-41 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/identity/identity-manager.ts:517
- 18d04df19-42 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:617
- 18d04df19-43 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/identity/identity-manager.ts:629
- 18d04df19-44 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- 18d04df19-45 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:606
- 18d04df19-46 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:990
- 18d04df19-47 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1147
- 18d04df19-48 - ignored - no-casts - packages/sdk/client/src/client/client.ts:349
- 18d04df19-49 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:613
- 18d04df19-50 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:613
- 18d04df19-51 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:467

## Issues

# WARN 18d04df19-1 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/sync-query.test.ts:22`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.82. The likeliest place is lines 22-37 (`const recordUpdates = <T extends Entity.Unknown>(query: QueryResult.QueryResu...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-2 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:46`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 46-63 (`export type ObjectUpdate = {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-3 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 210-233 (`void this._hydrationCtx?.dispose().catch(() => {});`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 402-425 (`try {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-5 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:78`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 78-101 (`readonly #appendScheduler = new UpdateScheduler(this._ctx, () => this.#flushD...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-6 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:510`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 510-533 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-7 error-messages-carry-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:510`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 510-533 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-8 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:750`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.90. The likeliest place is lines 750-773 (`},`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-9 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/feed/feed-handle.ts:896`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 896-911 (`const parseObjects = (encoded: readonly string[] | undefined): ObjectJSON[] =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-10 no-casts `packages/core/echo/echo-client/src/feed/feed-object-core.ts:271`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 271-282 (`const mutable = target as unknown as Record<string, unknown>;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-11 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:700`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 700-723 (`const ref = container.objects![0];`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-12 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/hypergraph.ts:269`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 269-292 (`} finally {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-13 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/hypergraph.ts:936`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.81. The likeliest place is lines 936-958 (`export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-14 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:982`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.86. The likeliest place is lines 982-1029 (`for (const field of fields) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-15 reuse-shared-test-layer `packages/core/echo/echo-client/src/query/local-query-engine.test.ts:22`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 22-33 (`class FixedRemote implements RemoteQuerySource {`, location confidence 0.97). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-16 comment-hygiene `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:558`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 558-561 (`});`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-17 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/query/working-set-executor.ts:746`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 746-752 (`}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-18 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:198`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 198-209 (`doc.objects!['obj-1'].data.title = 'Doc 1 Updated';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-19 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:241`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 241-252 (`return change ? [{ time: change.time, ops: change.ops }] : [];`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-20 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:859`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 859-882 (`expect(JSON.parse(row(saved)!.documentJson!).title).toBe(saved);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-21 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1255`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 1255-1278 (`#scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: Docu...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-22 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:1327`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 1327-1350 (`} catch (err) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-23 event-handler-naming-convention `packages/core/echo/echo-host/src/db-host/query-service.ts:115`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 115-121 (`sendUnchanged: () => void;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-24 deprecated-tag-must-be-accurate `packages/core/echo/echo-host/src/db-host/query-service.ts:242`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.81. The likeliest place is lines 242-253 (`return Effect.void;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-25 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:314`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 314-325 (`async 'awaitQueryUpdates'(): Promise<void> {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-26 store-events-not-projections `packages/core/echo/echo-host/src/db-host/query-service.ts:470`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 470-481 (`query.cost = this.#debounce.cost?.(query.executor.query, finishedAt - begin) ...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-27 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/query-service.ts:482`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 482-493 (`} else if (!query.oneShot) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-28 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/query-service.ts:506`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 506-517 (`this.#clearWake();`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-29 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:494`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 494-517 (`const spaceId = getSpaceIdFromCollectionId(params.collectionId as CollectionId);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-30 use-context-scoped-cancellation `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:710`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 710-733 (`}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-31 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:179`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.87. The likeliest place is lines 179-197 (`const parseIndexedAnnotations = (meta: EntityMeta): Readonly<Record<string, u...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-32 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:246`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 246-269 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-33 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:718`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 718-733 (`const isGrouped = (workingSet: QueryItem[]): boolean => workingSet.length > 0...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-34 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:758`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 758-781 (`#inQuerySetCache = new Map<string, Promise<{ values: ReadonlySet<unknown>; tr...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-35 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:1736`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 1736-1759 (`try {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-36 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1736`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 1736-1759 (`try {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-37 deferred-callback-owns-its-context `packages/core/mesh/edge-client/src/edge-client.ts:218`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.80. The likeliest place is lines 218-229 (`public async send(ctx: Context, message: Message) {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-38 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-client.ts:470`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 470-481 (`throw new EdgeConnectionClosedError();`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-39 flat-layer-composition `packages/plugins/plugin-client/src/capabilities/client.ts:189`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 189-200 (`const clientServiceLayer = awaitInitialization`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-40 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-41 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/identity/identity-manager.ts:517`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 517-528 (`private async _anchorHaloOnRootDocument(ctx: Context, identity: Identity): Pr...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-42 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:617`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 617-628 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-43 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/identity/identity-manager.ts:629`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 629-641 (`const ctx = yield* EffectEx.contextFromScope();`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-44 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 390-413 (`'Invalid document IDs',`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-45 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:606`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 606-629 (`} catch (err) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-46 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:990`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.85. The likeliest place is lines 990-1013 (`void this._anchorSpaceOnRootDocument(this._ctx, dataSpace)`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-47 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1147`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 1147-1170 (`| InvitationsContract.ManagerService`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-48 no-casts `packages/sdk/client/src/client/client.ts:349`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 349-372 (`const spaces = this.spaces.get();`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-49 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:613`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 613-636 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18d04df19-50 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:613`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.86. The likeliest place is lines 613-636 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 18d04df19-51 no-casts `packages/sdk/worker-framework/src/Client.ts:467`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 467-490 (`}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `99708bd83f7e550c0e443d81f346d1d9b8305024`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 51 violations written to fragments, 509 uncertain, 1956 clean, 0 unanswered
- left for an agentic reviewer: 99 batch(es)

```text
requests: 1142 (291 verdicts re-asked with context the model requested)
estimated input tokens: 15664918
billed input tokens: 15310011 (cost $0.6430)
measured chars per token: 3.07
```

Ignored as out of scope: 18d04df19-2, -7, -13, -28, -37, -38, -41 and -43 flag lines that `git blame` places in
commits already on `main` (or before the clone's shallow boundary). This PR touches those files elsewhere and
changes none of the flagged code.
