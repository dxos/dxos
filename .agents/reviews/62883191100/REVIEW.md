---
branch: claude/unified-plugin-services-017661
commit: 628831911008e6004ca9f7db5721b158785244f2
base: 8d2c135a92508af8bdea10c5eca818f4384bbe88
mode: fast
createdAt: 2026-11-26T04:28:58.929Z
isFinalized: true
groups: 138
rules: [import-as-namespace-is-all-or-nothing]
reviewId: 62883191100
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 62883191100-1 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/contracts/Settings.ts:19
- 62883191100-2 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/Link.ts:1
- 62883191100-3 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/State.ts:1

## Issues

# WARN 62883191100-1 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/contracts/Settings.ts:19`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 19-36 (`export const Contract = Service.make('org.dxos.stories.services.settings', {`, location confidence 0.28). Judged with added `public-api` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN 62883191100-2 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/Link.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.56). Judged with added `public-api` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 62883191100-3 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/State.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-14 (`import type * as Cause from 'effect/Cause';`, location confidence 0.76). Judged with added `public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d2c135a92508af8bdea10c5eca818f4384bbe88`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 155 uncertain, 866 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 428 (93 verdicts re-asked with context the model requested)
estimated input tokens: 2668874
billed input tokens: 2425960 (cost $0.1019)
measured chars per token: 3.30
```

### Resolution notes

- `62883191100-1`, `-2`, `-3` (ignored): `Settings.ts`, `Link.ts` and `State.ts` each carry the `@import-as-namespace` directive, are named for their namespace, are re-exported under that name, and every import site in the package takes the whole namespace (a search for a named import of a member finds none). The named imports in `Link.ts` come from the `@dxos/rpc` barrel, which is not a namespace module.
