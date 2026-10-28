---
branch: dm/eager-cannon-uecw8y
commit: 9f8ed77bd6cc9caa1ae6e098e80286e26fd82672
base: e7d8c18cd6e117780f37f2d8475da8104cdbbdb1
mode: fast
createdAt: 2026-10-28T12:22:06.619Z
isFinalized: true
groups: 107
rules: [atom-lifetime-bound-to-owner, consistent-private-field-convention, deferred-callback-owns-its-context, error-messages-carry-context, log-fire-and-forget-rejections, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, retries-via-schedule-with-evidence, schema-declare-and-brand, use-context-scoped-cancellation]
reviewId: 9f8ed77b
---

_5 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9f8ed77b-1 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:314
- 9f8ed77b-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:350
- 9f8ed77b-3 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:320
- 9f8ed77b-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:608
- 9f8ed77b-5 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520
- 9f8ed77b-6 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1682
- 9f8ed77b-7 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1035
- 9f8ed77b-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:511
- 9f8ed77b-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-sqlite/src/database.ts:607
- 9f8ed77b-10 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:520
- 9f8ed77b-11 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:592
- 9f8ed77b-12 - ignored - operations-resolve-database-from-service - packages/core/echo/echo/src/Migration.ts:89
- 9f8ed77b-13 - ignored - no-casts - packages/core/echo/echo/src/Migration.ts:146
- 9f8ed77b-14 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:169
- 9f8ed77b-15 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:457
- 9f8ed77b-16 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:457
- 9f8ed77b-17 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:457
- 9f8ed77b-18 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:673
- 9f8ed77b-19 - ignored - namespace-export-with-internal-hiding - packages/sdk/migrations/src/index.ts:1
- 9f8ed77b-20 - ignored - atom-lifetime-bound-to-owner - packages/sdk/migrations/src/migrations.ts:27
- 9f8ed77b-21 - ignored - error-messages-carry-context - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:44
- 9f8ed77b-22 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:69

## Issues

# WARN 9f8ed77b-1 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:314`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 314-325 (`if (!db) {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-2 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:350`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 350-361 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-3 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 320-367 (`async open(ctx: Context): Promise<void> {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:608`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 608-655 (`} catch (err) {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9f8ed77b-5 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1520-1547 (`getLoadedDocumentHandles(): DocHandleProxy<any>[] {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-6 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1682`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 1682-1705 (`this.#branchOpChain = result.then(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-7 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1035`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 1035-1082 (`objects: objects.length,`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-8 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:511`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 511-534 (`async branch<T extends Obj.Unknown>(obj: T, name: string): Promise<Database.B...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-9 no-try-catch-in-effect-code `packages/core/echo/echo-sqlite/src/database.ts:607`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 607-630 (`let hydrating = this.#hydrating.get(stored.id);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-10 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:520`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.93. The likeliest place is lines 520-528 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9f8ed77b-11 no-casts `packages/core/echo/echo/src/Database.ts:592`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 592-615 (`export const resolve: {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-12 operations-resolve-database-from-service `packages/core/echo/echo/src/Migration.ts:89`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 89-92 (`export type ObjectMigrationContext = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9f8ed77b-13 no-casts `packages/core/echo/echo/src/Migration.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 146-157 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9f8ed77b-14 no-casts `packages/sdk/client/src/echo/space-proxy.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 169-192 (`private readonly _db!: DatabaseImpl;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-15 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-16 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-17 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.88. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-18 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:673`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.90. The likeliest place is lines 673-696 (`switch (response._tag) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-19 namespace-export-with-internal-hiding `packages/sdk/migrations/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-8 (`export * from './annotations.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-20 atom-lifetime-bound-to-owner `packages/sdk/migrations/src/migrations.ts:27`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.98. The likeliest place is lines 27-38 (`export class Migrations {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9f8ed77b-21 error-messages-carry-context `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:44`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 44-56 (`getFeedSyncState: async () => ({ blocksToPull: 0, blocksToPush: 0, totalBlock...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9f8ed77b-22 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 69-77 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e7d8c18cd6e117780f37f2d8475da8104cdbbdb1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 22 violations written to fragments, 424 uncertain, 313 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 509 (240 verdicts re-asked with context the model requested)
estimated input tokens: 6319859
billed input tokens: 6362122 (cost $0.2672)
measured chars per token: 2.98
```

### Triage

- Issues still `ignored` from `42240ca5`: same reasons as there — the flagged lines predate this PR.
- 9f8ed77b-3 to 9f8ed77b-6: `entity-manager.ts` changes only lines 2044-2065 (the link rebind); lines 320, 608, 1520 and 1682 predate this PR.
- 9f8ed77b-8, 9f8ed77b-9: `echo-sqlite/src/database.ts` adds only `beginMigration` at line 485; lines 511 and 607 predate this PR.
- 9f8ed77b-10, 9f8ed77b-11: `Database.ts` adds only `beginMigration` at line 288; lines 520 and 592 predate this PR.
- 9f8ed77b-21, 9f8ed77b-22: the stub this PR added to `test-generator.test.ts` was reverted (the mock is already cast to `Database.Database`), so the file no longer differs from main.
