---
branch: dm/eager-cannon-uecw8y
commit: a7b011dc16260d02c1542739e17633e20fa6e6dc
base: e7d8c18cd6e117780f37f2d8475da8104cdbbdb1
mode: fast
createdAt: 2026-10-29T08:27:21.154Z
isFinalized: true
groups: 158
rules: [atom-lifetime-bound-to-owner, consistent-private-field-convention, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, named-durations-and-budgets, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, retries-via-schedule-with-evidence, schema-declare-and-brand, use-context-scoped-cancellation]
reviewId: a7b011dc
---

_5 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a7b011dc-1 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:314
- a7b011dc-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:350
- a7b011dc-3 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:320
- a7b011dc-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:608
- a7b011dc-5 - ignored - named-durations-and-budgets - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1040
- a7b011dc-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520
- a7b011dc-7 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1682
- a7b011dc-8 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:941
- a7b011dc-9 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:511
- a7b011dc-10 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-sqlite/src/database.ts:607
- a7b011dc-11 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:520
- a7b011dc-12 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:616
- a7b011dc-13 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo/src/Error.ts:1
- a7b011dc-14 - ignored - operations-resolve-database-from-service - packages/core/echo/echo/src/Migration.ts:91
- a7b011dc-15 - ignored - no-casts - packages/core/echo/echo/src/Migration.ts:148
- a7b011dc-16 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/shared.test.ts:61
- a7b011dc-17 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:169
- a7b011dc-18 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:457
- a7b011dc-19 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:457
- a7b011dc-20 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:457
- a7b011dc-21 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:673
- a7b011dc-22 - ignored - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:913
- a7b011dc-23 - ignored - namespace-export-with-internal-hiding - packages/sdk/migrations/src/index.ts:1
- a7b011dc-24 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/migrations/src/migrations.test.ts:19
- a7b011dc-25 - ignored - atom-lifetime-bound-to-owner - packages/sdk/migrations/src/migrations.ts:24

## Issues

# WARN a7b011dc-1 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:314`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 314-325 (`if (!db) {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-2 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:350`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 350-361 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-3 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 320-367 (`async open(ctx: Context): Promise<void> {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:608`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 608-655 (`} catch (err) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-5 named-durations-and-budgets `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1040`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.80. The likeliest place is lines 1040-1087 (`if (!this._objectPresent(objectId)) {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a7b011dc-6 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1520-1547 (`getLoadedDocumentHandles(): DocHandleProxy<any>[] {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-7 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1682`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 1682-1705 (`this.#branchOpChain = result.then(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-8 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:941`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.85. The likeliest place is lines 941-988 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-9 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:511`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 511-534 (`async branch<T extends Obj.Unknown>(obj: T, name: string): Promise<Database.B...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-10 no-try-catch-in-effect-code `packages/core/echo/echo-sqlite/src/database.ts:607`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 607-630 (`let hydrating = this.#hydrating.get(stored.id);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-11 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:520`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.92. The likeliest place is lines 520-528 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a7b011dc-12 no-casts `packages/core/echo/echo/src/Database.ts:616`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 616-642 (`if (!object) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-13 import-as-namespace-is-all-or-nothing `packages/core/echo/echo/src/Error.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-9 (`import { BaseError, type BaseErrorOptions } from '@dxos/errors';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-14 operations-resolve-database-from-service `packages/core/echo/echo/src/Migration.ts:91`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.83. The likeliest place is lines 91-94 (`export type ObjectMigrationContext = {`, location confidence 0.61). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR a7b011dc-15 no-casts `packages/core/echo/echo/src/Migration.ts:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 148-159 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a7b011dc-16 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/shared.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 61-72 (`db.add(Obj.make(TestViewWrapper, { view: Ref.make(viewObj) }));`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a7b011dc-17 no-casts `packages/sdk/client/src/echo/space-proxy.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 169-192 (`private readonly _db!: DatabaseImpl;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-18 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-19 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-20 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.89. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-21 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:673`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.90. The likeliest place is lines 673-696 (`switch (response._tag) {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-22 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:913`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 913-937 (`);`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-23 namespace-export-with-internal-hiding `packages/sdk/migrations/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-8 (`export * from './annotations.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-24 effect-fn-not-hand-wrapped-gen `packages/sdk/migrations/src/migrations.test.ts:19`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 19-30 (`const scaleCount = (factor: number) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a7b011dc-25 atom-lifetime-bound-to-owner `packages/sdk/migrations/src/migrations.ts:24`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.98. The likeliest place is lines 24-35 (`export class Migrations {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e7d8c18cd6e117780f37f2d8475da8104cdbbdb1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 25 violations written to fragments, 462 uncertain, 371 clean, 0 unanswered
- left for an agentic reviewer: 91 batch(es)

```text
requests: 563 (273 verdicts re-asked with context the model requested)
estimated input tokens: 6760538
billed input tokens: 6806048 (cost $0.2859)
measured chars per token: 2.98
```

### Triage

- Issues carried as `ignored` from `9f8ed77b`: the flagged lines predate this PR.
- a7b011dc-24: `scaleCount` now passes `Effect.fnUntraced` instead of an arrow wrapping `Effect.gen`.
- a7b011dc-5, a7b011dc-16, a7b011dc-22: `entity-manager.ts:1040`, `shared.test.ts:61` and `space-proxy.ts:913` predate this PR, whose changes in those files are the link rebind (line 2044), the two step literals (line 168) and the `createEpoch` option (line 212).
- a7b011dc-13: `Error.ts` gains one `BaseError.extend` class beside the existing ones and is still imported only as a namespace (`Error as EchoError`).
