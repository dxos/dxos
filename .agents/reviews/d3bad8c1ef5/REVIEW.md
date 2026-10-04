---
branch: claude/react-ui-next-design-4db6eb
commit: d3bad8c1ef538578901323216069bfd2f6633cf9
base: e4a21c86debf0b158c73d39e64e97f7782e6458b
mode: fast
createdAt: 2026-10-04T05:47:21.083Z
isFinalized: true
groups: 101
rules: [error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, obj-update-push]
reviewId: d3bad8c1ef5
---

_1 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d3bad8c1ef5-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- d3bad8c1ef5-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- d3bad8c1ef5-3 - resolved - obj-update-push - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:134
- d3bad8c1ef5-4 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:457
- d3bad8c1ef5-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- d3bad8c1ef5-6 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86
- d3bad8c1ef5-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:227
- d3bad8c1ef5-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699
- d3bad8c1ef5-9 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996
- d3bad8c1ef5-10 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:373
- d3bad8c1ef5-11 - resolved - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:26

## Issues

# WARN d3bad8c1ef5-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-3 obj-update-push `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:134`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.85. The likeliest place is lines 134-157 (`const linkTask = space.db.add(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-4 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:457`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 457-474 (`if (!chat) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-5 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-6 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 86-97 (`if (text.length === 0) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 227-274 (`const collection = useMemo(`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-8 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 699-722 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d3bad8c1ef5-9 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1996-2022 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-10 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:373`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 373-385 (`const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN d3bad8c1ef5-11 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 26-37 (`const DefaultStory = ({ defaultSize = 12, ...args }: StoryArgs) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e4a21c86debf0b158c73d39e64e97f7782e6458b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 374 uncertain, 267 clean, 0 unanswered
- left for an agentic reviewer: 62 batch(es)

```text
requests: 460 (219 verdicts re-asked with context the model requested)
estimated input tokens: 6076791
billed input tokens: 6066036 (cost $0.2548)
measured chars per token: 3.01
```
