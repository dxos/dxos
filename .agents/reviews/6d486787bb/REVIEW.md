---
branch: claude/react-ui-next-design-4db6eb
commit: 6d486787bbdfbb1ce1acfd6d3dd9adde23e6cddb
base: a2021ca16b21d0cb8885c57ed88294d542589346
mode: fast
createdAt: 2026-09-28T16:28:50.309Z
isFinalized: true
groups: 135
rules: [design-tokens-not-raw-spacing-sizing, no-invented-theme-tokens, no-styling-wrapper-divs, story-for-new-ui-component, structured-logging-not-console]
reviewId: 6d486787bb
---

_0 error(s), 22 warning(s)._

# WARN 6d486787bb-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 92-99 (`const DefaultStory = () => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-2 structured-logging-not-console `packages/ui/react-ui/src/next/components.stories.tsx:269`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 269-283 (`export const Benchmark: Story = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-3 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Block/Block.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 16-26 (`export const Block = composable<HTMLDivElement, BlockProps>(({ children, rail...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-4 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Button/Button.tsx:17`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 17-28 (`export const Button = composable<HTMLButtonElement, ButtonProps>(`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-5 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Checkbox/Checkbox.tsx:21`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 21-32 (`export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-6 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Container/Container.tsx:41`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 41-52 (`export const Container = slottable<HTMLDivElement, ContainerProps>(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-7 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 69-80 (`const DefaultStory = ({ sizes, paragraphs }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-8 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Field/Field.tsx:89`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 89-98 (`export const Field = {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-9 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Group/Group.tsx:19`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 19-30 (`export const Group = slottable<HTMLDivElement, GroupProps>(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-10 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Icon/Icon.tsx:19`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 19-30 (`export const Icon = forwardRef<SVGSVGElement, IconProps>(({ icon, label, clas...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-11 story-for-new-ui-component `packages/ui/react-ui/src/next/components/IconButton/IconButton.tsx:18`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 18-29 (`export const IconButton = composable<HTMLButtonElement, IconButtonProps>(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-12 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Input/Input.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 15-26 (`export const Input = composable<HTMLInputElement, InputProps>(({ type = 'text...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-13 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Label/Label.tsx:12`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 12-22 (`export const Label = composable<HTMLLabelElement, LabelProps>(({ children, .....`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-14 story-for-new-ui-component `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.tsx:102`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 102-106 (`export const ScrollArea = {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-15 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Select/Select.tsx:150`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 150-159 (`export const Select = {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-16 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 30-41 (`export const Toolbar = slottable<HTMLDivElement, ToolbarProps>(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-17 story-for-new-ui-component `packages/ui/react-ui/src/next/components/Typography/Typography.tsx:17`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 17-28 (`export const Typography = slottable<HTMLParagraphElement, TypographyProps>(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-18 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 21-32 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-19 no-styling-wrapper-divs `packages/ui/react-ui/src/next/spike/Choices.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 26-37 (`const ControlSizingStory = () => (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-20 no-invented-theme-tokens `packages/ui/react-ui/src/next/spike/Choices.stories.tsx:38`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 38-51 (`<button type='button' className='nx-demo-control bg-input-bg' data-square='' ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-21 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/spike/Spike.stories.tsx:111`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 111-122 (`const DefaultStory = ({ size, width, native, debug }: StoryArgs) => (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6d486787bb-22 no-styling-wrapper-divs `packages/ui/react-ui/src/next/spike/Spike.stories.tsx:208`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 208-219 (`const LevelsStory = ({ size }: StoryArgs) => (`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.
