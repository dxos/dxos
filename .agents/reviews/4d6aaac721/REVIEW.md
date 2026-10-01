---
branch: claude/react-ui-next-design-4db6eb
commit: 4d6aaac7218a6f81fa11a6fcb4de278d3f24afee
base: d19ad6d99a01a674098c490adb96fb57bfaddd34
mode: fast
createdAt: 2026-09-28T23:27:44.078Z
isFinalized: true
groups: 126
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: 4d6aaac721
---

_0 error(s), 7 warning(s)._

# WARN 4d6aaac721-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-95 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 31-42 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 29-40 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-4 story-for-new-ui-component `packages/ui/react-ui/src/next/components/ScrollArea/PopupScroll.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 26-32 (`export const PopupScroll = ({ size, classNames, children, outside }: PopupScr...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-6 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:23`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 23-34 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d6aaac721-7 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/stories.tsx:36`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 36-47 (`export const withSizes =`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.
