---
branch: claude/react-ui-next-design-4db6eb
commit: 321bff0e38382315423b01abd5834e26ef878fb6
base: a281c8161f19bb2915aa43e0c4ca151bfe0e06ef
mode: fast
createdAt: 2026-10-06T03:49:44.324Z
isFinalized: true
groups: 60
rules: [no-styling-wrapper-divs]
reviewId: 321bff0e383
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 321bff0e383-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107
- 321bff0e383-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:344
- 321bff0e383-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:69

## Issues

# WARN 321bff0e383-1 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 107-118 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 321bff0e383-2 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:344`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 344-355 (`const ToolSection = ({ label, data }: { label: string; data: unknown }) => (`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 321bff0e383-3 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 69-75 (`export const WidgetPanelRow = ({ icon, label, testId }: Pick<WidgetPanelProps...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a281c8161f19bb2915aa43e0c4ca151bfe0e06ef`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 147 uncertain, 233 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 226 (89 verdicts re-asked with context the model requested)
estimated input tokens: 1455211
billed input tokens: 1422927 (cost $0.0598)
measured chars per token: 3.07
```
