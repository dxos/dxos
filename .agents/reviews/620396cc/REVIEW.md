---
branch: dm/relaxed-clarke-1k82bb
commit: 620396cce95e8626b5ed19a2f77b9a31f3c320a4
base: d737d675aed659b6ccb09163720688ea5b5ebc52
mode: fast
createdAt: 2026-11-24T19:24:32.063Z
isFinalized: true
groups: 148
rules: [barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, canonical-api-surface, code-not-in-strings, dont-leak-internal-api-through-public-surface, errors-extend-base-error, no-casts, no-try-catch-in-effect-code, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: 620396cc
---

_3 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 620396cc-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:25
- 620396cc-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:176
- 620396cc-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:702
- 620396cc-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-effect.ts:319
- 620396cc-5 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 620396cc-6 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 620396cc-7 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:180
- 620396cc-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:216
- 620396cc-9 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:332
- 620396cc-10 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/RegistrySource.ts:109
- 620396cc-11 - ignored - test-real-scenario-not-narrower-proxy - packages/core/echo/echo-client-e2e/src/registry-source.test.ts:224
- 620396cc-12 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/hypergraph.ts:749
- 620396cc-13 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/hypergraph.ts:1024
- 620396cc-14 - ignored - bounded-live-state - packages/core/echo/echo-client/src/registry/registry.ts:252

## Issues

# WARN 620396cc-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 25-53 (`import { EffectDialect } from './dialect-effect.ts';`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:176`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.91. The likeliest place is lines 176-199 (`describe('code mode', { tags: ['model-fixture'] }, () => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:702`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.88. The likeliest place is lines 702-725 (`yield* call(PlainDialect, 'plain', "print(await ops.score({ title: 'abc' }));...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 620396cc-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-effect.ts:319`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 319-325 (`class ArgumentError extends Schema.TaggedError<ArgumentError>('ArgumentError'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-5 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-6 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.83. The likeliest place is lines 13-24 (`import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';`, location confidence 0.52). Judged with added `imports, public-api, similar` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 620396cc-7 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:180`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 180-191 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-8 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:216`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 216-229 (`});`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-9 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:332`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 332-345 (`const operationRecord = (handler: Operation.WithHandler<Operation.Definition....`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-10 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/RegistrySource.ts:109`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 109-121 (`const rebuildType = (record: PluginProtocol.TypeRecord): Type.AnyEntity[] => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-11 test-real-scenario-not-narrower-proxy `packages/core/echo/echo-client-e2e/src/registry-source.test.ts:224`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 224-235 (`const makeMockRegistry = (options: { fail?: boolean } = {}) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-12 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/hypergraph.ts:749`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 749-772 (`}`, location confidence 0.33). Judged with added `package` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 620396cc-13 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/hypergraph.ts:1024`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.82. The likeliest place is lines 1024-1046 (`export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 620396cc-14 bounded-live-state `packages/core/echo/echo-client/src/registry/registry.ts:252`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 252-263 (`#put(entity: Entity.Unknown): void {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 620396cc-1, -2, -3, -4: `code-mode.test.ts` and `dialect-effect.ts` are not this PR's beyond one call each (`registerRegistrySource`, `describeTypes(registry.list())`); the flagged fixtures, template-string programs, Promise bridges and `ArgumentError` predate it.
- 620396cc-5, -6, -7, -8: `protocol.ts`'s imports, the `any` on the handler's return and its try/catch predate the PR, which only renames the `typeSource` option to `registrySource`.
- 620396cc-9: `operationRecord`'s try/catch predates the PR.
- 620396cc-10: `rebuildType` is plain synchronous code, not an Effect: the rule's Effect error channel is not in play, and the catch keeps one malformed published type from costing the whole listing.
- 620396cc-11: the e2e suite drives the real registry and query path; the source is the boundary under test, so it is stubbed. The EDGE path is driven end to end by edge's agent suites against bundles built from this branch.
- 620396cc-12: the try/finally at `hypergraph.ts:749` is the existing ref-resolution trace, not Effect code.
- 620396cc-13: `OBJECT_DIAGNOSTICS` predates the PR.
- 620396cc-14: the registry is an in-memory cache by design, and what sources add is bounded by what the live sources publish. Removing a source removes every entity it added. An enumerated entity whose most specific URI (its versioned key, or its type's typename and version) is already registered or already in the same answer is not added again, even when a source rebuilt it under a new id. The per-query enumeration cache is cleared when a source is added or removed, on `remove()` and `clear()`, and when an enumeration fails.


### System One pass

- model: jev-latest
- base for context: `d737d675aed659b6ccb09163720688ea5b5ebc52`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 476 uncertain, 334 clean, 0 unanswered
- left for an agentic reviewer: 95 batch(es)

```text
requests: 482 (285 verdicts re-asked with context the model requested)
estimated input tokens: 5343197
billed input tokens: 5209594 (cost $0.2188)
measured chars per token: 3.08
```
