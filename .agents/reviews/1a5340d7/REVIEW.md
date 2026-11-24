---
branch: dm/relaxed-clarke-1k82bb
commit: 1a5340d7c6ae326bd7b0d7bbfc75453766afdd52
base: d737d675aed659b6ccb09163720688ea5b5ebc52
mode: fast
createdAt: 2026-11-24T20:05:18.433Z
isFinalized: true
groups: 150
rules: [barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, canonical-api-surface, code-not-in-strings, dont-leak-internal-api-through-public-surface, errors-extend-base-error, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: 1a5340d7
---

_4 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1a5340d7-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:25
- 1a5340d7-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:176
- 1a5340d7-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:702
- 1a5340d7-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-effect.ts:319
- 1a5340d7-5 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37
- 1a5340d7-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:233
- 1a5340d7-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:265
- 1a5340d7-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:72
- 1a5340d7-9 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:100
- 1a5340d7-10 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 1a5340d7-11 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 1a5340d7-12 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:180
- 1a5340d7-13 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:216
- 1a5340d7-14 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:44
- 1a5340d7-15 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:210
- 1a5340d7-16 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/RegistrySource.ts:125
- 1a5340d7-17 - ignored - test-real-scenario-not-narrower-proxy - packages/core/echo/echo-client-e2e/src/registry-source.test.ts:370
- 1a5340d7-18 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/hypergraph.ts:749
- 1a5340d7-19 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/hypergraph.ts:1024
- 1a5340d7-20 - ignored - bounded-live-state - packages/core/echo/echo-client/src/registry/registry.ts:96
- 1a5340d7-21 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/registry/registry.ts:458

## Issues

# WARN 1a5340d7-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 25-53 (`import { EffectDialect } from './dialect-effect.ts';`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:176`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 176-199 (`describe('code mode', { tags: ['model-fixture'] }, () => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:702`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.89. The likeliest place is lines 702-725 (`yield* call(PlainDialect, 'plain', "print(await ops.score({ title: 'abc' }));...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a5340d7-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-effect.ts:319`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 319-325 (`class ArgumentError extends Schema.TaggedError<ArgumentError>('ArgumentError'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a5340d7-5 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 37-49 (`const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-6 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:233`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 233-244 (`const rebuildType = ({ typename, version, jsonSchema, skills }: SandboxType) ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-7 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:265`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 265-276 (`const forwardOperations = (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-8 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:72`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 72-83 (`const hostOperations = (db: Database.Database): Operation.OperationService => ({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-9 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandboxWorkerd.test.ts:100`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 100-109 (`const instantiate = (source: string): new () => WorkerSandboxWorkerd.Entrypoi...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-10 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-11 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.83. The likeliest place is lines 13-24 (`import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';`, location confidence 0.51). Judged with added `imports, public-api, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a5340d7-12 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:180`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 180-191 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-13 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:216`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 216-229 (`});`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-14 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:44`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 44-58 (`const serializeOperations = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-15 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:210`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 210-221 (`const invoke: Host['invoke'] = async (request, env, scope = {}) => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-16 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/RegistrySource.ts:125`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 125-137 (`const rebuildType = (record: PluginProtocol.TypeRecord): Type.AnyEntity[] => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-17 test-real-scenario-not-narrower-proxy `packages/core/echo/echo-client-e2e/src/registry-source.test.ts:370`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 370-381 (`const makeMockRegistry = (options: { fail?: boolean } = {}) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-18 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/hypergraph.ts:749`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 749-772 (`}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-19 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/hypergraph.ts:1024`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1024-1046 (`export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1a5340d7-20 bounded-live-state `packages/core/echo/echo-client/src/registry/registry.ts:96`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.86. The likeliest place is lines 96-107 (`this.#put(entity);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1a5340d7-21 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/registry/registry.ts:458`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 458-469 (`const getEntityUris = (entity: Entity.Unknown): URI.URI[] => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

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
- 1a5340d7-5, -6, -7: `WorkerSandboxRuntime.ts` code this PR does not write; the PR only renames the `registerTypeSource` call to `registerRegistrySource`. The sandbox runtime is plain Promise code at the worker boundary, not Effect code.
- 1a5340d7-8, -9: the same rename in `WorkerSandboxWorkerd.test.ts`; the flagged fixtures predate this PR.
- 1a5340d7-14: `serializeOperations` predates this PR, which adds one line to `toSkillRecord`; it is synchronous, not Effect code.
- 1a5340d7-21: the `try` in `getEntityUris` is on `main` already, and the function is synchronous, not Effect code.

### System One pass

- model: jev-latest
- base for context: `d737d675aed659b6ccb09163720688ea5b5ebc52`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 230 uncertain, 728 clean, 0 unanswered
- left for an agentic reviewer: 83 batch(es)

```text
requests: 409 (144 verdicts re-asked with context the model requested)
estimated input tokens: 4550353
billed input tokens: 4330722 (cost $0.1819)
measured chars per token: 3.15
```
