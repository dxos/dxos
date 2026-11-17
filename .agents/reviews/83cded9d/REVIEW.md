---
branch: claude/data-service-cache-design-8m37a4
commit: 83cded9d2a69fe81da38c67a743cf2a8d956d5fb
base: 95f1efb72efdd464fa3f6abfa829a6ecefac049a
mode: fast
createdAt: 2026-11-17T15:33:09.133Z
isFinalized: true
groups: 202
rules: [barrel-imports-not-internal-paths, consistent-private-field-convention, deferred-callback-owns-its-context, deprecated-tag-must-be-accurate, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, retries-via-schedule-with-evidence, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: 83cded9d
---

_8 error(s), 32 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 83cded9d-1 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- 83cded9d-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:13
- 83cded9d-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.test.ts:173
- 83cded9d-4 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 83cded9d-5 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:179
- 83cded9d-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:215
- 83cded9d-7 - ignored - operations-resolve-database-from-service - packages/core/compute/compute-runtime/src/working-set-handoff.ts:15
- 83cded9d-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79
- 83cded9d-9 - ignored - use-context-scoped-cancellation - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:103
- 83cded9d-10 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:203
- 83cded9d-11 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- 83cded9d-12 - ignored - no-try-catch-in-effect-code - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:89
- 83cded9d-13 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/HostServices.ts:227
- 83cded9d-14 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208
- 83cded9d-15 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- 83cded9d-16 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:177
- 83cded9d-17 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:159
- 83cded9d-18 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:351
- 83cded9d-19 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:375
- 83cded9d-20 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1095
- 83cded9d-21 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1095
- 83cded9d-22 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:317
- 83cded9d-23 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:365
- 83cded9d-24 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:227
- 83cded9d-25 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:347
- 83cded9d-26 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:419
- 83cded9d-27 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2653
- 83cded9d-28 - ignored - options-object-with-defaults - packages/core/echo/echo-client/src/index.ts:1
- 83cded9d-29 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:69
- 83cded9d-30 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1031
- 83cded9d-31 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo-client/src/proxy-db/database.ts:1411
- 83cded9d-32 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/proxy-db/working-set-sync.ts:124
- 83cded9d-33 - ignored - deprecated-tag-must-be-accurate - packages/core/protocols/src/FunctionProtocol.ts:110
- 83cded9d-34 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- 83cded9d-35 - ignored - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:20
- 83cded9d-36 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:169
- 83cded9d-37 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:193
- 83cded9d-38 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:457
- 83cded9d-39 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:457
- 83cded9d-40 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:673

## Issues

# WARN 83cded9d-1 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-2 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 13-24 (`export * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-3 no-casts `packages/core/compute/compute-runtime/src/protocol.test.ts:173`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 173-184 (`expect((renamed as { title?: string } | undefined)?.title).toBe('renamed');`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-4 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.51). Judged with added `imports, public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-5 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 179-190 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-6 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:215`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 215-228 (`});`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-7 operations-resolve-database-from-service `packages/core/compute/compute-runtime/src/working-set-handoff.ts:15`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.88. The likeliest place is lines 15-26 (`export const handOffWorkingSet = async <T>(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-8 no-mixed-promise-effect-lifecycle `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 79-90 (`async 'refreshWorkingSet'(): Promise<void> {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-9 use-context-scoped-cancellation `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:103`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 103-114 (`}`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-10 no-casts `packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:203`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 203-214 (`(held as { name?: string }).name = 'final';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-11 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-12 no-try-catch-in-effect-code `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:89`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 89-97 (`try {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-13 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/HostServices.ts:227`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 227-238 (`);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-14 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 208-219 (`const invoke: Host['invoke'] = async (request, env, scope = {}) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-15 test-asserts-real-behavior `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.92. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-16 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:177`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 177-200 (`this.#shown.wake();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-17 consistent-private-field-convention `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:159`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 159-182 (`#stoppedBy: { reason: string; error: Error } | undefined = undefined;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-18 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:351`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 351-374 (`await sleep(FLUSH_RETRY_DELAY_MS * attempt + (this._isReconnecting ? this._re...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-19 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:375`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 375-398 (`throw err;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-20 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1095`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 1095-1118 (`this._lastSendError = err as Error;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-21 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1095`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 1095-1118 (`this._lastSendError = err as Error;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-22 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:317`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 317-328 (`}: LoadObjectProps): Promise<Entity.Unknown | undefined> {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-23 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:365`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 365-376 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-24 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:227`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 227-250 (`#directory: { json: DirectoryJson; text: string } | undefined = undefined;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-25 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:347`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 347-370 (`async open(ctx: Context): Promise<void> {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-26 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:419`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 419-442 (`await this._hydrateCurrentBranches();`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-27 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2653`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 2653-2676 (`try {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-28 options-object-with-defaults `packages/core/echo/echo-client/src/index.ts:1`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 1-8 (`import { type DataService } from '@dxos/protocols/rpc';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-29 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:69`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 69-74 (`export * from './registry/index.ts';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-30 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1031`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 1031-1078 (`for (const migration of migrations) {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-31 deprecated-tag-must-be-accurate `packages/core/echo/echo-client/src/proxy-db/database.ts:1411`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 1411-1434 (`}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-32 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/proxy-db/working-set-sync.ts:124`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 124-135 (`this.#changed.clear();`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-33 deprecated-tag-must-be-accurate `packages/core/protocols/src/FunctionProtocol.ts:110`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 110-121 (`spaceId?: SpaceId;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-34 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-15 (`export * from './automerge.ts';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-35 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:20`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 20-27 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 83cded9d-36 no-casts `packages/sdk/client/src/echo/space-proxy.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 169-192 (`private readonly _db!: DatabaseImpl;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-37 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:193`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.89. The likeliest place is lines 193-216 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-38 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-39 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 83cded9d-40 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:673`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.91. The likeliest place is lines 673-696 (`switch (response._tag) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `95f1efb72efdd464fa3f6abfa829a6ecefac049a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 40 violations written to fragments, 324 uncertain, 1188 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 726 (201 verdicts re-asked with context the model requested)
estimated input tokens: 8407667
billed input tokens: 8241935 (cost $0.3462)
measured chars per token: 3.06
```
