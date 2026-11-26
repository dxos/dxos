---
branch: claude/unified-plugin-services-017661
commit: eb58c4f95857eb47e356a94c9c6d9472950a74bd
base: 8d2c135a92508af8bdea10c5eca818f4384bbe88
mode: fast
createdAt: 2026-11-26T04:08:58.413Z
isFinalized: true
groups: 138
rules: [import-as-namespace-is-all-or-nothing, use-context-scoped-cancellation]
reviewId: eb58c4f9585
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- eb58c4f9585-1 - ignored - use-context-scoped-cancellation - packages/stories/stories-services/src/services/hosts.test.ts:157
- eb58c4f9585-2 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/Link.ts:1

## Issues

# WARN eb58c4f9585-1 use-context-scoped-cancellation `packages/stories/stories-services/src/services/hosts.test.ts:157`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 157-168 (`const until = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN eb58c4f9585-2 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/Link.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.46). Judged with added `public-api` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d2c135a92508af8bdea10c5eca818f4384bbe88`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 151 uncertain, 903 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 439 (95 verdicts re-asked with context the model requested)
estimated input tokens: 2655297
billed input tokens: 2416242 (cost $0.1015)
measured chars per token: 3.30
```

### Resolution notes

- `eb58c4f9585-1` (ignored, carried): `until` is a test helper that bounds a wait on a host snapshot; there is no context to schedule through.
- `eb58c4f9585-2` (ignored, carried): `Link.ts` carries the `@import-as-namespace` directive, is named for its namespace, and every import site takes the whole namespace. Its named imports come from the `@dxos/rpc` barrel, which is not a namespace module.
