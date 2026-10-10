---
branch: dm/beautiful-galileo-757nf4
commit: b4cf1cfcaf0ebe3ccf53df5acceafb8dd5b305cb
base: 2d0a302f8dabbcacee0c572549afd4e1828ec8f1
mode: fast
createdAt: 2026-10-08T07:29:50.007Z
isFinalized: true
groups: 197
rules: [bounded-live-state, design-tokens-not-raw-spacing-sizing, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: b4cf1cfc
---

_5 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b4cf1cfc-1 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- b4cf1cfc-2 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:384
- b4cf1cfc-3 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:396
- b4cf1cfc-4 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- b4cf1cfc-5 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153
- b4cf1cfc-6 - ignored - no-casts - packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30
- b4cf1cfc-7 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:125
- b4cf1cfc-8 - ignored - no-sleep-in-test - packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:419
- b4cf1cfc-9 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- b4cf1cfc-10 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47
- b4cf1cfc-11 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- b4cf1cfc-12 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:89
- b4cf1cfc-13 - ignored - error-messages-carry-context - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72
- b4cf1cfc-14 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- b4cf1cfc-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:96
- b4cf1cfc-16 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- b4cf1cfc-17 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28
- b4cf1cfc-18 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61

## Issues

# ERROR b4cf1cfc-1 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-2 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:384`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 384-391 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b4cf1cfc-3 bounded-live-state `packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:396`

> **ignored:** pendingInputs holds one entry per queued submitInput command and is cleared on delivery or when the process is forgotten, so it is bounded by the durable queue.

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 396-407 (`Effect.andThen(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-4 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-5 structured-logging-not-console `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153`

> **ignored:** console.table is the manual latency report this test exists to print; it never runs in CI.

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 153-161 (`})),`, location confidence 0.74). Judged with added `diff, siblings, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b4cf1cfc-6 no-casts `packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`describe('ChatModel', () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b4cf1cfc-7 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:125`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 125-151 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-8 no-sleep-in-test `packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:419`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 419-430 (`const quiesce = Effect.promise(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-9 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 120-143 (`const [feedSnapshot] = useObject(chat?.feed);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-10 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 47-50 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-11 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-88 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-12 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:89`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 89-100 (`const meta = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-13 error-messages-carry-context `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 72-83 (`const typePrompt = async (canvasElement: HTMLElement, text: string) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b4cf1cfc-14 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:96`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 96-107 (`useEffect(() => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-16 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 57-68 (`});`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-17 structured-logging-not-console `packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 28-39 (`console.log(trim``, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4cf1cfc-18 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

> **ignored:** pre-existing code this PR only renames (AiChatProcessor → ChatModel); out of scope.

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2d0a302f8dabbcacee0c572549afd4e1828ec8f1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 331 uncertain, 1535 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 803 (213 verdicts re-asked with context the model requested)
estimated input tokens: 7669198
billed input tokens: 7109851 (cost $0.2986)
measured chars per token: 3.24
```
