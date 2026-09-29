---
branch: claude/react-ui-next-design-4db6eb
commit: d19ad6d99a01a674098c490adb96fb57bfaddd34
base: 79aca988d8fdf80ba37534478975ff5a874f8833
mode: fast
createdAt: 2026-09-28T21:02:39.127Z
isFinalized: true
groups: 161
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: d19ad6d99a
---

_0 error(s), 5 warning(s)._

# WARN d19ad6d99a-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 86-93 (`const DefaultStory = () => (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN d19ad6d99a-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 31-42 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN d19ad6d99a-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 29-40 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN d19ad6d99a-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN d19ad6d99a-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.
