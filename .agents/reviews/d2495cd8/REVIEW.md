---
branch: HEAD
commit: d2495cd8b4cb72e8e6fb54763ad129b42b98bcfb
base: 0cb6c97ea0e37d36f064dc915525367a5d25b793
mode: fast
createdAt: 2026-11-13T10:52:58.575Z
isFinalized: true
groups: 89
rules: [error-messages-carry-context, jsdoc-non-obvious-identifiers, no-casts, no-try-catch-in-effect-code, obj-update-push]
reviewId: d2495cd8
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d2495cd8-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:271
- d2495cd8-2 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:413
- d2495cd8-3 - ignored - error-messages-carry-context - packages/core/compute/assistant/src/request/AiRequest.ts:509
- d2495cd8-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/request/AiRequest.ts:601
- d2495cd8-5 - ignored - obj-update-push - packages/plugins/plugin-agent/src/types/AgentChannels.ts:61
- d2495cd8-6 - ignored - jsdoc-non-obvious-identifiers - packages/sdk/types/src/types/ContentBlock.ts:479

## Issues

# WARN d2495cd8-1 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:271`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 271-281 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. `evalCode` (lines 271-281) predates this PR; the diff changes only the recorder above it.

# ERROR d2495cd8-2 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:413`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 413-424 (`withoutToolCallParsing,`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. The `as any` at line 421 predates this PR; the diff adds one spread in `enrichToolCallBlock` only.

# WARN d2495cd8-3 error-messages-carry-context `packages/core/compute/assistant/src/request/AiRequest.ts:509`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 509-520 (`if (toolCalls.length === 0) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. Pre-existing error at lines 509-520, outside this diff.

# WARN d2495cd8-4 no-try-catch-in-effect-code `packages/core/compute/assistant/src/request/AiRequest.ts:601`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 601-612 (`let operationOpt: Option.Option<Operation.Definition.Any>;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. The try/catch around `getOperationFromTool` predates this PR and guards a throwing API; the diff adds one field after it.

# WARN d2495cd8-5 obj-update-push `packages/plugins/plugin-agent/src/types/AgentChannels.ts:61`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.97. The likeliest place is lines 61-72 (`export const addChannel = Effect.fnUntraced(function* (agent: Agent.Agent, ch...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. `addChannel` predates this PR; the diff changes only `channelSendField`.

# WARN d2495cd8-6 jsdoc-non-obvious-identifiers `packages/sdk/types/src/types/ContentBlock.ts:479`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 479-490 (`export type Anchor = Schema.Schema.Type<typeof Anchor>;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

Ignored: out of scope. `Anchor` predates this PR; the fields this diff adds carry JSDoc.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0cb6c97ea0e37d36f064dc915525367a5d25b793`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 217 uncertain, 157 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 224 (126 verdicts re-asked with context the model requested)
estimated input tokens: 1950171
billed input tokens: 1859605 (cost $0.0781)
measured chars per token: 3.15
```
