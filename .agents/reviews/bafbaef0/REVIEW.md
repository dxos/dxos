---
branch: dm/task-sort-group
commit: bafbaef0cd88e3da8f7af121ad50cd15d5116347
base: 39a37c1da661f101f7b00f7c4570e815bb9f641a
mode: fast
createdAt: 2026-09-27T04:34:27.569Z
isFinalized: true
groups: 102
rules: [error-messages-carry-context, extract-non-rendering-logic-from-component, inline-obj-parent, no-styling-wrapper-divs]
reviewId: bafbaef0
---

_0 error(s), 7 warning(s)._

# WARN bafbaef0-1 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 136-151 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-2 error-messages-carry-context `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:581`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 581-604 (`throw new Error('Add sub-task item not found.');`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 78-89 (`const { values: statuses, rest } = useMemo(() => parseEnumTerms(filterText, S...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-4 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:342`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 342-356 (`<Toolbar.Root>{filterRow}</Toolbar.Root>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-5 inline-obj-parent `packages/plugins/plugin-tasks/src/util/task-order.test.ts:98`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 98-109 (`'priority-low',`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-6 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:480`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 480-495 (`const TaskListGroupLabel = composable<HTMLDivElement>(({ children, ...props }...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bafbaef0-7 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:461`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 461-475 (`className={mx(`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.
