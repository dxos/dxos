---
branch: claude/react-ui-next-design-4db6eb
commit: a281c8161f19bb2915aa43e0c4ca151bfe0e06ef
base: 7526412f4992d98b51c79ac844bf1d15478d7e95
mode: fast
createdAt: 2026-10-06T03:17:47.549Z
isFinalized: true
groups: 60
rules: [design-tokens-not-raw-spacing-sizing, no-casts, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: a281c8161f1
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a281c8161f1-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59
- a281c8161f1-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:131
- a281c8161f1-3 - resolved - no-casts - packages/ui/react-ui-assistant/src/registry.tsx:84
- a281c8161f1-4 - resolved - story-for-new-ui-component - packages/ui/react-ui-assistant/src/widgets/SyntheticWidget.tsx:20
- a281c8161f1-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:331
- a281c8161f1-6 - resolved - story-for-new-ui-component - packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:29
- a281c8161f1-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:67

## Issues

# WARN a281c8161f1-1 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 59-70 (`const DefaultStory = () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN a281c8161f1-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:131`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 131-142 (`classNames={[PLANK_CLASSNAMES, 'w-[40rem]']}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a281c8161f1-3 no-casts `packages/ui/react-ui-assistant/src/registry.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 84-95 (`select: {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN a281c8161f1-4 story-for-new-ui-component `packages/ui/react-ui-assistant/src/widgets/SyntheticWidget.tsx:20`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 20-31 (`export const SyntheticWidget = ({ view, children }: SyntheticWidgetProps) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN a281c8161f1-5 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:331`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 331-342 (`const ToolSection = ({ label, data }: { label: string; data: unknown }) => (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN a281c8161f1-6 story-for-new-ui-component `packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:29`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 29-40 (`export const WidgetPanel = ({`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN a281c8161f1-7 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 67-73 (`export const WidgetPanelRow = ({ icon, label, testId }: Pick<WidgetPanelProps...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7526412f4992d98b51c79ac844bf1d15478d7e95`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 171 uncertain, 309 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 288 (117 verdicts re-asked with context the model requested)
estimated input tokens: 1549535
billed input tokens: 1495219 (cost $0.0628)
measured chars per token: 3.11
```
