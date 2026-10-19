---
branch: claude/react-ui-next-design-4db6eb
commit: 4e4760b50db6f10cbd645a059a6364a249d82f74
base: 61ac1eb860bc97c81fb32534fdac3a33cbf9a67c
mode: fast
createdAt: 2026-10-04T14:24:59.968Z
isFinalized: true
groups: 49
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 4e4760b50db
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4e4760b50db-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386
- 4e4760b50db-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:857
- 4e4760b50db-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:403
- 4e4760b50db-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:403
- 4e4760b50db-5 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:649

## Issues

# WARN 4e4760b50db-1 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 386-413 (`const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4e4760b50db-2 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:857`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 857-882 (`export const TestOpensAtNewest: Story = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4e4760b50db-3 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:403`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 403-426 (`observer.disconnect();`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4e4760b50db-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:403`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 403-426 (`observer.disconnect();`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4e4760b50db-5 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:649`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 649-672 (`};`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `61ac1eb860bc97c81fb32534fdac3a33cbf9a67c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 100 uncertain, 98 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 132 (46 verdicts re-asked with context the model requested)
estimated input tokens: 1516252
billed input tokens: 1576897 (cost $0.0662)
measured chars per token: 2.88
```
