---
branch: claude/react-ui-next-design-4db6eb
commit: 9ad97b115ed0c3dcb25aa48a95af0590de0033f9
base: 8c645fb49e11d62b7edc27860310b65c28d861c7
mode: fast
createdAt: 2026-09-28T18:37:56.796Z
isFinalized: true
groups: 133
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: 9ad97b115e
---

_0 error(s), 28 warning(s)._

# WARN 9ad97b115e-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 86-93 (`const DefaultStory = () => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Button/Button.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 37-48 (`const VariantsStory = () => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 28-39 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 28-39 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Checkbox/Checkbox.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 16-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-6 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx:14`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 14-25 (`const DefaultStory = () => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-7 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 30-41 (`const DefaultStory = ({ prefix }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-8 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 30-41 (`const DefaultStory = ({ prefix }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-9 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Container/Container.stories.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 50-57 (`const DefaultStory = ({ width = '36rem' }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-10 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 16-27 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-11 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:70`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 70-81 (`const DefaultStory = ({ sizes, paragraphs }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-12 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 21-32 (`const DefaultStory = ({ invalid }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-13 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 21-32 (`const DefaultStory = ({ disabled, invalid }: StoryArgs) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-14 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Group/Group.stories.tsx:19`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 19-31 (`const DefaultStory = ({ justify }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-15 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 45-56 (`const VariantsStory = () => (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-16 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 26-34 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-17 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Input/Input.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 20-34 (`const DefaultStory = ({ disabled }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-18 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 15-26 (`const DefaultStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-19 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 41-52 (`const DefaultStory = ({ mode, width, native }: StoryArgs) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-20 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 34-45 (`const DefaultStory = ({ icons }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-21 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-22 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Tag/Tag.stories.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 35-44 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-23 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Textarea/Textarea.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 20-31 (`const DefaultStory = ({ autoResize }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-24 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 16-27 (`const DefaultStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-25 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 16-27 (`const DefaultStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-26 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.stories.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 22-33 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-27 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-29 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9ad97b115e-28 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 22-33 (`const DefaultStory = () => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.
