---
branch: dm/zealous-bohr-833aun
commit: 10ac06cf7460b6d8bd2cbf19577f91ac8debef86
base: 9bcc167fb4c49db297e712e2ae540beab201d830
mode: fast
createdAt: 2026-10-27T13:47:11.258Z
isFinalized: true
groups: 143
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, error-messages-carry-context, errors-extend-base-error, log-fire-and-forget-rejections, namespace-export-with-internal-hiding, no-casts, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, retries-via-schedule-with-evidence, use-context-scoped-cancellation]
reviewId: 10ac06cf
---

_8 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 10ac06cf-1 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:146
- 10ac06cf-2 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:320
- 10ac06cf-3 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:608
- 10ac06cf-4 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520
- 10ac06cf-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1622
- 10ac06cf-6 - ignored - options-object-with-defaults - packages/core/echo/echo-client/src/index.ts:1
- 10ac06cf-7 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:68
- 10ac06cf-8 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1032
- 10ac06cf-9 - ignored - no-casts - packages/core/protocols/src/rpc-bridge.ts:30
- 10ac06cf-10 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:269
- 10ac06cf-11 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:152
- 10ac06cf-12 - ignored - no-casts - packages/sdk/client/src/client/client.ts:368
- 10ac06cf-13 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:536
- 10ac06cf-14 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-list.ts:53
- 10ac06cf-15 - ignored - no-casts - packages/sdk/client/src/echo/space-list.ts:197
- 10ac06cf-16 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:168
- 10ac06cf-17 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:456
- 10ac06cf-18 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:456
- 10ac06cf-19 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:672
- 10ac06cf-20 - ignored - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:720
- 10ac06cf-21 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:864
- 10ac06cf-22 - resolved - errors-extend-base-error - packages/sdk/client/src/services/boot-cache/boot-cache-services.ts:25
- 10ac06cf-23 - resolved - log-fire-and-forget-rejections - packages/sdk/client/src/services/boot-cache/boot-cache-services.ts:88
- 10ac06cf-24 - resolved - log-fire-and-forget-rejections - packages/sdk/client/src/services/boot-cache/boot-cache-store.ts:108

## Issues

# ERROR 10ac06cf-1 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`constructor({ documentId, initialValue, passive, onDelete }: DocHandleProxyOp...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-2 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 320-367 (`async open(ctx: Context): Promise<void> {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-3 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:608`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 608-655 (`} catch (err) {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-4 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1520-1535 (`getLoadedDocumentHandles(): DocHandleProxy<any>[] {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-5 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1622`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 1622-1645 (`return this.#enqueueBranchOp(() => this.#createBranchInternal(rootObjectId, n...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-6 options-object-with-defaults `packages/core/echo/echo-client/src/index.ts:1`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 1-7 (`import { type DataService } from '@dxos/protocols/rpc';`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-7 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:68`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 68-75 (`export * from './proxy-db/index.ts';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-8 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1032`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.87. The likeliest place is lines 1032-1079 (`async #runObjectMigration(migration: Migration.ObjectMigration): Promise<void> {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-9 no-casts `packages/core/protocols/src/rpc-bridge.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`export const normalizeHandlers = <Rpcs extends Rpc.Any>(`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-10 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 269-281 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-11 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:152`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 152-175 (`private _statusTimeout?: NodeJS.Timeout;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-12 no-casts `packages/sdk/client/src/client/client.ts:368`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 368-391 (`}`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-13 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:536`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.86. The likeliest place is lines 536-559 (`private _persistBootCache(bootCache: BootCacheServices): void {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-14 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-list.ts:53`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.87. The likeliest place is lines 53-64 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-15 no-casts `packages/sdk/client/src/echo/space-list.ts:197`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 197-208 (`});`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-16 no-casts `packages/sdk/client/src/echo/space-proxy.ts:168`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 168-191 (`private readonly _db!: DatabaseImpl;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-17 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:456`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 456-479 (`log('initializing...', { space: this.key });`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-18 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:456`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 456-479 (`log('initializing...', { space: this.key });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-19 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:672`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.89. The likeliest place is lines 672-695 (`break;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-20 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:720`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 720-743 (`this._throwIfNotInitialized();`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-21 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:864`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.88. The likeliest place is lines 864-887 (`scheduleTask(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10ac06cf-22 errors-extend-base-error `packages/sdk/client/src/services/boot-cache/boot-cache-services.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 25-41 (`const LATEST_STREAMS = [`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-23 log-fire-and-forget-rejections `packages/sdk/client/src/services/boot-cache/boot-cache-services.ts:88`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.85. The likeliest place is lines 88-99 (`#providerOpen = false;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10ac06cf-24 log-fire-and-forget-rejections `packages/sdk/client/src/services/boot-cache/boot-cache-store.ts:108`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.97. The likeliest place is lines 108-121 (`this.#db = undefined;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9bcc167fb4c49db297e712e2ae540beab201d830`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 24 violations written to fragments, 450 uncertain, 315 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 568 (273 verdicts re-asked with context the model requested)
estimated input tokens: 7144076
billed input tokens: 7190883 (cost $0.3020)
measured chars per token: 2.98
```
