---
branch: dm/affectionate-mendel-1htqdr
commit: d7f628c58d5303f9aa0ecb77f0a68fd31211ea16
base: 54ceffb84fae538de4c692a82d8bfc9c23d2141b
mode: fast
createdAt: 2026-11-18T16:19:49.714Z
isFinalized: true
groups: 138
rules: [import-as-namespace-is-all-or-nothing, no-try-catch-in-effect-code]
reviewId: d7f628c58d
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d7f628c58d-1 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1
- d7f628c58d-2 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:123
- d7f628c58d-3 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory/src/Rdf.ts:1

## Issues

# WARN d7f628c58d-1 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-15 (`import * as Effect from 'effect/Effect';`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN d7f628c58d-2 no-try-catch-in-effect-code `packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:123`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 123-136 (`const compiles = (rules: Evaluator.Subscription): boolean => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. `compiles` is unchanged from `main` (it landed with dxos/dxos#14548); this PR only changes imports and `applyRemote` in this file.

# WARN d7f628c58d-3 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory/src/Rdf.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-30 (`import type * as RdfJs from '@rdfjs/types';`, location confidence 0.51). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `54ceffb84fae538de4c692a82d8bfc9c23d2141b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 306 uncertain, 462 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 423 (164 verdicts re-asked with context the model requested)
estimated input tokens: 3128558
billed input tokens: 3052532 (cost $0.1282)
measured chars per token: 3.07
```
