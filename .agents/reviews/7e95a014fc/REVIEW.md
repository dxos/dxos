---
branch: claude/ai-service-mock-storybook-90afd6
commit: 7e95a014fc1ddd747c29ed6112ee3a7335ed3bbb
base: a73270543e4d7b941962ab914a888a94754567c5
mode: fast
createdAt: 2026-09-27T16:03:25.282Z
isFinalized: true
groups: 188
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 7e95a014fc
---

_0 error(s), 13 warning(s)._

# WARN 7e95a014fc-1 comment-hygiene `packages/plugins/plugin-assistant/src/plugin.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 47-58 (`Plugin.addModule(AssistantState),`, location confidence 0.98). Judged with added `diff, pr` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-2 error-messages-carry-context `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.stories.tsx:291`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 291-302 (`await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-3 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:533`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 533-544 (`throw new Error('Chat not found.');`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-6 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 263-273 (`const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-7 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:245`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 245-256 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-8 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 330-341 (`}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-9 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 386-413 (`const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-10 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:841`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 841-864 (`export const ManyLanes: Story = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-11 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 307-330 (`return (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-12 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 351-374 (`const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children,...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7e95a014fc-13 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.
