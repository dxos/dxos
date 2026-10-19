---
branch: HEAD
commit: b74d072f9f1263038198a835209eca3e150e5536
base: ce355a78543a5ce52913e81d87b3548025a2138b
mode: fast
createdAt: 2026-10-03T08:25:23.523Z
isFinalized: true
groups: 62
rules: [extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: b74d072f
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b74d072f-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- b74d072f-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346
- b74d072f-3 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:119
- b74d072f-4 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:456
- b74d072f-5 - ignored - no-casts - packages/ui/react-ui-virtual/src/placement.test.ts:264

## Issues

# WARN b74d072f-1 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b74d072f-2 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b74d072f-3 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:119`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 119-130 (`useEffect(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b74d072f-4 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:456`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 456-479 (`[scrollToIndex, model, follow],`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b74d072f-5 no-casts `packages/ui/react-ui-virtual/src/placement.test.ts:264`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 264-275 (`offsets.push(placement.endOffset());`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ce355a78543a5ce52913e81d87b3548025a2138b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 169 uncertain, 124 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 202 (98 verdicts re-asked with context the model requested)
estimated input tokens: 2001110
billed input tokens: 1973619 (cost $0.0829)
measured chars per token: 3.04
```
