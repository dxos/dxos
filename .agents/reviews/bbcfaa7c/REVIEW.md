---
branch: dm/gifted-brahmagupta-c2ejou
commit: bbcfaa7c0441ca0e59c305bb1e8c87c8b7619fa0
base: 276d27017d1257c579f9c69df3975e5c67530791
mode: fast
createdAt: 2026-10-06T13:19:13.792Z
isFinalized: true
groups: 232
rules: [bounded-live-state, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, inline-obj-parent, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, reactive-state-via-atom-bridge, story-for-new-ui-component, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: bbcfaa7c
---

_4 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bbcfaa7c-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:183
- bbcfaa7c-2 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- bbcfaa7c-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:91
- bbcfaa7c-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- bbcfaa7c-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:251
- bbcfaa7c-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:182
- bbcfaa7c-7 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:133
- bbcfaa7c-8 - resolved - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:157
- bbcfaa7c-9 - resolved - no-sleep-in-test - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:157
- bbcfaa7c-10 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:75
- bbcfaa7c-11 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33
- bbcfaa7c-12 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:69
- bbcfaa7c-13 - ignored - no-casts - packages/plugins/plugin-agent/src/containers/index.ts:1
- bbcfaa7c-14 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useTriggers.ts:61
- bbcfaa7c-15 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useTriggers.ts:85
- bbcfaa7c-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/customize-skill.test.ts:62
- bbcfaa7c-17 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:234
- bbcfaa7c-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:565
- bbcfaa7c-19 - ignored - bounded-live-state - packages/plugins/plugin-agent/src/triggers.ts:23
- bbcfaa7c-20 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/types/AgentCompanion.ts:1
- bbcfaa7c-21 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:386

## Issues

# WARN bbcfaa7c-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:183`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 183-196 (`const lateAgentService = (holder: AgentServiceHolder): Context.Service.Shape<...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbcfaa7c-2 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbcfaa7c-3 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:91`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 91-112 (`const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-4 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:251`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 251-265 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:182`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 182-193 (`export const extractChunk = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:133`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 133-144 (`return objects;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-8 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:157`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 157-168 (`};`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-9 no-sleep-in-test `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:157`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 157-168 (`};`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-10 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:75`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 75-78 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-11 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 33-44 (`export const AgentPrivateChat = ({ role, agent, attendableId }: AgentPrivateC...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-12 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 69-80 (`const loaded = await db.makeRef<Chat.Chat>(data.chat.uri).tryLoad();`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbcfaa7c-13 no-casts `packages/plugins/plugin-agent/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 1-11 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-14 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useTriggers.ts:61`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 61-72 (`setRemoteWatches([]);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-15 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useTriggers.ts:85`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 85-96 (`recipient,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-16 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/customize-skill.test.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 62-68 (`const resolveInstructions = (chat: Chat.Chat, key: string) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-17 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:234`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 234-257 (`}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-18 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:565`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 565-581 (`}),`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbcfaa7c-19 bounded-live-state `packages/plugins/plugin-agent/src/triggers.ts:23`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 23-34 (`}`, location confidence 0.87). Judged with added `diff, importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-20 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/types/AgentCompanion.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.91. The likeliest place is lines 1-12 (`export const BRAIN = 'brain';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbcfaa7c-21 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:386`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 386-397 (`const project = space.db.add(Project.make({ name: agentOptions.project }));`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `276d27017d1257c579f9c69df3975e5c67530791`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 309 uncertain, 1941 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 911 (209 verdicts re-asked with context the model requested)
estimated input tokens: 6608964
billed input tokens: 6124826 (cost $0.2572)
measured chars per token: 3.24
```

### Dispositions

- 1: `lateAgentService` builds a service shape whose methods delegate to a late-bound holder; there is no hand-wrapped `Effect.gen` function to convert.
- 2–6, 16, 21: pre-existing code this PR only touches around (merge or unrelated lines), not introduced here.
- 7–9: `brain.edge.test.ts` now uses `Effect.fnUntraced` for `say` and `vi.waitFor` instead of a sleep loop.
- 10, 17: the local suites script the model on purpose so they are deterministic; the real scenario (real model, real EDGE brain) is `brain.edge.test.ts`.
- 11: `AgentPrivateChat` is exercised by the AgentPlayground stories and the Composer demo recorded on this PR.
- 12: open/retry logic moved to `containers/usePrivateChat.ts`.
- 13: `containers/index.ts` follows the package's existing lazy-export convention; it holds no cast.
- 14, 15: `useTriggers` polls a remote brain (no ECHO atom to bridge); cancellation is the effect cleanup.
- 18: false positive — the flagged test body already uses `Effect.fnUntraced`.
- 19: the trigger registry is bounded per agent in `BrainMemory.putTrigger`.
- 20: the companion strings are variant ids, not brand keys.
