---
branch: claude/react-ui-next-design-4db6eb
commit: 61ac1eb860bc97c81fb32534fdac3a33cbf9a67c
base: 4829c5fd6a085f21b35184fa8235e7ec9d6f7e77
mode: fast
createdAt: 2026-10-04T13:42:44.026Z
isFinalized: true
groups: 71
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-styling-wrapper-divs, reactive-state-via-atom-bridge]
reviewId: 61ac1eb860b
---

_0 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 61ac1eb860b-1 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67
- 61ac1eb860b-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 61ac1eb860b-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386
- 61ac1eb860b-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:857
- 61ac1eb860b-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:377
- 61ac1eb860b-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:398
- 61ac1eb860b-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:593
- 61ac1eb860b-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:125

## Issues

# WARN 61ac1eb860b-1 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 67-78 (`export const useAncestorBreadcrumbs = (id: string | undefined): Breadcrumb[] ...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-3 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 386-413 (`const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:857`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 857-882 (`export const TestOpensAtNewest: Story = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:377`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 377-397 (`type GanttLegendProps = ThemedClassName<PropsWithChildren>;`, location confidence 0.48). Judged with added `imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-6 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 398-421 (`<div className='flex items-center' style={{ height: HEADER_HEIGHT }}>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:593`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 593-616 (`const followRef = useRef(true);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 61ac1eb860b-8 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 125-131 (`const DefaultStory = () => (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4829c5fd6a085f21b35184fa8235e7ec9d6f7e77`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 209 uncertain, 229 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 308 (145 verdicts re-asked with context the model requested)
estimated input tokens: 3750205
billed input tokens: 3741428 (cost $0.1571)
measured chars per token: 3.01
```
