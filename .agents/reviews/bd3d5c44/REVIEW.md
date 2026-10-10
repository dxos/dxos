---
branch: dm/vigilant-bohr-i60rah
commit: bd3d5c44b002915f279fc48748095a6fad11bf1a
base: 9d979541835a4b6256d588d4a3e18e579959377f
mode: fast
createdAt: 2026-10-07T06:32:19.817Z
isFinalized: true
groups: 113
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, no-casts, no-hand-rolled-lists, no-styling-wrapper-divs, setter-must-not-own-transaction, story-for-new-ui-component, toolbars-are-menu-actions]
reviewId: bd3d5c44
---

_2 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd3d5c44-1 - ignored - no-casts - packages/plugins/plugin-github/src/containers/index.ts:1
- bd3d5c44-2 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:70
- bd3d5c44-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:159
- bd3d5c44-4 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:194
- bd3d5c44-5 - resolved - no-hand-rolled-lists - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:206
- bd3d5c44-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/services/github-api.ts:257
- bd3d5c44-7 - ignored - no-casts - packages/plugins/plugin-github/src/services/github-api.ts:577
- bd3d5c44-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89
- bd3d5c44-9 - resolved - story-for-new-ui-component - packages/ui/react-ui-menu/src/components/ViewOptionsMenu.tsx:43
- bd3d5c44-10 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-query/src/hooks/usePersistentQuery.ts:50

## Issues

# ERROR bd3d5c44-1 no-casts `packages/plugins/plugin-github/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 1-12 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The flagged line is the existing `lazy()` surface table; every entry types its component `ComponentType<any>`, and the new `PullRequestsArticle` entry follows it. No cast is added.

# WARN bd3d5c44-2 story-for-new-ui-component `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:70`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 70-74 (`export const PullRequestsArticle = ({ db, ...props }: PullRequestsArticleProp...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The article has a story at `src/stories/PullRequestsArticle.stories.tsx`, where this package keeps its container stories (same as `PullRequestArticle`).

# WARN bd3d5c44-3 toolbars-are-menu-actions `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:159`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 159-170 (`<Button.Root`, location confidence 0.80). Judged with added `imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The toolbar mirrors `TaskSetArticle`: a `QueryEditor` plus the sort/group menus, which take their choices as props. The only button is the filter clear, and there are no graph actions to compose.

# WARN bd3d5c44-4 no-styling-wrapper-divs `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 194-205 (`const GroupSection = ({ group, onOpen }: { group: PullRequestRowGroup; onOpen...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Rows and group headers now use `Layout.Flex`; the hand-rolled flex divs are gone.

# WARN bd3d5c44-5 no-hand-rolled-lists `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:206`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 206-214 (`{group.rows.map((row) => (`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Rows render as `Listbox.Item`s (with `Listbox.ItemGroup` for groups) from `@dxos/react-ui-list`.

# WARN bd3d5c44-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/services/github-api.ts:257`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 257-283 (`const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, s...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing code; this PR only adds two fields to `GitHubPullSchema` in this file.

# ERROR bd3d5c44-7 no-casts `packages/plugins/plugin-github/src/services/github-api.ts:577`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 577-604 (`export const updateIssue = (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing code; this PR only adds two fields to `GitHubPullSchema` in this file.

# WARN bd3d5c44-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 89-100 (`if (text.length === 0) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing logic; this PR only swaps the query hook for the shared `usePersistentQuery`.

# WARN bd3d5c44-9 story-for-new-ui-component `packages/ui/react-ui-menu/src/components/ViewOptionsMenu.tsx:43`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 43-54 (`export const SortMenu = <T extends string>({`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Added `ViewOptionsMenu.stories.tsx` with a play test that picks a sort field and a grouping.

# WARN bd3d5c44-10 setter-must-not-own-transaction `packages/ui/react-ui-query/src/hooks/usePersistentQuery.ts:50`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.81. The likeliest place is lines 50-58 (`const query = typeof next === 'function' ? next(view.query) : next;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `usePersistentQuery` writes a `ViewState` value, not an ECHO object, and it is the public setter; there is no transaction to batch.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d979541835a4b6256d588d4a3e18e579959377f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 108 uncertain, 635 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 313 (79 verdicts re-asked with context the model requested)
estimated input tokens: 1986878
billed input tokens: 1884089 (cost $0.0791)
measured chars per token: 3.16
```
