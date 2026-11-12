---
branch: HEAD
commit: cf30d8c052a9f206745d6218280fbd0de4ab8112
base: 392bed09f7876d35abf641e89ab2cd92464c9e15
mode: fast
createdAt: 2026-11-12T12:11:49.235Z
isFinalized: true
groups: 76
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, flat-layer-composition, per-test-mutable-fixtures]
reviewId: cf30d8c0
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cf30d8c0-1 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/bind-chat-context.ts:18
- cf30d8c0-2 - resolved - flat-layer-composition - packages/plugins/plugin-assistant/src/operations/create-chat.test.ts:27
- cf30d8c0-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34
- cf30d8c0-4 - resolved - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.test.ts:25

## Issues

# WARN cf30d8c0-1 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/bind-chat-context.ts:18`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 18-29 (`const handler: Operation.WithHandler<typeof AssistantOperation.BindChatContex...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf30d8c0-2 flat-layer-composition `packages/plugins/plugin-assistant/src/operations/create-chat.test.ts:27`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 27-34 (`const makeTestLayer = (manager: CapabilityManager.CapabilityManager) =>`, location confidence 0.53). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN cf30d8c0-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf30d8c0-4 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.89. The likeliest place is lines 25-33 (`import { AssistantOperationHandlerSet } from '#operations';`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `392bed09f7876d35abf641e89ab2cd92464c9e15`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 198 uncertain, 189 clean, 0 unanswered
- left for an agentic reviewer: 59 batch(es)

```text
requests: 212 (145 verdicts re-asked with context the model requested)
estimated input tokens: 1281524
billed input tokens: 1162823 (cost $0.0488)
measured chars per token: 3.31
```
