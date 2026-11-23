---
branch: dm/zealous-bohr-833aun
commit: f229864e7e4c459cd0de388cbf41bee2501f1e41
base: 9bcc167fb4c49db297e712e2ae540beab201d830
mode: fast
createdAt: 2026-10-27T14:12:50.841Z
isFinalized: true
groups: 147
rules: [comment-hygiene, consistent-private-field-convention, deferred-callback-owns-its-context, error-messages-carry-context, log-fire-and-forget-rejections, named-durations-and-budgets, namespace-export-with-internal-hiding, no-casts, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, prefer-branded-types-over-raw-primitives, retries-via-schedule-with-evidence, use-context-scoped-cancellation]
reviewId: f229864e
---

_7 error(s), 18 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f229864e-1 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:146
- f229864e-2 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:320
- f229864e-3 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:608
- f229864e-4 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/core-db/entity-manager.ts:752
- f229864e-5 - ignored - named-durations-and-budgets - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1040
- f229864e-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520
- f229864e-7 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1622
- f229864e-8 - ignored - comment-hygiene - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1942
- f229864e-9 - ignored - options-object-with-defaults - packages/core/echo/echo-client/src/index.ts:1
- f229864e-10 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:68
- f229864e-11 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1032
- f229864e-12 - ignored - no-casts - packages/core/protocols/src/rpc-bridge.ts:30
- f229864e-13 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:269
- f229864e-14 - ignored - no-casts - packages/sdk/client/src/client/client.ts:368
- f229864e-15 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:536
- f229864e-16 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/client/client.ts:632
- f229864e-17 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:680
- f229864e-18 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-list.ts:53
- f229864e-19 - ignored - no-casts - packages/sdk/client/src/echo/space-list.ts:197
- f229864e-20 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:168
- f229864e-21 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:456
- f229864e-22 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:456
- f229864e-23 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:672
- f229864e-24 - ignored - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:720
- f229864e-25 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:864

## Issues

# ERROR f229864e-1 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`constructor({ documentId, initialValue, passive, onDelete }: DocHandleProxyOp...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-2 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 320-367 (`async open(ctx: Context): Promise<void> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-3 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:608`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 608-655 (`} catch (err) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-4 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/core-db/entity-manager.ts:752`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.81. The likeliest place is lines 752-799 (`#watchPassive(id: string, handle: DocHandleProxy<DatabaseDirectory>): void {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-5 named-durations-and-budgets `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1040`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 1040-1087 (`if (!this._objectPresent(objectId)) {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-6 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1520`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1520-1535 (`getLoadedDocumentHandles(): DocHandleProxy<any>[] {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-7 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1622`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.87. The likeliest place is lines 1622-1645 (`return this.#enqueueBranchOp(() => this.#createBranchInternal(rootObjectId, n...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-8 comment-hygiene `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1942`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 1942-1965 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-9 options-object-with-defaults `packages/core/echo/echo-client/src/index.ts:1`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.84. The likeliest place is lines 1-7 (`import { type DataService } from '@dxos/protocols/rpc';`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-10 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:68`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 68-75 (`export * from './proxy-db/index.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-11 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1032`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.85. The likeliest place is lines 1032-1079 (`async #runObjectMigration(migration: Migration.ObjectMigration): Promise<void> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-12 no-casts `packages/core/protocols/src/rpc-bridge.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`export const normalizeHandlers = <Rpcs extends Rpc.Any>(`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-13 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 269-281 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-14 no-casts `packages/sdk/client/src/client/client.ts:368`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 368-391 (`}`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-15 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:536`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 536-559 (`private _persistBootCache(bootCache: BootCacheServices): void {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-16 no-try-catch-in-effect-code `packages/sdk/client/src/client/client.ts:632`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 632-655 (`})`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-17 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:680`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 680-703 (`log('client._open: subscribing to system status...');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-18 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-list.ts:53`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.87. The likeliest place is lines 53-64 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-19 no-casts `packages/sdk/client/src/echo/space-list.ts:197`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 197-208 (`});`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f229864e-20 no-casts `packages/sdk/client/src/echo/space-proxy.ts:168`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 168-191 (`private readonly _db!: DatabaseImpl;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-21 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:456`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 456-479 (`log('initializing...', { space: this.key });`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-22 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:456`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 456-479 (`log('initializing...', { space: this.key });`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-23 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:672`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.89. The likeliest place is lines 672-695 (`break;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-24 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:720`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 720-743 (`this._throwIfNotInitialized();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f229864e-25 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:864`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.87. The likeliest place is lines 864-887 (`scheduleTask(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9bcc167fb4c49db297e712e2ae540beab201d830`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 25 violations written to fragments, 478 uncertain, 372 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 604 (287 verdicts re-asked with context the model requested)
estimated input tokens: 7392714
billed input tokens: 7416572 (cost $0.3115)
measured chars per token: 2.99
```
