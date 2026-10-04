---
branch: claude/react-ui-next-design-4db6eb
commit: e4a21c86debf0b158c73d39e64e97f7782e6458b
base: 467f7f13211a4d665decb59ba2636a00f0b9d99a
mode: fast
createdAt: 2026-10-04T05:00:32.099Z
isFinalized: true
groups: 105
rules: [comment-hygiene, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: e4a21c86deb
---

_1 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e4a21c86deb-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- e4a21c86deb-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- e4a21c86deb-3 - ignored - comment-hygiene - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:599
- e4a21c86deb-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192
- e4a21c86deb-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- e4a21c86deb-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- e4a21c86deb-7 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- e4a21c86deb-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:227
- e4a21c86deb-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699
- e4a21c86deb-10 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996
- e4a21c86deb-11 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:482
- e4a21c86deb-12 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskRow.tsx:61
- e4a21c86deb-13 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:372

## Issues

# WARN e4a21c86deb-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 375-407 (`>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-3 comment-hygiene `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:599`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 599-622 (`>`, location confidence 0.52). Judged with added `diff, pr` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-4 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 192-203 (`'flex flex-col w-full dx-density-md',`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-5 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-6 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-7 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 137-152 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 227-274 (`const collection = useMemo(`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-9 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 699-722 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4a21c86deb-10 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1996-2022 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-11 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:482`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 482-505 (`/>`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-12 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskRow.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 61-72 (`{chips}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a21c86deb-13 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:372`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 372-384 (`const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `467f7f13211a4d665decb59ba2636a00f0b9d99a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 201 uncertain, 751 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 438 (103 verdicts re-asked with context the model requested)
estimated input tokens: 5030210
billed input tokens: 4917670 (cost $0.2065)
measured chars per token: 3.07
```
