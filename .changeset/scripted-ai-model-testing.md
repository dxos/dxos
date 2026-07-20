---
'@dxos/ai': patch
'@dxos/assistant': patch
'@dxos/agent-runtime': patch
---

Add a statically-scripted mock AI model for tests, replacing recorded ("memoized") conversations for tool-contract tests.

- **@dxos/ai**: new `ScriptedAiService` (`@dxos/ai/testing`) — an `AiService` whose turn-by-turn behaviour (assistant text and tool calls) is specified inline in TypeScript. Requests are matched sequentially within a `(model, stream)` bucket, so tool-description / input-schema / system-prompt changes no longer invalidate a test. Emits both raw `tool-params-*` and a resolved `tool-call` part so both DXOS's `AiParser` and `@effect/ai`'s built-in tool resolution execute the call.
- **@dxos/assistant**: export `makeToolName` and `toolNameForOperation` so tests can derive the model-facing tool name from an operation.
- **@dxos/agent-runtime**: new `operationToolCall(operation, input)` (`@dxos/agent-runtime/testing`) — a scripted tool call whose `input` is type-checked against the operation's input schema, so a schema change surfaces as a compile error rather than a stale fixture.
