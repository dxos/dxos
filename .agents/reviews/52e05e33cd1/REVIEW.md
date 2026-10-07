---
branch: claude/resume-plugin-projects-7558db
commit: 52e05e33cd108e1efee8ab59eb5e6224082d65b8
base: 6ea9d4d4f60ff676d050a837ff89274c9faeaffe
mode: fast
createdAt: 2026-10-05T10:01:09.922Z
isFinalized: true
groups: 657
rules: [bounded-live-state, comment-hygiene, declare-optional-services-with-noop-layers, diff-scoped-to-pr-purpose, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-bare-ref-schema-alias, no-casts, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs, obj-update-push, private-new-packages, setter-must-not-own-transaction, story-for-new-ui-component, test-asserts-real-behavior]
reviewId: 52e05e33cd1
---

_10 error(s), 47 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 52e05e33cd1-1 - ignored - diff-scoped-to-pr-purpose - packages/apps/composer-app/src/plugin-defs.tsx:13
- 52e05e33cd1-2 - ignored - no-casts - packages/core/compute/ai/src/AiPreprocessor.ts:747
- 52e05e33cd1-3 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 52e05e33cd1-4 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:371
- 52e05e33cd1-5 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:114
- 52e05e33cd1-6 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:168
- 52e05e33cd1-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:313
- 52e05e33cd1-8 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-rdf/src/index.ts:1
- 52e05e33cd1-9 - resolved - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:124
- 52e05e33cd1-10 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:292
- 52e05e33cd1-11 - resolved - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:54
- 52e05e33cd1-12 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:608
- 52e05e33cd1-13 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:872
- 52e05e33cd1-14 - ignored - private-new-packages - packages/plugins/plugin-agent/package.json:1
- 52e05e33cd1-15 - ignored - comment-hygiene - packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:1
- 52e05e33cd1-16 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:27
- 52e05e33cd1-17 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:39
- 52e05e33cd1-18 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:40
- 52e05e33cd1-19 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:52
- 52e05e33cd1-20 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:47
- 52e05e33cd1-21 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/ProfileProperties/ProfileProperties.tsx:20
- 52e05e33cd1-22 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/ProfileProperties/ProfileProperties.tsx:32
- 52e05e33cd1-23 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-agent/src/operations/cancel-trigger.ts:14
- 52e05e33cd1-24 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/ensure-channel-chat.ts:26
- 52e05e33cd1-25 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/relay.test.ts:63
- 52e05e33cd1-26 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/relay.ts:17
- 52e05e33cd1-27 - resolved - obj-update-push - packages/plugins/plugin-agent/src/operations/resolve-entity.ts:39
- 52e05e33cd1-28 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/operations/testing.ts:29
- 52e05e33cd1-29 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:291
- 52e05e33cd1-30 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/update-relay.ts:26
- 52e05e33cd1-31 - resolved - bounded-live-state - packages/plugins/plugin-agent/src/operations/watch-facts.ts:66
- 52e05e33cd1-32 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/skills/index.ts:1
- 52e05e33cd1-33 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/types/AgentChannels.ts:56
- 52e05e33cd1-34 - resolved - setter-must-not-own-transaction - packages/plugins/plugin-agent/src/types/ChatParticipant.ts:33
- 52e05e33cd1-35 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- 52e05e33cd1-36 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405
- 52e05e33cd1-37 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:107
- 52e05e33cd1-38 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/operations/research.ts:30
- 52e05e33cd1-39 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:28
- 52e05e33cd1-40 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/connector.ts:58
- 52e05e33cd1-41 - resolved - story-for-new-ui-component - packages/plugins/plugin-discord/src/components/DiscordBotToolbar/DiscordBotToolbar.tsx:22
- 52e05e33cd1-42 - ignored - story-for-new-ui-component - packages/plugins/plugin-discord/src/containers/DiscordChannelProperties/DiscordChannelProperties.tsx:29
- 52e05e33cd1-43 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:157
- 52e05e33cd1-44 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/services/bot-gateway.ts:20
- 52e05e33cd1-45 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/services/bot-rest.ts:93
- 52e05e33cd1-46 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/services/discord.ts:48
- 52e05e33cd1-47 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/capabilities/channel-backend.ts:47
- 52e05e33cd1-48 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/mirror.ts:36
- 52e05e33cd1-49 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:168
- 52e05e33cd1-50 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/services/slack-api.ts:263
- 52e05e33cd1-51 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.ts:32
- 52e05e33cd1-52 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-thread/src/types/ChannelBackend.ts:36
- 52e05e33cd1-53 - resolved - no-bare-ref-schema-alias - packages/plugins/plugin-thread/src/types/ThreadOperation.ts:63
- 52e05e33cd1-54 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:474
- 52e05e33cd1-55 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/plugin.ts:474
- 52e05e33cd1-56 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:632
- 52e05e33cd1-57 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:370

## Issues

# WARN 52e05e33cd1-1 diff-scoped-to-pr-purpose `packages/apps/composer-app/src/plugin-defs.tsx:13`

System One judges this a likely violation of `diff-scoped-to-pr-purpose` (Keep a diff scoped to what the PR says it does; drop unrelated or accidental hunks), p=0.80. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-2 no-casts `packages/core/compute/ai/src/AiPreprocessor.ts:747`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 747-771 (`break;`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-3 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-4 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:371`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 371-382 (`AiParser.parseResponse({`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-5 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:114`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 114-125 (`export const formatUserPrompt = ({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-6 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:168`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 168-179 (`public async appendTurnMessage(message: Message.Message): Promise<void> {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-7 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:313`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 313-323 (`export const upsert = (key: string): Effect.Effect<Skill, NotFoundError, Regi...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-8 namespace-export-with-internal-hiding `packages/core/compute/pipeline-rdf/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-14 (`export * as RDF from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-9 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 124-147 (`);`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-10 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:292`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.86. The likeliest place is lines 292-315 (`test('serialize circular schema (TypeSchema)', () => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-11 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-63 (`expect(response.status).toBe(200);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-12 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:608`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 608-631 (`): Promise<any> {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-13 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:872`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 872-895 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-14 private-new-packages `packages/plugins/plugin-agent/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.95. The likeliest place is lines 1-12 (`{`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-15 comment-hygiene `packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 1-21 (`import React, { type PropsWithChildren, type ReactNode, createContext, useCon...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-16 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 27-38 (`export const AgentActivity = ({ role, agent }: AgentActivityProps) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-17 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 39-50 (`const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.ch...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-18 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:40`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 40-51 (`export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-19 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 52-63 (`const graphAtom = useMemo(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-20 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:47`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 47-58 (`export const AgentState = ({ role, agent, actions }: AgentStateProps) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-21 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/ProfileProperties/ProfileProperties.tsx:20`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 20-31 (`export const ProfileProperties = ({ subject }: ProfilePropertiesProps) => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-22 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/ProfileProperties/ProfileProperties.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 32-43 (`allMemories.forEach((memory) => get(Obj.atom(memory)));`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-23 inject-dependencies-via-constructor `packages/plugins/plugin-agent/src/operations/cancel-trigger.ts:14`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.83. The likeliest place is lines 14-25 (`const handler: Operation.WithHandler<typeof TriggerOperation.CancelTrigger> =...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-24 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/ensure-channel-chat.ts:26`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 26-37 (`export const loadAgentBindings = (agent: Agent.Agent) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-25 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/relay.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 63-74 (`const setupAgent = (options: { channels?: boolean } = {}) =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-26 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/relay.ts:17`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 17-27 (`export const ensureAgentTaskSet = (agent: Agent.Agent): Effect.Effect<TaskSet...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-27 obj-update-push `packages/plugins/plugin-agent/src/operations/resolve-entity.ts:39`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.95. The likeliest place is lines 39-50 (`? people.find((person) => sameName(person.fullName, trimmed) || sameName(pers...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-28 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/operations/testing.ts:29`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 29-40 (`export const makeTestChannelBackend = ({ refuse = [] }: { refuse?: readonly s...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-29 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:291`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 291-297 (`const say = (chat: Chat.Chat, name: string, prompt: string) =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-30 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/update-relay.ts:26`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 26-37 (`export const applyStatus = (relay: Relay.Relay, status: Relay.Status, outcome...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-31 bounded-live-state `packages/plugins/plugin-agent/src/operations/watch-facts.ts:66`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.86. The likeliest place is lines 66-77 (`...(ongoing ? { ongoing } : {}),`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-32 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-12 (`export * as ConversationSkill from './ConversationSkill.ts';`, location confidence 1.00). Judged with added `imports` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-33 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/types/AgentChannels.ts:56`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 56-62 (`export const loadChannels = (agent: Agent.Agent): Effect.Effect<Channel.Chann...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-34 setter-must-not-own-transaction `packages/plugins/plugin-agent/src/types/ChatParticipant.ts:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 33-38 (`export const set = (chat: Chat.Chat, person: Obj.Unknown): void => {`, location confidence 1.00). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-35 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-36 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 405-426 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-37 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:107`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 107-133 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-38 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/operations/research.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 30-41 (`export const findProfileRelation = (subject: Obj.Unknown) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-39 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 28-37 (`const appEdgeClient: EdgeClientResolver = Effect.gen(function* () {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-40 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/connector.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 58-69 (`const validateToken = (token: string) =>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-41 story-for-new-ui-component `packages/plugins/plugin-discord/src/components/DiscordBotToolbar/DiscordBotToolbar.tsx:22`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 22-33 (`export const DiscordBotToolbar = ({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-42 story-for-new-ui-component `packages/plugins/plugin-discord/src/containers/DiscordChannelProperties/DiscordChannelProperties.tsx:29`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 29-40 (`export const DiscordChannelProperties = ({ subject: channel, attendableId }: ...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-43 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:157`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 157-168 (`const accessToken = yield* Database.load(binding.spec.source).pipe(Effect.pro...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-44 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/services/bot-gateway.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 20-31 (`export const callBot = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-45 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/services/bot-rest.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 93-103 (`export const openDirectMessage = (token: string, userId: string): Effect.Effe...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-46 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/services/discord.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 48-62 (`const resolveConnectionToken = (connectionRef: Ref.Ref<Connection.Connection>...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-47 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/capabilities/channel-backend.ts:47`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 47-58 (`Effect.gen(function* () {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-48 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/mirror.ts:36`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 36-47 (`export const appendToMirror = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-49 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:168`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 168-179 (`const resolveUsers = (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-50 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/services/slack-api.ts:263`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 263-274 (`export const fetchAuthTest = (): SlackEffect<SlackAuthTest> =>`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-51 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-52 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-thread/src/types/ChannelBackend.ts:36`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 36-48 (`export const getProvider = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-53 no-bare-ref-schema-alias `packages/plugins/plugin-thread/src/types/ThreadOperation.ts:63`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.94. The likeliest place is lines 63-75 (`export const ConnectionStatus = Schema.Struct({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52e05e33cd1-54 no-casts `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-55 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-56 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:632`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 632-657 (`export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPlugin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52e05e33cd1-57 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:370`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 370-381 (`const project = space.db.add(Project.make({ name: agentOptions.project }));`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6ea9d4d4f60ff676d050a837ff89274c9faeaffe`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 57 violations written to fragments, 992 uncertain, 6666 clean, 0 unanswered
- left for an agentic reviewer: 121 batch(es)

```text
requests: 3143 (694 verdicts re-asked with context the model requested)
estimated input tokens: 21064009
billed input tokens: 19480585 (cost $0.8182)
measured chars per token: 3.24
```

### Resolution notes

- 52e05e33cd1-1 (ignored): out of scope: registers the PR's own new plugin in composer-app.
- 52e05e33cd1-2 (ignored): pre-existing code from main, not changed by this branch (branch edits lines 52-105 only).
- 52e05e33cd1-3 (ignored): pre-existing code from main, not changed by this branch (Data.TaggedError classes predate the branch).
- 52e05e33cd1-4 (ignored): pre-existing code from main, not changed by this branch (branch only threads `sender` through).
- 52e05e33cd1-5 (ignored): false positive: `sender` is a data parameter, not an optional-service callback.
- 52e05e33cd1-6 (ignored): pre-existing code from main, not changed by this branch (appendTurnMessage).
- 52e05e33cd1-7 (ignored): pre-existing code from main, not changed by this branch (Skill.upsert; branch only added makeRef).
- 52e05e33cd1-8 (ignored): pre-existing code from main, not changed by this branch (wildcard barrel; branch added one explicit named export).
- 52e05e33cd1-9 (resolved): flagged range is pre-existing; the branch's own added test used `!`, now narrowed with invariant.
- 52e05e33cd1-10 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-11 (resolved): flagged range is pre-existing; the branch's added fetch mock typed `input: any`, now RequestInfo | URL.
- 52e05e33cd1-12 (ignored): pre-existing code from main, not changed by this branch (Promise<any> in _call).
- 52e05e33cd1-13 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-14 (ignored): plugin-agent is deliberately public so it can be published.
- 52e05e33cd1-15 (ignored): false positive: `// Root`-style section separators are the composite-component convention.
- 52e05e33cd1-16 (ignored): container needs app capabilities; covered by components/AgentActivity story.
- 52e05e33cd1-17 (resolved): queries moved to useAgentChannelList/useAgentConversations hooks.
- 52e05e33cd1-18 (ignored): container needs app capabilities; covered by components/AgentKnowledge story.
- 52e05e33cd1-19 (resolved): derivation moved to useAgentKnowledge hook.
- 52e05e33cd1-20 (ignored): container needs app capabilities; covered by components/AgentState story.
- 52e05e33cd1-21 (ignored): container needs app capabilities; covered by components/ProfileGraph story.
- 52e05e33cd1-22 (resolved): derivation moved to useProfileKnowledge hook.
- 52e05e33cd1-23 (ignored): false positive: an operation handler reading the process registry, no per-method collaborator.
- 52e05e33cd1-24 (resolved): Effect.fnUntraced.
- 52e05e33cd1-25 (resolved): Effect.fnUntraced.
- 52e05e33cd1-26 (resolved): Effect.fnUntraced.
- 52e05e33cd1-27 (resolved): push inside Obj.update.
- 52e05e33cd1-28 (ignored): false positive: a namespaced backend kind id, not a brand or annotation key.
- 52e05e33cd1-29 (resolved): Effect.fnUntraced.
- 52e05e33cd1-30 (resolved): Effect.fnUntraced.
- 52e05e33cd1-31 (resolved): MAX_TRIGGERS cap; WatchFacts fails with AgentOperationError when full.
- 52e05e33cd1-32 (ignored): false positive: skills/index.ts is the internal #skills barrel, not the package barrel; the directive would force public export-map changes.
- 52e05e33cd1-33 (resolved): Effect.fnUntraced.
- 52e05e33cd1-34 (resolved): ChatParticipant.set and Mode.setCurrent take a draft; callers batch in one Obj.update.
- 52e05e33cd1-35 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-36 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-37 (ignored): pre-existing code from main, not changed by this branch (AiUsageQuotaError).
- 52e05e33cd1-38 (ignored): pre-existing code from main, not changed by this branch (branch only changed imports).
- 52e05e33cd1-39 (ignored): false positive: a module-level Effect value, not a function wrapping Effect.gen.
- 52e05e33cd1-40 (ignored): pre-existing code from main, not changed by this branch (validateToken).
- 52e05e33cd1-41 (resolved): added DiscordBotToolbar.stories.tsx.
- 52e05e33cd1-42 (ignored): container needs app capabilities; composes DiscordBotToolbar/Status/ChannelForm, each with a story.
- 52e05e33cd1-43 (ignored): pre-existing code from main, not changed by this branch (branch only swapped the token argument).
- 52e05e33cd1-44 (resolved): Effect.fnUntraced.
- 52e05e33cd1-45 (resolved): Effect.fnUntraced.
- 52e05e33cd1-46 (resolved): Effect.fnUntraced.
- 52e05e33cd1-47 (resolved): Effect.fnUntraced for provider members and helpers.
- 52e05e33cd1-48 (resolved): Effect.fnUntraced.
- 52e05e33cd1-49 (ignored): pre-existing code from main, not changed by this branch (resolveUsers).
- 52e05e33cd1-50 (ignored): pre-existing code from main, not changed by this branch (fetchAuthTest).
- 52e05e33cd1-51 (ignored): pre-existing code from main, not changed by this branch (the send arrow predates the branch; only its body changed).
- 52e05e33cd1-52 (resolved): Effect.fnUntraced.
- 52e05e33cd1-53 (resolved): Ref.Ref(Channel) inlined per field with its own description.
- 52e05e33cd1-54 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-55 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-56 (ignored): pre-existing code from main, not changed by this branch.
- 52e05e33cd1-57 (ignored): pre-existing code from main, not changed by this branch (and it reparents an existing agent).
