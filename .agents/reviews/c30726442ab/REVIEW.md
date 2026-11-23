---
branch: claude/feature-mdl-sync-2e735a
commit: c30726442aba923b73069433a1581cf2a10ab27b
base: 8ad08cb2be9afbc854637512e3fa36d633216698
mode: fast
createdAt: 2026-11-02T16:10:37.486Z
isFinalized: true
groups: 326
rules: [business-logic-out-of-ui, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, no-casts, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, reactive-state-via-atom-bridge, ref-collections-via-query, retries-via-schedule-with-evidence, reuse-shared-test-layer, setter-must-not-own-transaction, story-for-new-ui-component, toolbars-are-menu-actions]
reviewId: c30726442ab
---

_1 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c30726442ab-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:212
- c30726442ab-2 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:512
- c30726442ab-3 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:52
- c30726442ab-4 - ignored - reuse-shared-test-layer - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117
- c30726442ab-5 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-github/src/file-sync/sync-files.ts:530
- c30726442ab-6 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1
- c30726442ab-7 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/capabilities/migrations.ts:104
- c30726442ab-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/components/FeatureCard/index.ts:1
- c30726442ab-9 - resolved - story-for-new-ui-component - packages/plugins/plugin-projects/src/containers/FeatureSection/FeatureSection.tsx:33
- c30726442ab-10 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:65
- c30726442ab-11 - ignored - business-logic-out-of-ui - packages/plugins/plugin-projects/src/containers/SpecDocumentArticle/feature-embed-extensions.tsx:50
- c30726442ab-12 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/SpecDocumentArticle/SpecDocumentArticle.stories.tsx:198
- c30726442ab-13 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- c30726442ab-14 - ignored - flat-layer-composition - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:32
- c30726442ab-15 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:44
- c30726442ab-16 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:1
- c30726442ab-17 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:42
- c30726442ab-18 - resolved - setter-must-not-own-transaction - packages/plugins/plugin-projects/src/types/Feature.ts:153
- c30726442ab-19 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/FeatureEmbed.ts:1
- c30726442ab-20 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/FeatureSpec.ts:1
- c30726442ab-21 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1

## Issues

# WARN c30726442ab-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:212`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 212-223 (`...findSourceKeys(ownText)`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-2 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:512`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 512-523 (`<ToggleGroup.Item`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-3 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:52`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.91. The likeliest place is lines 52-63 (`export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, s...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-4 reuse-shared-test-layer `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 117-128 (`const fakeFetch =`, location confidence 0.65). Judged with added `siblings, similar` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-5 retries-via-schedule-with-evidence `packages/plugins/plugin-github/src/file-sync/sync-files.ts:530`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 530-541 (`let commit: string | undefined;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-6 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`import { next as A } from '@automerge/automerge';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-7 inline-obj-parent `packages/plugins/plugin-projects/src/capabilities/migrations.ts:104`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 104-115 (`const getContainer = async (db: Database.Database, state: SpecsState, placeme...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/components/FeatureCard/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-10 (`export * from './feature.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-9 story-for-new-ui-component `packages/plugins/plugin-projects/src/containers/FeatureSection/FeatureSection.tsx:33`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 33-44 (`export const FeatureSection = ({ subject, attendableId }: FeatureSectionProps...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c30726442ab-10 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 65-68 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-11 business-logic-out-of-ui `packages/plugins/plugin-projects/src/containers/SpecDocumentArticle/feature-embed-extensions.tsx:50`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 50-61 (`<FeatureEmbedSection {...props} db={db} attendableId={attendableId} claimFocu...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-12 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/SpecDocumentArticle/SpecDocumentArticle.stories.tsx:198`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.84. The likeliest place is lines 198-203 (`await waitFor(() => expect(shown?.features).toHaveLength(9), { timeout: 5_000...`, location confidence 0.79). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-13 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 26-38 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-14 flat-layer-composition `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 32-43 (`const testLayer = () =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-15 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:44`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 44-61 (`Task.Task,`, location confidence 0.76). Judged with added `importers, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-16 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Instructions from '@dxos/compute/Instructions';`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-17 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:42`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.94. The likeliest place is lines 42-53 (`export const seed = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-18 setter-must-not-own-transaction `packages/plugins/plugin-projects/src/types/Feature.ts:153`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 153-164 (`export const setSources = (feature: Feature, sources: readonly string[]): voi...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-19 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/FeatureEmbed.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-12 (`import { EID } from '@dxos/echo';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-20 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/FeatureSpec.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-11 (`import * as Schema from 'effect/Schema';`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c30726442ab-21 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-16 (`import * as Schema from 'effect/Schema';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 1, 2, 3 (`SpecArticle.tsx`, `useSpecSources.ts`): the flagged lines predate this PR; it does not touch them.
- 4 (`sync-files.test.ts` `fakeFetch`): predates this PR; no shared fake of the GitHub REST API exists to reuse.
- 5 (`sync-files.ts` push loop): predates this PR; the loop retries only on `GitHubRefMovedError`, as F-4.3 and T-4 specify, re-reading the tip each time.
- 6, 8, 16, 19, 20, 21 (namespace style): each module carries the directive, a capitalised filename, a matching `export * as` and namespace imports; `FeatureCard/index.ts` is not a namespace module, and `TextMergeError` predates this PR.
- 7 (`migrations.ts`): line 110 predates this PR; the new `Obj.setParent` at line 255 parents a document made in `transform`, before the migrated spec exists.
- 9: resolved by `FeatureSection.stories.tsx`, whose play checks the block id, the name field and a dependency.
- 10 (`containers/index.ts` `ProjectArticle`): predates this PR.
- 11 (`feature-embed-extensions.tsx`): editor callbacks that add a feature for `/feature` and a pasted embed; no sync or API client code.
- 12 (`SpecDocumentArticle.stories.tsx`): the play asserts the ref array that sync writes, which is the stored order under test.
- 13 (`useFeatureGraph.ts`): predates this PR.
- 14, 15 (`feature.test.ts`): `testLayer` and the helpers predate this PR; the new `embedIds` composes a read and a parse.
- 17 (`FeatureSeed.seed`): a test seed, not an operation.
- 18: resolved; `Feature.setSources` takes a draft, and each caller batches it with its other writes in one `Obj.update`.

### System One pass

- model: jev-latest
- base for context: `8ad08cb2be9afbc854637512e3fa36d633216698`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 546 uncertain, 2420 clean, 0 unanswered
- left for an agentic reviewer: 113 batch(es)

```text
requests: 1240 (384 verdicts re-asked with context the model requested)
estimated input tokens: 8862671
billed input tokens: 8239157 (cost $0.3460)
measured chars per token: 3.23
```
