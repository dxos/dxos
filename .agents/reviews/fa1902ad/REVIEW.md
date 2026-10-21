---
branch: dm/friendly-maxwell-ln3vr9
commit: fa1902ad96da36e397fe1312ed7409ea29e302d0
base: b82150a3e8059d052fd994dffde6790e92263618
mode: fast
createdAt: 2026-10-12T10:42:57.224Z
isFinalized: true
groups: 334
rules: [consistent-private-field-convention, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, structured-logging-not-console, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: fa1902ad
---

_10 error(s), 32 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fa1902ad-1 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:108
- fa1902ad-2 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:682
- fa1902ad-3 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:170
- fa1902ad-4 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:89
- fa1902ad-5 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/queue-scripted.test.ts:31
- fa1902ad-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/testing/test-agent.ts:32
- fa1902ad-7 - ignored - use-context-scoped-cancellation - packages/core/compute/agent-runtime/src/testing/test-agent.ts:94
- fa1902ad-8 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- fa1902ad-9 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/assistant-toolkit/src/operations/run-instructions.test.ts:162
- fa1902ad-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:31
- fa1902ad-11 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:401
- fa1902ad-12 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:125
- fa1902ad-13 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:132
- fa1902ad-14 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/AiSession.ts:156
- fa1902ad-15 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:262
- fa1902ad-16 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/session/TrajectoryCache.ts:38
- fa1902ad-17 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/session/TrajectoryStore.bench.test.ts:48
- fa1902ad-18 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/session/TrajectoryStore.ts:88
- fa1902ad-19 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts:29
- fa1902ad-20 - ignored - flat-layer-composition - packages/core/compute/conductor/src/nodes/gpt/gpt.ts:150
- fa1902ad-21 - ignored - no-casts - packages/core/compute/conductor/src/nodes/gpt/gpt.ts:210
- fa1902ad-22 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed-object-core.ts:283
- fa1902ad-23 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:621
- fa1902ad-24 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:645
- fa1902ad-25 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:813
- fa1902ad-26 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:885
- fa1902ad-27 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.ts:1333
- fa1902ad-28 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- fa1902ad-29 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:673
- fa1902ad-30 - ignored - no-casts - packages/core/protocols/src/FeedProtocol.ts:445
- fa1902ad-31 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:141
- fa1902ad-32 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:66
- fa1902ad-33 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/relay.test.ts:99
- fa1902ad-34 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:264
- fa1902ad-35 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:131
- fa1902ad-36 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:751
- fa1902ad-37 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:145
- fa1902ad-38 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:47
- fa1902ad-39 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:85
- fa1902ad-40 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:32
- fa1902ad-41 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:285
- fa1902ad-42 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/agents/EdgeAgent.ts:220

## Issues

# WARN fa1902ad-1 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:108`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 108-119 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-2 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:682`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 682-705 (`yield* DelegationsCell.set(delegations);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-3 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:170`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 170-186 (`const assistantTestLayerOptions = {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-4 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:89`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 89-100 (`aiService: scriptedAiService([`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-5 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/queue-scripted.test.ts:31`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 31-41 (`const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;`, location confidence 0.33). Judged with added `imports, test` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/testing/test-agent.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 32-43 (`export const collectEphemeral = (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-7 use-context-scoped-cancellation `packages/core/compute/agent-runtime/src/testing/test-agent.ts:94`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 94-100 (`yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, inte...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-8 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-9 test-real-scenario-not-narrower-proxy `packages/core/compute/assistant-toolkit/src/operations/run-instructions.test.ts:162`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.84. The likeliest place is lines 162-173 (`function layerWithToolCall(input: unknown) {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-10 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 31-45 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-11 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:401`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 401-412 (`const messages = yield* stream.pipe(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-12 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 125-136 (`const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-13 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:132`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 132-143 (`public async getHistory(): Promise<Message.Message[]> {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-14 flat-layer-composition `packages/core/compute/assistant/src/session/AiSession.ts:156`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 156-167 (`Layer.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(this...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-15 no-casts `packages/core/compute/assistant/src/session/Harness.ts:262`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 262-274 (`),`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-16 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/session/TrajectoryCache.ts:38`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 38-49 (`export const load = <S>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-17 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/session/TrajectoryStore.bench.test.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 48-59 (`const timed = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<[A, nu...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-18 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/session/TrajectoryStore.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 88-100 (`export const history = (`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-19 no-mixed-promise-effect-lifecycle `packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts:29`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 29-40 (`const operationServiceLayer = Layer.succeed(Operation.Service, {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-20 flat-layer-composition `packages/core/compute/conductor/src/nodes/gpt/gpt.ts:150`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.88. The likeliest place is lines 150-161 (`AiService.languageModel(DXN.getName(Model.DEFAULT_EDGE)).pipe(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-21 no-casts `packages/core/compute/conductor/src/nodes/gpt/gpt.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 210-216 (`cot: resultEffect.pipe(Effect.map(Struct.get('cot'))),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-22 no-casts `packages/core/echo/echo-client/src/feed/feed-object-core.ts:283`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 283-294 (`applyLocalUpdate(source: Entity.Unknown): void {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-23 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:621`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 621-644 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-24 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:645`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 645-668 (`private _plan: QueryPlan.Plan;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-25 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:813`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 813-836 (`this._trace = trace;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-26 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:885`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 885-908 (`break;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-27 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:1333`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1333-1356 (`if (selectStepIndex !== -1) {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-28 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-29 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:673`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 673-694 (`return {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-30 no-casts `packages/core/protocols/src/FeedProtocol.ts:445`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 445-454 (`export const isWellKnownNamespace = (namespace: string) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-31 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:141`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 141-152 (`const openPrivateChat = (peer: Peer, agentId: string) =>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-32 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:66`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.88. The likeliest place is lines 66-69 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-33 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/relay.test.ts:99`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 99-105 (`const chatMessages = (chat: Chat.Chat) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-34 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:264`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 264-287 (`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fa1902ad-35 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:131`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 131-157 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-36 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:751`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 751-774 (`useEffect(() => {`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-37 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:145`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 145-156 (`AssistantPlugin({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-38 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:47`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 47-61 (`const setup = Effect.fn(function* () {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-39 no-sleep-in-test `packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:85`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 85-96 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-40 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:32`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 32-43 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-41 no-sleep-in-test `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:285`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 285-296 (`}`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN fa1902ad-42 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/agents/EdgeAgent.ts:220`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 220-231 (`const fold = (messages: Message.Message[]) =>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b82150a3e8059d052fd994dffde6790e92263618`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 42 violations written to fragments, 520 uncertain, 2967 clean, 0 unanswered
- left for an agentic reviewer: 90 batch(es)

```text
requests: 1541 (326 verdicts re-asked with context the model requested)
estimated input tokens: 15984278
billed input tokens: 15057839 (cost $0.6324)
measured chars per token: 3.18
```
