---
branch: claude/unified-plugin-services-017661
commit: 8c02846c0a2024234a678b828f90068d87a6f089
base: 8d2c135a92508af8bdea10c5eca818f4384bbe88
mode: fast
createdAt: 2026-11-26T03:47:11.564Z
isFinalized: true
groups: 138
rules: [import-as-namespace-is-all-or-nothing, per-test-mutable-fixtures, use-context-scoped-cancellation]
reviewId: 8c02846c0a2
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8c02846c0a2-1 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/contracts/index.ts:1
- 8c02846c0a2-2 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/HostControl.ts:51
- 8c02846c0a2-3 - resolved - per-test-mutable-fixtures - packages/stories/stories-services/src/services/hosts.test.ts:76
- 8c02846c0a2-4 - ignored - use-context-scoped-cancellation - packages/stories/stories-services/src/services/hosts.test.ts:148
- 8c02846c0a2-5 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/Link.ts:1
- 8c02846c0a2-6 - ignored - import-as-namespace-is-all-or-nothing - packages/stories/stories-services/src/services/State.ts:1

## Issues

# WARN 8c02846c0a2-1 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/contracts/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-7 (`export * as NoteStore from './NoteStore.ts';`, location confidence 1.00). Judged with added `imports` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c02846c0a2-2 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/HostControl.ts:51`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 51-65 (`export const Contract = Service.make('org.dxos.stories.services.host', {`, location confidence 0.56). Judged with added `public-api` context after a first pass of 0.65. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c02846c0a2-3 per-test-mutable-fixtures `packages/stories/stories-services/src/services/hosts.test.ts:76`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 76-79 (`const failed = new Promise<void>((resolve) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c02846c0a2-4 use-context-scoped-cancellation `packages/stories/stories-services/src/services/hosts.test.ts:148`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 148-159 (`const until = (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c02846c0a2-5 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/Link.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.56). Judged with added `public-api` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c02846c0a2-6 import-as-namespace-is-all-or-nothing `packages/stories/stories-services/src/services/State.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-14 (`import type * as Cause from 'effect/Cause';`, location confidence 0.68). Judged with added `public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d2c135a92508af8bdea10c5eca818f4384bbe88`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 170 uncertain, 883 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 449 (102 verdicts re-asked with context the model requested)
estimated input tokens: 2628118
billed input tokens: 2401788 (cost $0.1009)
measured chars per token: 3.28
```

### Resolution notes

- `8c02846c0a2-1`, `-2`, `-5`, `-6` (ignored): each module carries the `@import-as-namespace` directive, is named for its namespace, is re-exported under that name, and every import site in the package takes the whole namespace (`grep` for a named import of a member finds none). The named imports in `Link.ts` come from the `@dxos/rpc` barrel, which is not a namespace module.
- `8c02846c0a2-3` (resolved): the failing notes plugin and the promise that marks its failure are now built inside the one test that uses them (`failingNotes()`), not at module level.
- `8c02846c0a2-4` (ignored, carried): `until` is a test helper that bounds a wait on a host snapshot; there is no context to schedule through.
