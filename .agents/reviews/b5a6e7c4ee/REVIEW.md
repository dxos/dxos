---
branch: claude/react-ui-next-design-4db6eb
commit: b5a6e7c4ee4fdb87d81255e29e2bbabfa32c1a28
base: 41e06a14d67215b153c1ca007a1ed07b0e82906f
mode: fast
createdAt: 2026-09-29T04:02:33.053Z
isFinalized: true
groups: 163
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: b5a6e7c4ee
---

_0 error(s), 16 warning(s)._

# WARN b5a6e7c4ee-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 88-95 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-2 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 128-139 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 31-42 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-4 comment-hygiene `packages/ui/react-ui/src/next/components/Card/Card.tsx:337`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 337-346 (`type CardMenuProps = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-5 comment-hygiene `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:135`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 135-146 (`await userEvent.type(first, 'ali');`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-6 comment-hygiene `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:145`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.87. The likeliest place is lines 145-157 (`type ComboboxContentProps = ThemedClassName<ComboboxPrimitive.ContentProps> & {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-7 comment-hygiene `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx:207`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 207-218 (`for (const size of SIZES) {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-8 comment-hygiene `packages/ui/react-ui/src/next/components/DateInput/DateInput.tsx:49`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 49-60 (`'hourCycle'?: 12 | 24;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-9 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 106-112 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-10 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.tsx:56`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 56-63 (`type DialogContentProps = ThemedClassName<DialogPrimitive.ContentProps> & {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-11 comment-hygiene `packages/ui/react-ui/src/next/components/Menu/Menu.tsx:91`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 91-103 (`type MenuContentProps = ThemedClassName<MenuPrimitive.ContentProps> & {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-12 comment-hygiene `packages/ui/react-ui/src/next/components/Panel/Panel.tsx:21`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 21-30 (`type PanelRootProps = {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-13 comment-hygiene `packages/ui/react-ui/src/next/components/Select/Select.tsx:141`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 141-151 (`type SelectContentProps = ThemedClassName<SelectPrimitive.ContentProps> & {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-14 comment-hygiene `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:94`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 94-105 (`await expect(save).toHaveAccessibleDescription('Save changes (⌘S)');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-15 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 25-36 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5a6e7c4ee-16 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/stories.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 37-48 (`export const withSizes =`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.
