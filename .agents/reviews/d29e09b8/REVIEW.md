---
branch: dm/shared-agents-a9thbd
commit: d29e09b819d545027b9dd003be660a8f7d11aa04
base: 7c088396a3ffec1e5e663d98fc9c63d804723dd0
mode: fast
createdAt: 2026-10-07T12:07:55.778Z
isFinalized: true
groups: 151
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, reuse-shared-test-layer, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: d29e09b8
---

_1 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d29e09b8-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/skills/agent/operations/relay.ts:68
- d29e09b8-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:85
- d29e09b8-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170
- d29e09b8-4 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/brain/brain.test.ts:118
- d29e09b8-5 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:142
- d29e09b8-6 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:22
- d29e09b8-7 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useTriggers.ts:87
- d29e09b8-8 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:308
- d29e09b8-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:589
- d29e09b8-10 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47
- d29e09b8-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:96
- d29e09b8-12 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:124

## Issues

# WARN d29e09b8-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/skills/agent/operations/relay.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 68-79 (`const qualifyEvent = (chat: Chat.Chat, event: unknown) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:85`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 85-96 (`export const loadInstructions = (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 170-181 (`{ timeout, interval: 2_000 },`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-4 flat-layer-composition `packages/plugins/plugin-agent/src/brain/brain.test.ts:118`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 118-129 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-5 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:142`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 142-147 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-6 reuse-shared-test-layer `packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:22`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 22-26 (`const agents: AgentService.Service = {`, location confidence 0.98). Judged with added `siblings, similar` context after a first pass of 0.53. This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-7 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useTriggers.ts:87`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 87-98 (`id: trigger,`, location confidence 0.40). Judged with added `diff, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-8 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:308`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 308-319 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-9 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:589`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 589-612 (`const recordedQuotes = (chat: Chat.Chat) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-10 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-50 (`const styles = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN d29e09b8-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:96`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 96-107 (`useEffect(() => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d29e09b8-12 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:124`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 124-150 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7c088396a3ffec1e5e663d98fc9c63d804723dd0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 191 uncertain, 1028 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 515 (139 verdicts re-asked with context the model requested)
estimated input tokens: 4045358
billed input tokens: 3769201 (cost $0.1583)
measured chars per token: 3.22
```

### Triage

Triage of every issue (all `ignored`; no code change):

- 1, 2, 3, 7, 9, 10, 11, 12 — the flagged lines predate this PR; the PR's hunks in those files sit elsewhere (relay.ts:57, Agent.ts:131+, brain.edge.test.ts:183+, useTriggers.ts:44–61, triggers.test.ts:582/612, ChatOptions.tsx:215+, ChatArticle.tsx:51–60, processor.ts:631). Out of scope.
- 4 — false positive: `TestLayer` is a module-level value with a single `provideMerge`; the PR only merges the test space layer into it.
- 5, 8 — the scripted language model is deliberate (deterministic turn scripts) and the `aiService` lines predate this PR.
- 6 — the `agents` stub predates this PR; `BrainMemory` tests only need a service that never wakes.
