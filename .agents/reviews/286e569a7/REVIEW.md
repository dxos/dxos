---
branch: HEAD
commit: 286e569a73701f7efb8864e51ced37a0fe65c1b1
base: 4b5096602229ec8180e3bbba3e9dc0f34f3146f6
mode: fast
createdAt: 2026-10-05T11:11:33.125Z
isFinalized: true
groups: 49
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 286e569a7
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 286e569a7-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:220
- 286e569a7-2 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334
- 286e569a7-3 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:231
- 286e569a7-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:374

## Issues

# WARN 286e569a7-1 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:220`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 220-243 (`const DefaultStory = ({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 286e569a7-2 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 334-359 (`export const Multiline: Story = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 286e569a7-3 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:231`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 231-278 (`const collection = useMemo(`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 286e569a7-4 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:374`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 374-386 (`const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4b5096602229ec8180e3bbba3e9dc0f34f3146f6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 107 uncertain, 76 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 127 (60 verdicts re-asked with context the model requested)
estimated input tokens: 1827317
billed input tokens: 1880219 (cost $0.0790)
measured chars per token: 2.92
```
