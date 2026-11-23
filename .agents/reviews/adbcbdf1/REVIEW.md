---
branch: dm/deprecate-inline-root-objects
commit: adbcbdf15130cdb9edce60e050f3c21d567cf0e6
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-28T12:36:45.516Z
isFinalized: true
groups: 158
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, error-messages-carry-context, minimal-precise-tests, named-durations-and-budgets, namespace-export-with-internal-hiding, no-casts, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, schema-declare-and-brand, structured-logging-not-console]
reviewId: adbcbdf1
---

_9 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- adbcbdf1-1 - ignored - minimal-precise-tests - packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:72
- adbcbdf1-2 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:753
- adbcbdf1-3 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:319
- adbcbdf1-4 - ignored - named-durations-and-budgets - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1018
- adbcbdf1-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2154
- adbcbdf1-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2610
- adbcbdf1-7 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2854
- adbcbdf1-8 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/types.ts:28
- adbcbdf1-9 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/branching.test.ts:57
- adbcbdf1-10 - ignored - options-object-with-defaults - packages/core/echo/echo-client/src/index.ts:1
- adbcbdf1-11 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:68
- adbcbdf1-12 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/proxy-db/database.ts:650
- adbcbdf1-13 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1034
- adbcbdf1-14 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:652
- adbcbdf1-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/echo-host.ts:964
- adbcbdf1-16 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1497
- adbcbdf1-17 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:188
- adbcbdf1-18 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1146
- adbcbdf1-19 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:2016
- adbcbdf1-20 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:2208
- adbcbdf1-21 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:2894
- adbcbdf1-22 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:3164
- adbcbdf1-23 - resolved - no-casts - packages/core/echo/echo-host/src/util.ts:18
- adbcbdf1-24 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:499
- adbcbdf1-25 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:571
- adbcbdf1-26 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202
- adbcbdf1-27 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-list.ts:53
- adbcbdf1-28 - ignored - no-casts - packages/sdk/client/src/echo/space-list.ts:197
- adbcbdf1-29 - ignored - no-casts - packages/sdk/migrations/src/migration-builder.ts:97

## Issues

# WARN adbcbdf1-1 minimal-precise-tests `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:72`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.81. The likeliest place is lines 72-95 (`test('an object both linked and inline is moved out of the directory when the...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-2 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:753`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 753-770 (`const getObjectDocHandle = (obj: any) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-3 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:319`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 319-366 (`async open(ctx: Context): Promise<void> {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-4 named-durations-and-budgets `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1018`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 1018-1041 (`async batchLoadObjectCores(`, location confidence 0.86). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-5 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2154`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 2154-2177 (`for (const [objectId, automergeUrlData] of Object.entries(links)) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-6 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2610`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 2610-2633 (`this._satisfactionSubscriptions.delete(objectId as EntityId);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-7 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2854`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 2854-2865 (`this._objectsForNextUpdate.add(id);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-8 no-casts `packages/core/echo/echo-client/src/core-db/types.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 28-39 (`export const TargetKey = {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-9 no-casts `packages/core/echo/echo-client/src/echo-handler/branching.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-68 (`const registry = db._entityManager.getBranchRegistry(root.id)!;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-10 options-object-with-defaults `packages/core/echo/echo-client/src/index.ts:1`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 1-7 (`import { type DataService } from '@dxos/protocols/rpc';`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-11 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:68`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 68-74 (`export * from './query/index.ts';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-12 error-messages-carry-context `packages/core/echo/echo-client/src/proxy-db/database.ts:650`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 650-697 (`getObjectById<T extends Entity.Unknown = Entity.Any>(id: string, { deleted = ...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-13 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1034`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.87. The likeliest place is lines 1034-1081 (`async #runObjectMigration(migration: Migration.ObjectMigration): Promise<void> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-14 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:652`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 652-675 (`batches++;`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-15 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/echo-host.ts:964`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 964-987 (`return RuntimeProvider.runPromise(this._runtime)(this._feedStore.getAllFeedsF...`, location confidence 0.48). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-16 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1497`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 1497-1520 (`candidates.add(documentId);`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-17 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:188`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.89. The likeliest place is lines 188-202 (`manifest?: readonly QueryService.ManifestEntry[];`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-18 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 1146-1169 (`trace.name = 'Root';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-19 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:2016`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 2016-2039 (`switch (step.traversal._tag) {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-20 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:2208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 2208-2231 (`throw new Error(`Unknown traversal type: ${(step.traversal as any)._tag}`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-21 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:2894`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 2894-2917 (`async #loadFromIndexCopy(spaceId: SpaceId, objectId: EntityId, documentId: Do...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-22 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:3164`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 3164-3184 (`};`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-23 no-casts `packages/core/echo/echo-host/src/util.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-29 (`export const findInlineObjectOfType = (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-24 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:499`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.92. The likeliest place is lines 499-507 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-25 no-casts `packages/core/echo/echo/src/Database.ts:571`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 571-594 (`export const resolve: {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-26 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.92. The likeliest place is lines 202-213 (`async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN adbcbdf1-27 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-list.ts:53`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.88. The likeliest place is lines 53-64 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-28 no-casts `packages/sdk/client/src/echo/space-list.ts:197`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 197-208 (`});`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR adbcbdf1-29 no-casts `packages/sdk/migrations/src/migration-builder.ts:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 97-108 (`const migratedDoc = migrateDocument(oldHandle.doc() as Doc<DatabaseDirectory>...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 29 violations written to fragments, 248 uncertain, 696 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 543 (146 verdicts re-asked with context the model requested)
estimated input tokens: 8448921
billed input tokens: 8498949 (cost $0.3570)
measured chars per token: 2.98
```
