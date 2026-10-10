---
branch: dm/affectionate-bohr-rnl5b3
commit: bd21d1c8dd1b213cafc042f34512c58e2c953d04
base: 2d0a302f8dabbcacee0c572549afd4e1828ec8f1
mode: fast
createdAt: 2026-10-08T06:10:36.801Z
isFinalized: true
groups: 61
rules: [no-casts, no-styling-wrapper-divs, reactive-state-via-atom-bridge]
reviewId: bd21d1c8
---

_1 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd21d1c8-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:155
- bd21d1c8-2 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:333
- bd21d1c8-3 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:117
- bd21d1c8-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:108

## Issues

# WARN bd21d1c8-1 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:155`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 155-166 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd21d1c8-2 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:333`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 333-342 (`const type = (input: HTMLInputElement, value: string) => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd21d1c8-3 reactive-state-via-atom-bridge `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:117`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 117-128 (`const [streaming, setStreaming] = useState(!!model.streamingId);`, location confidence 1.00). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bd21d1c8-4 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 108-119 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2d0a302f8dabbcacee0c572549afd4e1828ec8f1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 120 uncertain, 128 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 148 (69 verdicts re-asked with context the model requested)
estimated input tokens: 1145302
billed input tokens: 1128982 (cost $0.0474)
measured chars per token: 3.04
```
