---
branch: claude/ai-service-mock-storybook-90afd6
commit: bbce297f257473f2bb555481624672188ec7ddef
base: 5e7d4ed265492720e0e27f4b02833862032f3c4a
mode: fast
createdAt: 2026-09-28T05:37:15.071Z
isFinalized: true
groups: 65
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, no-casts, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: bbce297f25
---

_1 error(s), 6 warning(s)._

# WARN bbce297f25-1 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 695-718 (`return (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbce297f25-2 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1150`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 1150-1168 (`),`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbce297f25-3 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1967`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1967-1989 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbce297f25-4 story-for-new-ui-component `packages/ui/react-ui/src/next/components.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.82. The likeliest place is lines 14-25 (`export namespace Next {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbce297f25-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?:...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbce297f25-6 no-styling-wrapper-divs `packages/ui/react-ui/src/next/experimental.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const DefaultStory = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbce297f25-7 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/experimental.stories.tsx:59`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 59-71 (`const meta = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.
