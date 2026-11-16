---
branch: claude/gifted-mccarthy-44c604
commit: 1c1370d7627b9e14a5fb2ac267d55c9784e40fb1
base: 8e2f718362b28070ffc055eaf79bb894bb2fa29b
mode: fast
createdAt: 2026-11-05T20:38:45.388Z
isFinalized: true
groups: 218
rules: [bounded-live-state, extract-non-rendering-logic-from-component, log-fire-and-forget-rejections, mutate-echo-arrays-with-splice, no-casts, no-module-level-object-caches, no-styling-wrapper-divs, stable-component-for-optional-content, use-context-scoped-cancellation]
reviewId: 1c1370d7627
---

_3 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1c1370d7627-1 - ignored - log-fire-and-forget-rejections - packages/e2e/composer-e2e/src/playwright/app-manager.ts:907
- 1c1370d7627-2 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:59
- 1c1370d7627-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:189
- 1c1370d7627-4 - ignored - bounded-live-state - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:333
- 1c1370d7627-5 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:357
- 1c1370d7627-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:453
- 1c1370d7627-7 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:67
- 1c1370d7627-8 - ignored - stable-component-for-optional-content - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:162
- 1c1370d7627-9 - ignored - stable-component-for-optional-content - packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:61
- 1c1370d7627-10 - ignored - extract-non-rendering-logic-from-component - packages/ui/ui-editor/src/extensions/collab/automerge/automerge.test.tsx:33
- 1c1370d7627-11 - resolved - no-casts - packages/ui/ui-editor/src/extensions/collab/automerge/update-automerge.ts:42
- 1c1370d7627-12 - resolved - no-casts - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.test.ts:54
- 1c1370d7627-13 - ignored - no-module-level-object-caches - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:248
- 1c1370d7627-14 - ignored - use-context-scoped-cancellation - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:269

## Issues

# WARN 1c1370d7627-1 log-fire-and-forget-rejections `packages/e2e/composer-e2e/src/playwright/app-manager.ts:907`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.84. The likeliest place is lines 907-930 (`await closeCompanion`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-2 mutate-echo-arrays-with-splice `packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:59`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.89. The likeliest place is lines 59-70 (`const onAdd = () =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:189`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 189-212 (`[updateView],`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c1370d7627-4 bounded-live-state `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:333`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 333-356 (`return;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-5 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:357`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.92. The likeliest place is lines 357-380 (`updateProject((project) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-6 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:453`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 453-476 (`</Form.FieldSet>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-7 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 67-80 (`<div className='dx-expand grid grid-cols-3 gap-3 p-trim-md'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-8 stable-component-for-optional-content `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:162`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.84. The likeliest place is lines 162-173 (`<TaskForm task={task} />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-9 stable-component-for-optional-content `packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:61`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.87. The likeliest place is lines 61-72 (`reference={reference}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-10 extract-non-rendering-logic-from-component `packages/ui/ui-editor/src/extensions/collab/automerge/automerge.test.tsx:33`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 33-44 (`const Test = ({ accessor }: { accessor: Doc.Accessor<TestType> }) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c1370d7627-11 no-casts `packages/ui/ui-editor/src/extensions/collab/automerge/update-automerge.ts:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 42-53 (`tr.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c1370d7627-12 no-casts `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 54-68 (`doc: 'ab\ncd',`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-13 no-module-level-object-caches `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:248`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.91. The likeliest place is lines 248-268 (`if (hovered && !hoveredRendered) {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c1370d7627-14 use-context-scoped-cancellation `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:269`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 269-280 (`const scheduleHide = (view: EditorView) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

Issues 11 and 12 are on lines this PR wrote and are fixed: `updateAutomerge` reads the parent with `getDeep` instead of a `reduce<any>`, and the awareness test drops its non-null assertions. The other twelve point at lines no commit on this branch wrote (checked with `git blame` against the branch's non-merge commits): the files changed, but the flagged code is main's, so they are ignored here rather than fixed in a PR about carets.

### System One pass

- model: jev-latest
- base for context: `8e2f718362b28070ffc055eaf79bb894bb2fa29b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 350 uncertain, 1185 clean, 0 unanswered
- left for an agentic reviewer: 100 batch(es)

```text
requests: 646 (157 verdicts re-asked with context the model requested)
estimated input tokens: 4799440
billed input tokens: 4565301 (cost $0.1917)
measured chars per token: 3.15
```
