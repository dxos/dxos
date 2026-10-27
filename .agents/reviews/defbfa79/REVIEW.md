---
branch: HEAD
commit: defbfa7936a57f2217fba611a82cced63d38f4e4
base: 1016bdb67c362adbf11bb776049f963c07af3061
mode: fast
createdAt: 2026-10-06T05:03:33.702Z
isFinalized: true
groups: 104
rules: [comment-hygiene, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: defbfa79
---

_4 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- defbfa79-1 - ignored - comment-hygiene - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:73
- defbfa79-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:119
- defbfa79-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:425
- defbfa79-4 - ignored - error-messages-carry-context - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72
- defbfa79-5 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- defbfa79-6 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:30
- defbfa79-7 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:123
- defbfa79-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:156
- defbfa79-9 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:378

## Issues

# WARN defbfa79-1 comment-hygiene `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:73`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 73-79 (`import { objectCardWidget } from './ObjectCardWidget.tsx';`, location confidence 0.43). Judged with added `diff, pr` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN defbfa79-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:119`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 119-142 (`const [feedSnapshot] = useObject(chat?.feed);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN defbfa79-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:425`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 425-446 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN defbfa79-4 error-messages-carry-context `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 72-83 (`const typePrompt = async (canvasElement: HTMLElement, text: string) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR defbfa79-5 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR defbfa79-6 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`describe('Chat processor', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR defbfa79-7 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:123`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 123-149 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN defbfa79-8 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 156-167 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR defbfa79-9 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:378`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 378-389 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1016bdb67c362adbf11bb776049f963c07af3061`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 344 uncertain, 326 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 417 (232 verdicts re-asked with context the model requested)
estimated input tokens: 3986752
billed input tokens: 3833336 (cost $0.1610)
measured chars per token: 3.12
```
