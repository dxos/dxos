---
branch: claude/upbeat-spence-c83916
commit: 08a8fc51f2e55c4abd9092d2598726bf48b52338
base: origin/claude/spec-review-comments
mode: fast
createdAt: 2026-11-05T17:54:52.622Z
isFinalized: true
groups: 239
rules: [card-content-in-middle-column, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, leaf-objects-render-as-cards, mutate-echo-arrays-with-splice, no-casts, no-module-level-object-caches, no-unused-new-api, retries-via-schedule-with-evidence]
reviewId: 08a8fc51f2e
---

_1 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 08a8fc51f2e-1 - resolved - inline-obj-parent - packages/core/compute/compute/src/types/SpecReview.ts:68
- 08a8fc51f2e-2 - ignored - card-content-in-middle-column - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:70
- 08a8fc51f2e-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:247
- 08a8fc51f2e-4 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:59
- 08a8fc51f2e-5 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:81
- 08a8fc51f2e-6 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:214
- 08a8fc51f2e-7 - ignored - no-casts - packages/plugins/plugin-code/src/containers/FeatureArticle/FeatureArticle.stories.tsx:92
- 08a8fc51f2e-8 - ignored - no-module-level-object-caches - packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:43
- 08a8fc51f2e-9 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/skills/index.ts:1
- 08a8fc51f2e-10 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/skills/spec-review/index.ts:1
- 08a8fc51f2e-11 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/skills/spec-review/index.ts:1
- 08a8fc51f2e-12 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/skills/spec-review/SpecReviewSkill.ts:21
- 08a8fc51f2e-13 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:340
- 08a8fc51f2e-14 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-github/src/file-sync/sync-files.ts:579

## Issues

# WARN 08a8fc51f2e-1 inline-obj-parent `packages/core/compute/compute/src/types/SpecReview.ts:68`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.93. The likeliest place is lines 68-79 (`export const make = ({ spec, ...props }: MakeProps): SpecReview => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-2 card-content-in-middle-column `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:70`

System One judges this a likely violation of `card-content-in-middle-column` (A card whose header uses the rails is a `grid` card, so its rows start in the middle column under the title), p=0.92. The likeliest place is lines 70-81 (`const DefinitionCard = ({ definition, dependents, status, change }: Definitio...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 247-258 (`? undefined`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-4 mutate-echo-arrays-with-splice `packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:59`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.90. The likeliest place is lines 59-70 (`const onAdd = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:81`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 81-92 (`const [filter, setFilter] = useState<VerdictStatus | typeof ALL>(ALL);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-6 leaf-objects-render-as-cards `packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:214`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.80. The likeliest place is lines 214-225 (`const VerdictTile = forwardRef<HTMLDivElement, VerdictTileProps>(({ data, loc...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 08a8fc51f2e-7 no-casts `packages/plugins/plugin-code/src/containers/FeatureArticle/FeatureArticle.stories.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 92-103 (`const PeerAppendStory = (args: StoryArgs) => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-8 no-module-level-object-caches `packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:43`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.83. The likeliest place is lines 43-54 (`export const registerEditor = (id: string, editor: EditorView): (() => void) ...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-9 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-9 (`export { default as CoderSkill } from './coder.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-10 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/skills/spec-review/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as SpecReviewSkill from './SpecReviewSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-11 no-unused-new-api `packages/plugins/plugin-code/src/skills/spec-review/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.83. The likeliest place is lines 1-6 (`export * as SpecReviewSkill from './SpecReviewSkill.ts';`, location confidence 1.00). Judged with added `diff, importers, public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-12 no-unused-new-api `packages/plugins/plugin-code/src/skills/spec-review/SpecReviewSkill.ts:21`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.85. The likeliest place is lines 21-34 (`export const make = (): Skill.Skill =>`, location confidence 0.98). Judged with added `diff, importers, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-13 flat-layer-composition `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:340`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 340-351 (`Layer.succeed(Credential.CredentialsService, {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 08a8fc51f2e-14 retries-via-schedule-with-evidence `packages/plugins/plugin-github/src/file-sync/sync-files.ts:579`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 579-590 (`const reread = yield* GitHubApi.fetchBranchHead(owner, name, writeBranch);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/claude/spec-review-comments`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 395 uncertain, 1576 clean, 0 unanswered
- left for an agentic reviewer: 102 batch(es)

```text
requests: 822 (234 verdicts re-asked with context the model requested)
estimated input tokens: 5774625
billed input tokens: 5386726 (cost $0.2262)
measured chars per token: 3.22
```

### Resolution notes

- 08a8fc51f2e-1: `SpecReview.make` sets the parent with `[Obj.Parent]` in `Obj.make`.
- 08a8fc51f2e-2, -3: `DefinitionGraph.tsx` changed one class name in this PR; the card layout and the derived state are older.
- 08a8fc51f2e-4: `onAdd` and `onRemove` in `RequirementEditor.tsx` predate this PR, and `Feature.setRequirements` owns how the record is written.
- 08a8fc51f2e-5: the status filter moved into `useStatusFilter`, which also drops the cast on the toggle value.
- 08a8fc51f2e-6: `VerdictTile` renders `VerdictCard`, which is a `Card.Root` with the standard header.
- 08a8fc51f2e-7: `FeatureArticle.stories.tsx` holds no cast; `PeerAppendStory` predates this PR.
- 08a8fc51f2e-8: this PR only adds a field to `SpecSessionState`; the editor registry is older.
- 08a8fc51f2e-9, -10: `export * as SpecReviewSkill` follows `RepositoriesSkill` and `FeatureMapSkill`, and the site imports it the same way.
- 08a8fc51f2e-11, -12: `capabilities/skill-definition.ts` contributes `SpecReviewSkill`.
- 08a8fc51f2e-13: the test's `Layer.mergeAll` predates this PR.
- 08a8fc51f2e-14: the F-4.3 push retry predates this PR.
