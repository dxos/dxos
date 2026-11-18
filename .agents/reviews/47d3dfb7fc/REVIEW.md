---
branch: dm/affectionate-mendel-1htqdr
commit: 47d3dfb7fce0355e3208609d8eaf3a3ab0323002
base: 54ceffb84fae538de4c692a82d8bfc9c23d2141b
mode: fast
createdAt: 2026-11-18T15:34:31.040Z
isFinalized: true
groups: 138
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing]
reviewId: 47d3dfb7fc
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 47d3dfb7fc-1 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1
- 47d3dfb7fc-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:377
- 47d3dfb7fc-3 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory/src/Rdf.ts:1
- 47d3dfb7fc-4 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory/src/Vocab.ts:1

## Issues

# WARN 47d3dfb7fc-1 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1`

Ignored: LocalRdfStore.ts carries `@import-as-namespace`, has a PascalCase name, is re-exported as `export * as LocalRdfStore`, and every import site uses that namespace.

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-15 (`import * as Effect from 'effect/Effect';`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47d3dfb7fc-2 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:377`

Resolved: `applyRemote` is an `Effect.fnUntraced`.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 377-388 (`const applyRemote = (batch: RdfStore.Batch) =>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47d3dfb7fc-3 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory/src/Rdf.ts:1`

Ignored: Rdf.ts carries `@import-as-namespace`, has a PascalCase name, is re-exported as `export * as Rdf`, and every import site uses that namespace.

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-29 (`import type * as RdfJs from '@rdfjs/types';`, location confidence 0.52). Judged with added `importers` context after a first pass of 0.69. This is a single-shot classifier: confirm against the rule before acting.

# WARN 47d3dfb7fc-4 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory/src/Vocab.ts:1`

Ignored: Vocab.ts carries `@import-as-namespace`, has a PascalCase name, is re-exported as `export * as Vocab`, and every import site uses that namespace.

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-79 (`import * as Fact from './Fact.ts';`, location confidence 0.75). Judged with added `importers` context after a first pass of 0.63. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `54ceffb84fae538de4c692a82d8bfc9c23d2141b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 310 uncertain, 454 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 431 (168 verdicts re-asked with context the model requested)
estimated input tokens: 3101366
billed input tokens: 3023991 (cost $0.1270)
measured chars per token: 3.08
```
