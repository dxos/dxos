---
branch: claude/react-ui-next-design-4db6eb
commit: dd1e06bf0fe386df750c5d140a67fc9311420ce7
base: c68d22d91494103c2d818857605ba2540d51ba7b
mode: fast
createdAt: 2026-09-28T17:16:05.424Z
isFinalized: true
groups: 88
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: dd1e06bf0f
---

_0 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- dd1e06bf0f-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components.stories.tsx:86
- dd1e06bf0f-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Button/Button.stories.tsx:20
- dd1e06bf0f-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27
- dd1e06bf0f-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Checkbox/Checkbox.stories.tsx:16
- dd1e06bf0f-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Container/Container.stories.tsx:50
- dd1e06bf0f-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21
- dd1e06bf0f-7 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21
- dd1e06bf0f-8 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21
- dd1e06bf0f-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Group/Group.stories.tsx:19
- dd1e06bf0f-10 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx:17
- dd1e06bf0f-11 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Input/Input.stories.tsx:20
- dd1e06bf0f-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:41
- dd1e06bf0f-13 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Select/Select.stories.tsx:23
- dd1e06bf0f-14 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Toolbar/Toolbar.stories.tsx:22
- dd1e06bf0f-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Typography/Typography.stories.tsx:22
- dd1e06bf0f-16 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/Form.stories.tsx:21

## Issues

# WARN dd1e06bf0f-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 86-93 (`const DefaultStory = () => (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Button/Button.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 20-34 (`const DefaultStory = ({ disabled }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-38 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Checkbox/Checkbox.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 16-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Container/Container.stories.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 50-57 (`const DefaultStory = ({ width = '36rem' }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-6 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 21-32 (`const DefaultStory = ({ invalid }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-7 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 21-32 (`const DefaultStory = ({ invalid }: StoryArgs) => (`, location confidence 0.99). Judged with added `siblings, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-8 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 21-32 (`const DefaultStory = ({ disabled, invalid }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-9 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Group/Group.stories.tsx:19`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 19-31 (`const DefaultStory = ({ justify }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-10 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/IconButton/IconButton.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-11 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Input/Input.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 20-34 (`const DefaultStory = ({ disabled }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-12 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 41-52 (`const DefaultStory = ({ mode, width, native }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-13 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Select/Select.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 23-34 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-14 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toolbar/Toolbar.stories.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 22-33 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-15 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Typography/Typography.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 22-33 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN dd1e06bf0f-16 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 21-32 (`const DefaultStory = () => (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c68d22d91494103c2d818857605ba2540d51ba7b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 188 uncertain, 460 clean, 6 unanswered

```text
requests: 343 (75 verdicts re-asked with context the model requested)
estimated input tokens: 1618114
failed requests: 1 (their pairs are listed as unanswered)
billed input tokens: 1517047 (cost $0.0637)
measured chars per token: 3.19
```
