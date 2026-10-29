---
branch: dm/eloquent-ptolemy-grnoa2
commit: a9937393e34ff9f2aedfae820f2b582a9122922f
base: 9bcc167fb4c49db297e712e2ae540beab201d830
mode: fast
createdAt: 2026-10-27T14:30:42.680Z
isFinalized: true
groups: 155
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, retries-via-schedule-with-evidence]
reviewId: a9937393
---

_1 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a9937393-1 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-code/src/types/CodeOperation.ts:13
- a9937393-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/index.ts:1
- a9937393-3 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:337
- a9937393-4 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-github/src/file-sync/sync-files.ts:508
- a9937393-5 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1
- a9937393-6 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-github/src/index.ts:1
- a9937393-7 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/index.ts:1
- a9937393-8 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:187
- a9937393-9 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:187
- a9937393-10 - ignored - inline-obj-parent - packages/plugins/plugin-github/src/operations/sync.ts:379
- a9937393-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/services/github-api.ts:282
- a9937393-12 - ignored - no-casts - packages/plugins/plugin-github/src/services/github-api.ts:1058

## Issues

# WARN a9937393-1 no-lint-suppression-to-pass `packages/plugins/plugin-code/src/types/CodeOperation.ts:13`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.82. The likeliest place is lines 13-19 (`import { Repo, Spec } from '@dxos/types';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as TextMerge from './TextMerge.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-3 flat-layer-composition `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:337`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 337-348 (`}),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-4 retries-via-schedule-with-evidence `packages/plugins/plugin-github/src/file-sync/sync-files.ts:508`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 508-519 (`if (written === undefined) {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-15 (`import { next as A } from '@automerge/automerge';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-6 namespace-export-with-internal-hiding `packages/plugins/plugin-github/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-9 (`export * as GitHubPlugin from './GitHubPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-7 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-9 (`export * as GitHubPlugin from './GitHubPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-8 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:187`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 187-198 (`const services = Layer.mergeAll(`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-9 flat-layer-composition `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:187`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 187-198 (`const services = Layer.mergeAll(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-10 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync.ts:379`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 379-402 (`existing ??`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9937393-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/services/github-api.ts:282`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 282-300 (`const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, s...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9937393-12 no-casts `packages/plugins/plugin-github/src/services/github-api.ts:1058`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1058-1085 (`export const updateIssue = (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9bcc167fb4c49db297e712e2ae540beab201d830`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 233 uncertain, 844 clean, 0 unanswered
- left for an agentic reviewer: 78 batch(es)

```text
requests: 465 (167 verdicts re-asked with context the model requested)
estimated input tokens: 4168067
billed input tokens: 4016743 (cost $0.1687)
measured chars per token: 3.11
```
