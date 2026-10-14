---
branch: claude/react-ui-next-design-4db6eb
commit: 41e06a14d67215b153c1ca007a1ed07b0e82906f
base: 4d6aaac7218a6f81fa11a6fcb4de278d3f24afee
mode: fast
createdAt: 2026-09-29T00:03:24.316Z
isFinalized: true
groups: 159
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: 41e06a14d6
---

_0 error(s), 4 warning(s)._

# WARN 41e06a14d6-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-95 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 41e06a14d6-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 31-42 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 41e06a14d6-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 29-40 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 41e06a14d6-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 25-36 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.
