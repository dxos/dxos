---
branch: claude/react-ui-next-design-4db6eb
commit: 7baeaad69e75e86674a2bee134d8182f5a94ab65
base: d4b03215e441be5965d30d2303252a5dfbb50687
mode: fast
createdAt: 2026-10-06T13:13:22.733Z
isFinalized: true
groups: 51
rules: [extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 7baeaad69e7
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7baeaad69e7-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:296
- 7baeaad69e7-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:571
- 7baeaad69e7-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96

## Issues

# WARN 7baeaad69e7-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:296`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 296-319 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7baeaad69e7-2 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:571`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 571-594 (`>`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7baeaad69e7-3 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d4b03215e441be5965d30d2303252a5dfbb50687`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 71 uncertain, 43 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 74 (34 verdicts re-asked with context the model requested)
estimated input tokens: 1163809
billed input tokens: 1186399 (cost $0.0498)
measured chars per token: 2.94
```
