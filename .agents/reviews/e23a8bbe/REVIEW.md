---
branch: claude/data-service-cache-design-8m37a4
commit: e23a8bbedaacbf9ce7d5ae270ccf9df7cb043c25
base: 6a37f4b4c92dcd721a3375a0f25a33b6534a3848
mode: fast
createdAt: 2026-11-17T20:42:55.725Z
isFinalized: true
groups: 201
rules: [barrel-imports-not-internal-paths, consistent-private-field-convention, deferred-callback-owns-its-context, deprecated-tag-must-be-accurate, error-messages-carry-context, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, minimal-precise-tests, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, retries-via-schedule-with-evidence, reuse-shared-test-layer, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: e23a8bbe
---

_7 error(s), 29 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e23a8bbe-1 - unresolved - no-casts - packages/core/compute/compute-runtime/src/protocol.test.ts:373
- e23a8bbe-2 - unresolved - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- e23a8bbe-3 - unresolved - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:179
- e23a8bbe-4 - unresolved - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:215
- e23a8bbe-5 - unresolved - no-mixed-promise-effect-lifecycle - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79
- e23a8bbe-6 - unresolved - use-context-scoped-cancellation - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:103
- e23a8bbe-7 - unresolved - reuse-shared-test-layer - packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:29
- e23a8bbe-8 - unresolved - no-casts - packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:203
- e23a8bbe-9 - unresolved - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- e23a8bbe-10 - unresolved - no-try-catch-in-effect-code - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:89
- e23a8bbe-11 - unresolved - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208
- e23a8bbe-12 - unresolved - use-context-scoped-cancellation - packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:101
- e23a8bbe-13 - unresolved - test-asserts-real-behavior - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- e23a8bbe-14 - unresolved - minimal-precise-tests - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46
- e23a8bbe-15 - unresolved - consistent-private-field-convention - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:134
- e23a8bbe-16 - unresolved - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:177
- e23a8bbe-17 - unresolved - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:317
- e23a8bbe-18 - unresolved - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:365
- e23a8bbe-19 - unresolved - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:227
- e23a8bbe-20 - unresolved - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:347
- e23a8bbe-21 - unresolved - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:467
- e23a8bbe-22 - unresolved - error-messages-carry-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:563
- e23a8bbe-23 - unresolved - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1122
- e23a8bbe-24 - unresolved - options-object-with-defaults - packages/core/echo/echo-client/src/index.ts:1
- e23a8bbe-25 - unresolved - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:69
- e23a8bbe-26 - unresolved - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1103
- e23a8bbe-27 - unresolved - deprecated-tag-must-be-accurate - packages/core/echo/echo-client/src/proxy-db/database.ts:1487
- e23a8bbe-28 - unresolved - deprecated-tag-must-be-accurate - packages/core/protocols/src/FunctionProtocol.ts:110
- e23a8bbe-29 - unresolved - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- e23a8bbe-30 - unresolved - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:20
- e23a8bbe-31 - unresolved - no-casts - packages/sdk/client/src/echo/space-proxy.ts:169
- e23a8bbe-32 - unresolved - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:193
- e23a8bbe-33 - unresolved - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:457
- e23a8bbe-34 - unresolved - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:457
- e23a8bbe-35 - unresolved - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:673
- e23a8bbe-36 - unresolved - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:913

## Issues

# ERROR e23a8bbe-1 no-casts `packages/core/compute/compute-runtime/src/protocol.test.ts:373`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 373-396 (`test('decodes an encoded reference for an optional NULLABLE ref field', async...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-2 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-3 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 179-190 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-4 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:215`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 215-228 (`});`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-5 no-mixed-promise-effect-lifecycle `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 79-90 (`async 'refreshWorkingSet'(): Promise<void> {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-6 use-context-scoped-cancellation `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:103`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 103-114 (`}`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-7 reuse-shared-test-layer `packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:29`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 29-40 (`class MemoryDataService implements EdgeFunctionEnv.DataService {`, location confidence 0.94). Judged with added `siblings, similar` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-8 no-casts `packages/core/compute/functions-runtime-cloudflare/src/internal/stale-root.test.ts:203`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 203-214 (`(held as { name?: string }).name = 'final';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-9 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-10 no-try-catch-in-effect-code `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:89`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 89-97 (`try {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-11 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 208-219 (`const invoke: Host['invoke'] = async (request, env, scope = {}) => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-12 use-context-scoped-cancellation `packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:101`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 101-112 (`const InspectHandler = Inspect.pipe(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-13 test-asserts-real-behavior `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.93. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-14 minimal-precise-tests `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.test.ts:46`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.83. The likeliest place is lines 46-57 (`test('update handle with foreign mutation', async () => {`, location confidence 0.29). Judged with added `diff, test` context after a first pass of 0.65. This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-15 consistent-private-field-convention `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:134`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 134-152 (`export class DocHandleProxy<T> extends EventEmitter<ClientDocHandleEvents<T>>...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-16 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:177`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 177-200 (`this.#shown.wake();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-17 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:317`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 317-328 (`}: LoadObjectProps): Promise<Entity.Unknown | undefined> {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-18 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:365`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 365-376 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-19 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:227`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.87. The likeliest place is lines 227-250 (`#directory: { json: DirectoryJson; text: string } | undefined = undefined;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-20 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:347`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 347-370 (`async open(ctx: Context): Promise<void> {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-21 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:467`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 467-490 (`try {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-22 error-messages-carry-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:563`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 563-586 (`if (!this._spaceRootDocHandle) {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-23 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1122`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1122-1145 (`let inactivityTimeoutTimer: any | undefined;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-24 options-object-with-defaults `packages/core/echo/echo-client/src/index.ts:1`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 1-8 (`import { type DataService } from '@dxos/protocols/rpc';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-25 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:69`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 69-74 (`export * from './registry/index.ts';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-26 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1103`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.81. The likeliest place is lines 1103-1126 (`for (const migration of migrations) {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-27 deprecated-tag-must-be-accurate `packages/core/echo/echo-client/src/proxy-db/database.ts:1487`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 1487-1510 (`async updateIndexes(): Promise<void> {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-28 deprecated-tag-must-be-accurate `packages/core/protocols/src/FunctionProtocol.ts:110`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 110-122 (`spaceKey?: string;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-29 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-15 (`export * from './automerge.ts';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-30 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:20`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 20-27 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e23a8bbe-31 no-casts `packages/sdk/client/src/echo/space-proxy.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 169-192 (`private readonly _db!: DatabaseImpl;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-32 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:193`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.89. The likeliest place is lines 193-216 (`private readonly _runtime: EffectContext.Context<never> = EffectContext.empty(),`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-33 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-34 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:457`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 457-480 (`this._initializationComplete.reset();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-35 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:673`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.91. The likeliest place is lines 673-696 (`switch (response._tag) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e23a8bbe-36 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:913`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 913-937 (`);`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6a37f4b4c92dcd721a3375a0f25a33b6534a3848`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 36 violations written to fragments, 317 uncertain, 1152 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 696 (196 verdicts re-asked with context the model requested)
estimated input tokens: 7677892
billed input tokens: 7505428 (cost $0.3152)
measured chars per token: 3.07
```
