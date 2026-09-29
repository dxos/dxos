---
branch: claude/ai-service-mock-storybook-90afd6
commit: 00fae046b10afae374f1727f27f9015488a8ba68
base: ddd888c0e46f15a18d56155c28cacb5b520a8a2d
mode: fast
createdAt: 2026-09-28T11:20:41.995Z
isFinalized: true
groups: 59
rules: [extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 00fae046b1
---

_2 error(s), 7 warning(s)._

# WARN 00fae046b1-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 78-89 (`const { values: statuses, rest } = useMemo(() => parseEnumTerms(filterText, S...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-2 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 330-341 (`<Switch.Match when={AppSurface.Section.role}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 00fae046b1-3 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 269-292 (`source: source.data as TreeData,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-4 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 293-316 (`<Tree`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 00fae046b1-5 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:355`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 355-372 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:903`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 903-926 (`useEffect(() => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-7 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1059`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 1059-1082 (`'col-[tree-row] grid grid-cols-subgrid gap-0.5 [&[hidden]]:hidden empty:hidden',`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-8 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:481`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 481-501 (`TaskListContent.displayName = 'TaskList.Content';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 00fae046b1-9 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:433`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 433-444 (`and it spans the artifacts column (a PR chip is only row 1) but stops short o...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.
