---
branch: claude/react-ui-next-design-4db6eb
commit: 4d5a2a522beb7650b746af1e5aa7fb71d166cee6
base: b5a6e7c4ee4fdb87d81255e29e2bbabfa32c1a28
mode: fast
createdAt: 2026-09-29T05:23:08.347Z
isFinalized: true
groups: 168
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, namespace-brand-key-prefixing, no-casts, no-styling-wrapper-divs]
reviewId: 4d5a2a522b
---

_1 error(s), 12 warning(s)._

# ERROR 4d5a2a522b-1 no-casts `packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:33`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 33-44 (`const DefaultStory = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-2 namespace-brand-key-prefixing `packages/ui/react-ui-list/src/hooks/useReorder.ts:13`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 13-34 (`import {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-3 no-styling-wrapper-divs `packages/ui/react-ui-list/src/next/OrderedList/OrderedList.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 74-85 (`const ScrollableStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 88-95 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-5 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 128-139 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-6 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 31-42 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-7 comment-hygiene `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:135`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 135-146 (`await userEvent.type(first, 'ali');`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-8 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 29-40 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-9 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:111`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 111-117 (`};`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-10 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-11 comment-hygiene `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:94`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 94-105 (`await expect(save).toHaveAccessibleDescription('Save changes (⌘S)');`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-12 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 25-36 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4d5a2a522b-13 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.
