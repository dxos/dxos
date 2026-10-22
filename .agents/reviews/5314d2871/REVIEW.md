---
branch: dm/serene-dijkstra-la97t0
commit: 5314d28718fc0d0c00302e83b197c4ad370bd33a
base: 9d66bcd4eb0db0a525c2eaa101acbf7111984262
mode: fast
createdAt: 2026-10-22T11:01:54.282Z
isFinalized: true
groups: 268
rules: [comment-hygiene, consistent-private-field-convention, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, deprecated-tag-must-be-accurate, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, event-handler-naming-convention, flat-layer-composition, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, retries-via-schedule-with-evidence, reuse-shared-test-layer, store-events-not-projections, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 5314d2871
---

_12 error(s), 41 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5314d2871-1 - ignored - no-trivial-wrappers-over-official-apis - packages/core/echo/echo-client-e2e/src/sync-query.test.ts:22
- 5314d2871-2 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122
- 5314d2871-3 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210
- 5314d2871-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402
- 5314d2871-5 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:666
- 5314d2871-6 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:414
- 5314d2871-7 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:486
- 5314d2871-8 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:726
- 5314d2871-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/feed/feed-handle.ts:868
- 5314d2871-10 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed-object-core.ts:259
- 5314d2871-11 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:676
- 5314d2871-12 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/hypergraph.ts:725
- 5314d2871-13 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:982
- 5314d2871-14 - ignored - reuse-shared-test-layer - packages/core/echo/echo-client/src/query/local-query-engine.test.ts:22
- 5314d2871-15 - resolved - no-module-level-object-caches - packages/core/echo/echo-client/src/query/manifest-merge.ts:22
- 5314d2871-16 - resolved - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/query/registry-view.ts:31
- 5314d2871-17 - ignored - comment-hygiene - packages/core/echo/echo-client/src/query/working-set-executor.test.ts:558
- 5314d2871-18 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/query/working-set-executor.ts:746
- 5314d2871-19 - resolved - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/query/working-set-view.ts:170
- 5314d2871-20 - resolved - no-module-level-object-caches - packages/core/echo/echo-client/src/query/working-set-view.ts:415
- 5314d2871-21 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:198
- 5314d2871-22 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:241
- 5314d2871-23 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:184
- 5314d2871-24 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1255
- 5314d2871-25 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:1327
- 5314d2871-26 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/db-host/query-service.ts:115
- 5314d2871-27 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo-host/src/db-host/query-service.ts:242
- 5314d2871-28 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:314
- 5314d2871-29 - ignored - store-events-not-projections - packages/core/echo/echo-host/src/db-host/query-service.ts:470
- 5314d2871-30 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/query-service.ts:482
- 5314d2871-31 - ignored - no-casts - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:494
- 5314d2871-32 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:710
- 5314d2871-33 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:179
- 5314d2871-34 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:246
- 5314d2871-35 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:718
- 5314d2871-36 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:1733
- 5314d2871-37 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1733
- 5314d2871-38 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:2602
- 5314d2871-39 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-client.ts:85
- 5314d2871-40 - ignored - consistent-private-field-convention - packages/core/mesh/edge-client/src/edge-client.ts:134
- 5314d2871-41 - ignored - flat-layer-composition - packages/plugins/plugin-client/src/capabilities/client.ts:189
- 5314d2871-42 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- 5314d2871-43 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:615
- 5314d2871-44 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- 5314d2871-45 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:606
- 5314d2871-46 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:652
- 5314d2871-47 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:990
- 5314d2871-48 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1147
- 5314d2871-49 - ignored - no-casts - packages/sdk/client/src/client/client.ts:349
- 5314d2871-50 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:613
- 5314d2871-51 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:613
- 5314d2871-52 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/services/dedicated/dedicated-worker.ts:62
- 5314d2871-53 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:467

## Issues

# WARN 5314d2871-1 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/sync-query.test.ts:22`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.82. The likeliest place is lines 22-37 (`const recordUpdates = <T extends Entity.Unknown>(query: QueryResult.QueryResu...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-2 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 122-137 (`export class IndexQuerySource implements RemoteQuerySource {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-3 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 210-233 (`void this._hydrationCtx?.dispose().catch(() => {});`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 402-425 (`try {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-5 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:666`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 666-689 (`} catch (err) {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-6 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:414`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 414-437 (`if (this.#appendRetry || this._ctx.disposed) {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-7 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:486`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.91. The likeliest place is lines 486-509 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-8 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:726`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.90. The likeliest place is lines 726-749 (`this.#reconnectDelay = RECONNECT_INITIAL_DELAY;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-9 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/feed/feed-handle.ts:868`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 868-883 (`const parseObjects = (encoded: readonly string[] | undefined): ObjectJSON[] =>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-10 no-casts `packages/core/echo/echo-client/src/feed/feed-object-core.ts:259`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 259-270 (`applyLocalUpdate(source: Entity.Unknown): void {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-11 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:676`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 676-699 (`expect(EID.getEntityId(EID.parse(ref.uri))).toBe((queuePost as any).id);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-12 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/hypergraph.ts:725`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 725-748 (`for (const feed of feeds) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-13 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:982`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.85. The likeliest place is lines 982-1029 (`for (const field of fields) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-14 reuse-shared-test-layer `packages/core/echo/echo-client/src/query/local-query-engine.test.ts:22`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 22-33 (`class FixedRemote implements RemoteQuerySource {`, location confidence 0.96). Judged with added `siblings, similar` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-15 no-module-level-object-caches `packages/core/echo/echo-client/src/query/manifest-merge.ts:22`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 22-41 (`export const withMembers = (query: QueryAST.Query): QueryAST.Query => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-16 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/query/registry-view.ts:31`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.98. The likeliest place is lines 31-42 (`isServing(): boolean {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-17 comment-hygiene `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:558`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.87. The likeliest place is lines 558-561 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-18 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/query/working-set-executor.ts:746`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 746-752 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-19 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/query/working-set-view.ts:170`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 170-181 (`close(): void {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-20 no-module-level-object-caches `packages/core/echo/echo-client/src/query/working-set-view.ts:415`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.88. The likeliest place is lines 415-429 (`const evaluatesWindow = (query: QueryAST.Query): boolean => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-21 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:198`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 198-209 (`doc.objects!['obj-1'].data.title = 'Doc 1 Updated';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-22 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:241`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 241-252 (`return change ? [{ time: change.time, ops: change.ops }] : [];`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-23 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 184-207 (`const root = await first.createSpaceRoot(Context.default(), PublicKey.random());`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-24 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1255`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 1255-1278 (`#scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: Docu...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-25 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:1327`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 1327-1350 (`} catch (err) {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-26 event-handler-naming-convention `packages/core/echo/echo-host/src/db-host/query-service.ts:115`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 115-121 (`sendUnchanged: () => void;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-27 deprecated-tag-must-be-accurate `packages/core/echo/echo-host/src/db-host/query-service.ts:242`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.82. The likeliest place is lines 242-253 (`return Effect.void;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-28 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:314`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 314-325 (`async 'awaitQueryUpdates'(): Promise<void> {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-29 store-events-not-projections `packages/core/echo/echo-host/src/db-host/query-service.ts:470`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.83. The likeliest place is lines 470-481 (`query.cost = this.#debounce.cost?.(query.executor.query, finishedAt - begin) ...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-30 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/query-service.ts:482`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 482-493 (`} else if (!query.oneShot) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-31 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:494`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 494-517 (`const spaceId = getSpaceIdFromCollectionId(params.collectionId as CollectionId);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-32 use-context-scoped-cancellation `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:710`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 710-733 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-33 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:179`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.85. The likeliest place is lines 179-197 (`const parseIndexedAnnotations = (meta: EntityMeta): Readonly<Record<string, u...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-34 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:246`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 246-269 (`}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-35 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:718`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 718-733 (`const isGrouped = (workingSet: QueryItem[]): boolean => workingSet.length > 0...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-36 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:1733`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 1733-1756 (`const ref = QueryItem.getProperty(item, property);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-37 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1733`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 1733-1756 (`const ref = QueryItem.getProperty(item, property);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-38 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:2602`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 2602-2625 (`async #loadFromIndexCopy(spaceId: SpaceId, objectId: EntityId, documentId: Do...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-39 no-casts `packages/core/mesh/edge-client/src/edge-client.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 85-96 (`export interface EdgeConnection extends Required<Lifecycle> {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-40 consistent-private-field-convention `packages/core/mesh/edge-client/src/edge-client.ts:134`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 134-145 (`private readonly _reconnectListeners = new Set<ReconnectListener>();`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-41 flat-layer-composition `packages/plugins/plugin-client/src/capabilities/client.ts:189`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 189-200 (`const clientServiceLayer = awaitInitialization`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-42 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-43 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:615`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 615-626 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-44 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 390-413 (`'Invalid document IDs',`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-45 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:606`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 606-629 (`} catch (err) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-46 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:652`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 652-663 (`async migrateSpaceToRootDocument(ctx: Context, spaceKey: PublicKey): Promise<...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-47 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:990`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 990-1013 (`void this._anchorSpaceOnRootDocument(this._ctx, dataSpace)`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-48 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1147`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 1147-1170 (`| InvitationsContract.ManagerService`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-49 no-casts `packages/sdk/client/src/client/client.ts:349`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 349-372 (`const spaces = this.spaces.get();`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-50 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:613`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 613-636 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-51 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:613`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 613-636 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5314d2871-52 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/services/dedicated/dedicated-worker.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 62-73 (`export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): ...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5314d2871-53 no-casts `packages/sdk/worker-framework/src/Client.ts:467`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 467-490 (`}`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

Triage notes:

- Resolved: -15 and -20 moved the WeakMap caches into `LocalQueryEngine` and `WorkingSetView`; -16 and -19 log `dispose()` rejections instead of swallowing them.
- Ignored: every other finding points at code this PR does not change, or is a false positive on lines it adds. -14: `FixedRemote` stubs the new `RemoteQuerySource` interface, and no shared test layer for it exists. -26: `sendUnchanged` is an internal callback field, not a component prop. -30, -36, -37: the `try`/`catch` and `log.warn` are existing code next to the added lines. -38: `QueryExecutor` already mixes `_` and `#` members, and new members use `#` as `AGENTS.md` asks.


### System One pass

- model: jev-latest
- base for context: `9d66bcd4eb0db0a525c2eaa101acbf7111984262`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 53 violations written to fragments, 504 uncertain, 1871 clean, 0 unanswered
- left for an agentic reviewer: 96 batch(es)

```text
requests: 1097 (290 verdicts re-asked with context the model requested)
estimated input tokens: 15043214
billed input tokens: 14716626 (cost $0.6181)
measured chars per token: 3.07
```
