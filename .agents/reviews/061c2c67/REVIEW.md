---
branch: HEAD
commit: 061c2c67dc3dae71c9565674f7d25cb9e626c155
base: e36e44b0088c707d9a27fb4ccd4bfb757347e1c5
mode: fast
createdAt: 2026-10-03T16:37:14.839Z
isFinalized: true
groups: 64
rules: [extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 061c2c67
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 061c2c67-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122
- 061c2c67-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:397
- 061c2c67-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116
- 061c2c67-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:103

## Issues

# WARN 061c2c67-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 122-145 (`const feedMessages = useQuery(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 061c2c67-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 397-418 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 061c2c67-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 116-127 (`interval={500}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 061c2c67-4 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:103`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 103-114 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

All four findings sit in code this PR does not change: `ChatContent`'s wrapper, the `ChatStatus` view, the toolbars' existing `role='toolbar'` rows (only wrapped in `memo` here), and the root's query/projection block. Left for the components' own refactors rather than widening a performance fix.

### System One pass

- model: jev-latest
- base for context: `e36e44b0088c707d9a27fb4ccd4bfb757347e1c5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 139 uncertain, 119 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 173 (88 verdicts re-asked with context the model requested)
estimated input tokens: 1471030
billed input tokens: 1424010 (cost $0.0598)
measured chars per token: 3.10
```
