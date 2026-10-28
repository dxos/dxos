---
branch: dm/eager-cannon-uecw8y
commit: 42240ca518c4ae7ec458baeb65fb9f628c544fa1
base: e7d8c18cd6e117780f37f2d8475da8104cdbbdb1
mode: fast
createdAt: 2026-10-28T12:11:49.578Z
isFinalized: true
groups: 94
rules: [atom-lifetime-bound-to-owner, comment-hygiene, deferred-callback-owns-its-context, log-fire-and-forget-rejections, namespace-export-with-internal-hiding, no-casts, no-try-catch-in-effect-code, operations-resolve-database-from-service, retries-via-schedule-with-evidence, use-context-scoped-cancellation]
reviewId: 42240ca5
---

_3 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 42240ca5-1 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:314
- 42240ca5-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:350
- 42240ca5-3 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1041
- 42240ca5-4 - ignored - operations-resolve-database-from-service - packages/core/echo/echo/src/Migration.ts:86
- 42240ca5-5 - ignored - no-casts - packages/core/echo/echo/src/Migration.ts:143
- 42240ca5-6 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:169
- 42240ca5-7 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:193
- 42240ca5-8 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:457
- 42240ca5-9 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:457
- 42240ca5-10 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:673
- 42240ca5-11 - ignored - namespace-export-with-internal-hiding - packages/sdk/migrations/src/index.ts:1
- 42240ca5-12 - resolved - no-casts - packages/sdk/migrations/src/migrations.test.ts:25
- 42240ca5-13 - resolved - comment-hygiene - packages/sdk/migrations/src/migrations.test.ts:25
- 42240ca5-14 - ignored - atom-lifetime-bound-to-owner - packages/sdk/migrations/src/migrations.ts:27

## Issues

# WARN 42240ca5-1 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:314`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 314-325 (`if (!db) {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-2 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:350`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 350-361 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-3 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1041`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.82. The likeliest place is lines 1041-1088 (`const output = (await migration.transform(object, { db: this })) as Migration...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-4 operations-resolve-database-from-service `packages/core/echo/echo/src/Migration.ts:86`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 86-89 (`export type ObjectMigrationContext = {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 42240ca5-5 no-casts `packages/core/echo/echo/src/Migration.ts:143`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 143-154 (`}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 42240ca5-6 no-casts `packages/sdk/client/src/echo/space-proxy.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 169-192 (`private readonly _db!: DatabaseImpl;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-7 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:193`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.89. The likeliest place is lines 193-216 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-8 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-9 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-10 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:673`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.90. The likeliest place is lines 673-696 (`switch (response._tag) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-11 namespace-export-with-internal-hiding `packages/sdk/migrations/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-8 (`export * from './annotations.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 42240ca5-12 no-casts `packages/sdk/migrations/src/migrations.test.ts:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 25-36 (`version: '1970-01-02',`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-13 comment-hygiene `packages/sdk/migrations/src/migrations.test.ts:25`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 25-36 (`version: '1970-01-02',`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42240ca5-14 atom-lifetime-bound-to-owner `packages/sdk/migrations/src/migrations.ts:27`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.98. The likeliest place is lines 27-38 (`export class Migrations {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e7d8c18cd6e117780f37f2d8475da8104cdbbdb1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 275 uncertain, 242 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 319 (164 verdicts re-asked with context the model requested)
estimated input tokens: 3002799
billed input tokens: 3015821 (cost $0.1267)
measured chars per token: 2.99
```

### Triage

- 42240ca5-12, 42240ca5-13: `Filter.props<any>` and the TODO above it replaced by `Filter.type(TestSchema.Expando, { namespace: 'test' })`, as the TODO asked.
- All others: the flagged lines predate this PR, which changes only `createEpoch` wiring in `echo-client.ts` and `space-proxy.ts`, appends `Migration.Transaction` to `Migration.ts`, and removes exports from `migrations/src/index.ts`; `database.ts:1041` and `Migration.ts:86`/`:143` are the existing object-migration runner, not operations.
