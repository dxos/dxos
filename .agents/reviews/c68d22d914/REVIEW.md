---
branch: claude/react-ui-next-design-4db6eb
commit: c68d22d91494103c2d818857605ba2540d51ba7b
base: 6d486787bbdfbb1ce1acfd6d3dd9adde23e6cddb
mode: fast
createdAt: 2026-09-28T16:46:28.930Z
isFinalized: true
groups: 90
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: c68d22d914
---

_0 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c68d22d914-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components.stories.tsx:94
- c68d22d914-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27
- c68d22d914-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx:14
- c68d22d914-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21
- c68d22d914-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx:14
- c68d22d914-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx:18
- c68d22d914-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:17

## Issues

# WARN c68d22d914-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 94-101 (`const DefaultStory = () => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 27-38 (`const DefaultStory = ({ poster = POSTER }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-3 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Collapsible/Collapsible.stories.tsx:14`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 14-25 (`const DefaultStory = () => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/FieldSet/FieldSet.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 21-32 (`const DefaultStory = ({ disabled, invalid }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-5 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Menu/Menu.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 14-25 (`const DefaultStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-6 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Switch/Switch.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c68d22d914-7 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6d486787bbdfbb1ce1acfd6d3dd9adde23e6cddb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 73 uncertain, 769 clean, 0 unanswered

```text
requests: 344 (24 verdicts re-asked with context the model requested)
estimated input tokens: 1523431
billed input tokens: 1423790 (cost $0.0598)
measured chars per token: 3.21
```
