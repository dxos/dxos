---
branch: dm/quirky-carson-ougdwa
commit: 9be77122a38ab67e9af40625b7c92e7005b71a8c
base: 70134819ecbd2cc876bfa16ee10601e40cf04d5e
mode: fast
createdAt: 2026-10-28T12:02:55.261Z
isFinalized: true
groups: 75
rules: [containers-share-core-hooks, design-tokens-not-raw-spacing-sizing, event-handler-naming-convention, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 9be77122
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9be77122-1 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:374
- 9be77122-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463
- 9be77122-3 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:612
- 9be77122-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:844
- 9be77122-5 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:453
- 9be77122-6 - ignored - containers-share-core-hooks - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:501
- 9be77122-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:690

## Issues

# WARN 9be77122-1 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:374`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 374-397 (`const handleReport = useCallback((text: string) => event.emit({ type: 'report...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9be77122-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 463-484 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9be77122-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:612`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 612-635 (`return () => unsubscribes.forEach((unsubscribe) => unsubscribe());`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9be77122-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:844`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 844-867 (`lazyMount={false}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9be77122-5 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:453`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 453-476 (`if (scroller && scroller.scrollHeight - scroller.clientHeight - scroller.scro...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9be77122-6 containers-share-core-hooks `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:501`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.83. The likeliest place is lines 501-524 (`viewport.tabIndex = 0;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9be77122-7 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:690`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 690-713 (`>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `70134819ecbd2cc876bfa16ee10601e40cf04d5e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 78 uncertain, 26 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 66 (30 verdicts re-asked with context the model requested)
estimated input tokens: 1262228
billed input tokens: 1277610 (cost $0.0537)
measured chars per token: 2.96
```
