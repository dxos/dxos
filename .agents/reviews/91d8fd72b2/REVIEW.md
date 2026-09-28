---
branch: claude/ai-service-mock-storybook-90afd6
commit: 91d8fd72b2f298150d6a1aefb53b2c9c819d406f
base: bbce297f257473f2bb555481624672188ec7ddef
mode: fast
createdAt: 2026-09-28T06:05:37.624Z
isFinalized: true
groups: 63
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 91d8fd72b2
---

_0 error(s), 6 warning(s)._

# WARN 91d8fd72b2-1 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 307-330 (`return (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 91d8fd72b2-2 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 351-374 (`const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children,...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 91d8fd72b2-3 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 91d8fd72b2-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 51-62 (`return <div className='shrink-0 grid place-items-center w-(--block-size) h-(-...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 91d8fd72b2-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/experimental.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const DefaultStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 91d8fd72b2-6 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/experimental.stories.tsx:59`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 59-71 (`const meta = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.
