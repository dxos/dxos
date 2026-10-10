---
branch: claude/react-ui-next-design-4db6eb
commit: 47c3ff7f1c2fcb2247b71a0911fcc7b666c73742
base: f75b3fcdb74088e543826b7f45cb68d570eee73c
mode: fast
createdAt: 2026-10-04T12:56:20.571Z
isFinalized: true
groups: 54
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 47c3ff7f1c2
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 47c3ff7f1c2-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- 47c3ff7f1c2-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 47c3ff7f1c2-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386
- 47c3ff7f1c2-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:841
- 47c3ff7f1c2-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307
- 47c3ff7f1c2-6 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545

## Issues

# WARN 47c3ff7f1c2-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47c3ff7f1c2-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 122-133 (`const fiber = Effect.runFork(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47c3ff7f1c2-3 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 386-413 (`const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47c3ff7f1c2-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:841`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 841-864 (`export const ManyLanes: Story = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47c3ff7f1c2-5 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 307-330 (`return (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 47c3ff7f1c2-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f75b3fcdb74088e543826b7f45cb68d570eee73c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 114 uncertain, 97 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 140 (58 verdicts re-asked with context the model requested)
estimated input tokens: 1633943
billed input tokens: 1638060 (cost $0.0688)
measured chars per token: 2.99
```
