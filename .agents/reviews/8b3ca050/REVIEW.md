---
branch: HEAD
commit: 8b3ca050550f4c5fd49877856faa4bb7905acca9
base: 45e1c93327f2f95d392615847aebc8c444c617e4
mode: fast
createdAt: 2026-10-29T11:22:46.140Z
isFinalized: true
groups: 209
rules: [card-content-in-middle-column, consistent-file-naming-within-folder, extract-non-rendering-logic-from-component, leaf-objects-render-as-cards, no-styling-wrapper-divs, no-unused-new-api, reactive-state-via-atom-bridge, toolbars-are-menu-actions]
reviewId: 8b3ca050
---

_0 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8b3ca050-1 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:100
- 8b3ca050-2 - ignored - card-content-in-middle-column - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82
- 8b3ca050-3 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:111
- 8b3ca050-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:82
- 8b3ca050-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/SpecEditor/SpecEditor.stories.tsx:67
- 8b3ca050-6 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-code/src/components/SpecEditor/SpecEditor.stories.tsx:83
- 8b3ca050-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:224
- 8b3ca050-8 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:452
- 8b3ca050-9 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:36
- 8b3ca050-10 - ignored - no-unused-new-api - packages/reflect/deus/src/review/review.ts:152

## Issues

# WARN 8b3ca050-1 toolbars-are-menu-actions `packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 100-111 (`)}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-2 card-content-in-middle-column `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82`

System One judges this a likely violation of `card-content-in-middle-column` (A card whose header uses the rails is a `grid` card, so its rows start in the middle column under the title), p=0.91. The likeliest place is lines 82-93 (`>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-3 leaf-objects-render-as-cards `packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:111`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.80. The likeliest place is lines 111-122 (`>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 82-93 (`const review = useMemo(() => (reviewText ? parseReview(reviewText) : undefine...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-5 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/SpecEditor/SpecEditor.stories.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 67-78 (`);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-6 consistent-file-naming-within-folder `packages/plugins/plugin-code/src/components/SpecEditor/SpecEditor.stories.tsx:83`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 83-93 (`const meta = {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:224`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 224-235 (`...findSourceKeys(ownText)`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-8 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:452`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 452-463 (`value={view}`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-9 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:36`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.92. The likeliest place is lines 36-47 (`export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, s...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8b3ca050-10 no-unused-new-api `packages/reflect/deus/src/review/review.ts:152`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.81. The likeliest place is lines 152-163 (`export const citedFiles = (review: ReviewModel): string[] =>`, location confidence 0.41). Judged with added `diff, importers, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

Triage of the index (all `ignored`):

- 8b3ca050-1 to -9: the flagged code predates this PR. Here these plugin-code files only changed their imports, since the review, source-key and snippet helpers moved to `@dxos/deus/review`; restyling those components is out of scope.
- 8b3ca050-10: false positive. `citedFiles` moved unchanged from plugin-code and `SpecArticle.tsx` still calls it.

### System One pass

- model: jev-latest
- base for context: `45e1c93327f2f95d392615847aebc8c444c617e4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 270 uncertain, 1443 clean, 0 unanswered
- left for an agentic reviewer: 95 batch(es)

```text
requests: 718 (141 verdicts re-asked with context the model requested)
estimated input tokens: 4018577
billed input tokens: 3767852 (cost $0.1582)
measured chars per token: 3.20
```
