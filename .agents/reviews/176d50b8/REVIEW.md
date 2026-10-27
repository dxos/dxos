---
branch: dm/eloquent-ptolemy-grnoa2
commit: 176d50b8365085baa3e58e79f65a72877d807386
base: 2bba39256c893d3394a5cedfa54922813cfad12d
mode: fast
createdAt: 2026-10-27T10:18:11.384Z
isFinalized: true
groups: 156
rules: [bounded-live-state, effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, one-changeset-per-pr, retries-via-schedule-with-evidence, reuse-shared-test-layer]
reviewId: 176d50b8
---

_2 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 176d50b8-1 - ignored - one-changeset-per-pr - .changeset/github-file-sync.md:1
- 176d50b8-2 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-code/src/types/CodeOperation.ts:13
- 176d50b8-3 - resolved - inject-dependencies-via-constructor - packages/plugins/plugin-github/src/file-sync/glob.ts:5
- 176d50b8-4 - resolved - bounded-live-state - packages/plugins/plugin-github/src/file-sync/glob.ts:35
- 176d50b8-5 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/index.ts:1
- 176d50b8-6 - ignored - reuse-shared-test-layer - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117
- 176d50b8-7 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:234
- 176d50b8-8 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:339
- 176d50b8-9 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-github/src/file-sync/sync-files.ts:496
- 176d50b8-10 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1
- 176d50b8-11 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-github/src/index.ts:1
- 176d50b8-12 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/index.ts:1
- 176d50b8-13 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/enable-file-sync.ts:16
- 176d50b8-14 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184
- 176d50b8-15 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184
- 176d50b8-16 - ignored - inline-obj-parent - packages/plugins/plugin-github/src/operations/sync.ts:379
- 176d50b8-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/services/github-api.ts:282
- 176d50b8-18 - ignored - no-casts - packages/plugins/plugin-github/src/services/github-api.ts:1058

## Issues

# WARN 176d50b8-1 one-changeset-per-pr `.changeset/github-file-sync.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.97. This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-2 no-lint-suppression-to-pass `packages/plugins/plugin-code/src/types/CodeOperation.ts:13`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.81. The likeliest place is lines 13-19 (`import { Repo, Spec } from '@dxos/types';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-3 inject-dependencies-via-constructor `packages/plugins/plugin-github/src/file-sync/glob.ts:5`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.81. The likeliest place is lines 5-10 (`const cache = new Map<string, RegExp>();`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 176d50b8-4 bounded-live-state `packages/plugins/plugin-github/src/file-sync/glob.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 35-44 (`export const matchesAny = (patterns: readonly string[], path: string): boolea...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as TextMerge from './TextMerge.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-6 reuse-shared-test-layer `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 117-128 (`const fakeFetch =`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:234`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 234-247 (`const importText = (input: GitHubCapabilities.FileImportInput) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-8 flat-layer-composition `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:339`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 339-350 (`}),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-9 retries-via-schedule-with-evidence `packages/plugins/plugin-github/src/file-sync/sync-files.ts:496`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 496-507 (`message: `Composer: sync ${files.length} file${files.length === 1 ? '' : 's'}...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-10 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-15 (`import { next as A } from '@automerge/automerge';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-11 namespace-export-with-internal-hiding `packages/plugins/plugin-github/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-9 (`export * as GitHubPlugin from './GitHubPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-12 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-9 (`export * as GitHubPlugin from './GitHubPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/enable-file-sync.ts:16`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 16-27 (`const handler: Operation.WithHandler<typeof GitHubOperation.EnableGitHubFileS...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-14 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 184-195 (`const services = Layer.mergeAll(`, location confidence 0.53). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-15 flat-layer-composition `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 184-195 (`const services = Layer.mergeAll(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-16 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync.ts:379`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 379-402 (`existing ??`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 176d50b8-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/services/github-api.ts:282`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 282-300 (`const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, s...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 176d50b8-18 no-casts `packages/plugins/plugin-github/src/services/github-api.ts:1058`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1058-1085 (`export const updateIssue = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2bba39256c893d3394a5cedfa54922813cfad12d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 231 uncertain, 842 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 477 (171 verdicts re-asked with context the model requested)
estimated input tokens: 4237423
billed input tokens: 4076341 (cost $0.1712)
measured chars per token: 3.12
```
