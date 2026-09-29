---
branch: dm/eager-gates-2e7pyu
commit: d7a263511d6dbebcdd2e196bf36342a66fce6196
base: 92cd1664378c66718239bae3af4ddf691539c39f
mode: fast
createdAt: 2026-09-27T04:24:09.832Z
isFinalized: true
groups: 109
rules: [namespace-export-with-internal-hiding, use-context-scoped-cancellation]
reviewId: d7a26351
---

_0 error(s), 2 warning(s)._

# WARN d7a26351-1 namespace-export-with-internal-hiding `packages/plugins/plugin-sandbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-10 (`export * as SandboxPlugin from './SandboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d7a26351-2 use-context-scoped-cancellation `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:465`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 465-476 (`};`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.
