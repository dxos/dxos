---
branch: claude/react-ui-next-design-4db6eb
commit: c0ce633b690b669976f15975fdb2fa512985430a
base: 321bff0e38382315423b01abd5834e26ef878fb6
mode: fast
createdAt: 2026-10-06T05:16:09.671Z
isFinalized: true
groups: 100
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: c0ce633b690
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c0ce633b690-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- c0ce633b690-2 - ignored - comment-hygiene - packages/ui/react-primitives/react-focus/src/keySymbols.ts:30
- c0ce633b690-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154
- c0ce633b690-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:303
- c0ce633b690-5 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:332
- c0ce633b690-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107
- c0ce633b690-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:333

## Issues

# WARN c0ce633b690-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0ce633b690-2 comment-hygiene `packages/ui/react-primitives/react-focus/src/keySymbols.ts:30`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 30-39 (`const meta: Record<string, string> = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0ce633b690-3 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 154-165 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0ce633b690-4 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:303`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 303-314 (`const meta: Meta<StoryArgs> = {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c0ce633b690-5 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:332`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 332-341 (`const type = (input: HTMLInputElement, value: string) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0ce633b690-6 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 107-118 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0ce633b690-7 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:333`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 333-344 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `321bff0e38382315423b01abd5834e26ef878fb6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 281 uncertain, 327 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 377 (158 verdicts re-asked with context the model requested)
estimated input tokens: 2922738
billed input tokens: 2817752 (cost $0.1183)
measured chars per token: 3.11
```
