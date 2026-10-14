---
branch: claude/react-ui-next-design-4db6eb
commit: 4b1c38c20b1ad0ef0526b128c63e0433729b8f0f
base: 4d5a2a522beb7650b746af1e5aa7fb71d166cee6
mode: fast
createdAt: 2026-09-30T11:24:01.319Z
isFinalized: true
groups: 169
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: 4b1c38c20b
---

_0 error(s), 5 warning(s)._

# WARN 4b1c38c20b-1 no-styling-wrapper-divs `packages/ui/react-ui-list/src/next/OrderedList/OrderedList.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 74-85 (`const ScrollableStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1c38c20b-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 88-95 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1c38c20b-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:85`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 85-96 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1c38c20b-4 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 106-112 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1c38c20b-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 25-36 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.
