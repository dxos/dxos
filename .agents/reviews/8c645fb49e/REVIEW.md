---
branch: claude/react-ui-next-design-4db6eb
commit: 8c645fb49e11d62b7edc27860310b65c28d861c7
base: dd1e06bf0fe386df750c5d140a67fc9311420ce7
mode: fast
createdAt: 2026-09-28T17:56:06.358Z
isFinalized: true
groups: 124
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, moon-yml-entrypoint-registration, no-styling-wrapper-divs]
reviewId: 8c645fb49e
---

_0 error(s), 19 warning(s)._

# WARN 8c645fb49e-1 moon-yml-entrypoint-registration `packages/ui/react-ui/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`".": {`, location confidence 0.59). Judged with added `diff, package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 28-39 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-3 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 28-39 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 30-41 (`const DefaultStory = ({ prefix }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Combobox/Combobox.stories.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 30-41 (`const DefaultStory = ({ prefix }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-6 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 51-62 (`},`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-7 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/DateInput/DateInput.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 16-27 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-8 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:70`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 70-81 (`const DefaultStory = ({ sizes, paragraphs }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-9 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 21-32 (`const DefaultStory = ({ invalid }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-10 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 21-32 (`const DefaultStory = ({ invalid }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-11 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 21-32 (`const DefaultStory = ({ disabled, invalid }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-12 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 25-36 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-13 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 34-45 (`const DefaultStory = ({ icons }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-14 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-15 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Tag/Tag.stories.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 35-44 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-16 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Textarea/Textarea.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 20-31 (`const DefaultStory = ({ autoResize }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-17 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 16-27 (`const DefaultStory = () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-18 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ToggleIconButton/ToggleIconButton.stories.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 16-27 (`const DefaultStory = () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c645fb49e-19 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.
