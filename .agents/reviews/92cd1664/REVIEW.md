---
branch: dm/eager-gates-2e7pyu
commit: 92cd1664378c66718239bae3af4ddf691539c39f
base: 5662bbc3b0d2315aff7b697a0de1611f5f04fee7
mode: fast
createdAt: 2026-09-26T18:59:09.329Z
isFinalized: true
groups: 110
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, no-env-vars-in-low-level-modules, use-context-scoped-cancellation]
reviewId: 92cd1664
---

_1 error(s), 3 warning(s)._

# WARN 92cd1664-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 24-35 (`const PNG_BYTES = Uint8Array.from(`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 92cd1664-2 no-env-vars-in-low-level-modules `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:90`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.80. The likeliest place is lines 90-101 (`export class LocalSandboxBackend implements SandboxService.Backend {`, location confidence 0.48). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 92cd1664-3 use-context-scoped-cancellation `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:450`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 450-461 (`}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 92cd1664-4 errors-extend-base-error `packages/plugins/plugin-sandbox/src/types/SandboxService.ts:13`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 13-18 (`export class SandboxError extends Data.TaggedError('SandboxError')<{ message:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.
