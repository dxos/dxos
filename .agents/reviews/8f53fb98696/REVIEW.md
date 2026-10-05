---
branch: claude/react-ui-next-design-4db6eb
commit: 8f53fb9869652d9a216a7c3e35219ce41d51359f
base: cf0c10e62151a8703820b02c2283171d02f031d6
mode: fast
createdAt: 2026-10-03T18:03:14.783Z
isFinalized: true
groups: 60
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 8f53fb98696
---

_1 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8f53fb98696-1 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73
- 8f53fb98696-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:129
- 8f53fb98696-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:129
- 8f53fb98696-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- 8f53fb98696-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:65
- 8f53fb98696-6 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86
- 8f53fb98696-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:135
- 8f53fb98696-8 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:243

## Issues

# ERROR 8f53fb98696-1 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 73-84 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 129-140 (`export const _ObjectsPanel: Story = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:129`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 129-140 (`export const _ObjectsPanel: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-54 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-5 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 65-76 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-6 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`if (text.length === 0) {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:135`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 135-146 (`useEffect(() => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8f53fb98696-8 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:243`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 243-254 (`value={filter}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cf0c10e62151a8703820b02c2283171d02f031d6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 193 uncertain, 135 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 231 (115 verdicts re-asked with context the model requested)
estimated input tokens: 2265547
billed input tokens: 2250098 (cost $0.0945)
measured chars per token: 3.02
```
