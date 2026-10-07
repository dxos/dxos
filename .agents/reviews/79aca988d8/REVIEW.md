---
branch: claude/react-ui-next-design-4db6eb
commit: 79aca988d8fdf80ba37534478975ff5a874f8833
base: 9ad97b115ed0c3dcb25aa48a95af0590de0033f9
mode: fast
createdAt: 2026-09-28T19:53:43.103Z
isFinalized: true
groups: 128
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: 79aca988d8
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 79aca988d8-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components.stories.tsx:86
- 79aca988d8-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27
- 79aca988d8-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:28
- 79aca988d8-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- 79aca988d8-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/Form.stories.tsx:22
- 79aca988d8-6 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/stories.tsx:26

## Issues

# WARN 79aca988d8-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.stories.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 86-93 (`const DefaultStory = () => (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79aca988d8-2 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 27-38 (`const DefaultStory = ({ size }: SizeArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79aca988d8-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 28-42 (`const DefaultStory = ({ size }: SizeArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79aca988d8-4 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79aca988d8-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/Form.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 22-33 (`const DefaultStory = () => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79aca988d8-6 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/stories.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 26-37 (`export const withSizes =`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9ad97b115ed0c3dcb25aa48a95af0590de0033f9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 112 uncertain, 1276 clean, 0 unanswered

```text
requests: 551 (48 verdicts re-asked with context the model requested)
estimated input tokens: 2984289
billed input tokens: 2776375 (cost $0.1166)
measured chars per token: 3.22
```
