---
branch: claude/laughing-davinci-6vgl10
commit: f16636c977919e465aba8cd334f2d28fea254c46
base: 2b6a93a303ae1f37390625a80c45abcf36687e60
mode: fast
createdAt: 2026-10-14T21:59:03.377Z
isFinalized: true
groups: 259
rules: [bounded-live-state, business-logic-out-of-ui, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, keep-parallel-apis-structurally-aligned, log-fire-and-forget-rejections, no-casts, no-env-vars-in-low-level-modules, no-retries-or-skips-for-flaky-tests, no-try-catch-in-effect-code, reactive-state-via-atom-bridge, schema-declare-and-brand, stable-component-for-optional-content, story-for-new-ui-component]
reviewId: f16636c977
---

_6 error(s), 18 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f16636c977-1 - ignored - keep-parallel-apis-structurally-aligned - packages/core/halo/credentials/src/credentials/credential-generator.ts:187
- f16636c977-2 - ignored - bounded-live-state - packages/core/halo/credentials/src/state-machine/space-state-machine.ts:274
- f16636c977-3 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/capabilities/create-agent.ts:23
- f16636c977-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/capabilities/invitee-source.ts:51
- f16636c977-5 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33
- f16636c977-6 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/AgentsPanel/AgentsPanel.tsx:27
- f16636c977-7 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/AgentsPanel/AgentsPanel.tsx:63
- f16636c977-8 - ignored - no-casts - packages/plugins/plugin-agent/src/containers/index.ts:1
- f16636c977-9 - ignored - log-fire-and-forget-rejections - packages/plugins/plugin-agent/src/containers/usePrivateChat.ts:41
- f16636c977-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/app-graph-builder.ts:157
- f16636c977-11 - resolved - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:68
- f16636c977-12 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:68
- f16636c977-13 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:92
- f16636c977-14 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:140
- f16636c977-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:278
- f16636c977-16 - ignored - no-casts - packages/sdk/app-toolkit/src/echo/AppSpace.test.ts:99
- f16636c977-17 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:451
- f16636c977-18 - ignored - no-retries-or-skips-for-flaky-tests - packages/sdk/client-e2e/src/spaces.test.ts:811
- f16636c977-19 - ignored - schema-declare-and-brand - packages/sdk/client-protocol/src/space.ts:181
- f16636c977-20 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:391
- f16636c977-21 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:511
- f16636c977-22 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- f16636c977-23 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:90
- f16636c977-24 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:635

## Issues

# WARN f16636c977-1 keep-parallel-apis-structurally-aligned `packages/core/halo/credentials/src/credentials/credential-generator.ts:187`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.83. The likeliest place is lines 187-198 (`export const createDeviceAuthorization = async (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-2 bounded-live-state `packages/core/halo/credentials/src/state-machine/space-state-machine.ts:274`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 274-285 (`break;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/capabilities/create-agent.ts:23`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 23-37 (`export const createAgentWithIdentity = (db: Database.Database, input: { name:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/capabilities/invitee-source.ts:51`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 51-62 (`const administeredAgents: Effect.Effect<AgentSpace.Summary[], never, Capabili...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-5 stable-component-for-optional-content `packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.87. The likeliest place is lines 33-44 (`export const AgentPrivateChat = ({ role, agent, attendableId }: AgentPrivateC...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-6 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/AgentsPanel/AgentsPanel.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 27-38 (`export const AgentsPanel = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-7 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/AgentsPanel/AgentsPanel.tsx:63`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 63-74 (`const useAdministeredAgents = (): AgentListEntry[] => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-8 no-casts `packages/plugins/plugin-agent/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 1-14 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-9 log-fire-and-forget-rejections `packages/plugins/plugin-agent/src/containers/usePrivateChat.ts:41`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 41-52 (`return;`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/app-graph-builder.ts:157`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 157-168 (`Effect.gen(function* () {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-11 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 68-79 (`(listed) => !cancelled && setInvitees(listed.flat()),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-12 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:68`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 68-79 (`(listed) => !cancelled && setInvitees(listed.flat()),`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-13 no-try-catch-in-effect-code `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:92`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 92-103 (`const handleAdd = async () => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-14 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 140-151 (`/>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:278`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 278-289 (`useEffect(() => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-16 no-casts `packages/sdk/app-toolkit/src/echo/AppSpace.test.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 99-107 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-17 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:451`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 451-474 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-18 no-retries-or-skips-for-flaky-tests `packages/sdk/client-e2e/src/spaces.test.ts:811`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.94. The likeliest place is lines 811-834 (`test('import space archive (JSON)', { timeout: 5_000, retry: 1 }, async () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-19 schema-declare-and-brand `packages/sdk/client-protocol/src/space.ts:181`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.94. The likeliest place is lines 181-185 (`export const SpaceSchema: Schema.Codec<Space> = Schema.Any.pipe(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-20 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:391`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 391-414 (`await Promise.all(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-21 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:511`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 511-534 (`private async _anchorSpaceOnRootDocument(ctx: Context, space: DataSpace, forc...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-22 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.91. The likeliest place is lines 188-199 (`['SpacesService.querySpaces'](): EffectStream.Stream<QuerySpacesResponse, Err...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f16636c977-23 no-casts `packages/sdk/client/src/echo/space-proxy.ts:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 90-106 (`export const getSpace = (object?: any): Space | undefined => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16636c977-24 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:635`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 635-658 (`},`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2b6a93a303ae1f37390625a80c45abcf36687e60`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 24 violations written to fragments, 425 uncertain, 1870 clean, 0 unanswered
- left for an agentic reviewer: 105 batch(es)

```text
requests: 1012 (287 verdicts re-asked with context the model requested)
estimated input tokens: 7735840
billed input tokens: 7367372 (cost $0.3094)
measured chars per token: 3.15
```

### Notes

- `f16636c977-1` ignored: `createDeviceAuthorization` (lines 187-198 of `credential-generator.ts`) is unchanged from `main`.
- `f16636c977-2` ignored: lines 274-285 of `space-state-machine.ts` are unchanged from `main`; this PR's lines there add the locked-space agent rule, which keeps no collection.
- `f16636c977-3` resolved: `createAgentWithIdentity` is now an `Effect.fnUntraced`.
- `f16636c977-4` ignored: `administeredAgents` is an Effect value, not a function the rule asks to wrap.
- `f16636c977-5` ignored: `AgentPrivateChat` already renders one component for its empty case; this PR only resolves the session agent before it.
- `f16636c977-6` ignored: `AgentsPanel` is a container over `AgentList`, which ships with `AgentList.stories.tsx`.
- `f16636c977-7` ignored: no atom bridge covers the members of every agent space at once; the hook subscribes to `client.spaces`, the identity and each agent space's members, and unsubscribes on unmount.
- `f16636c977-8` ignored: `ComponentType<any>` is how every lazy container in `containers/index.ts` is declared; the PR adds one line in that shape.
- `f16636c977-9` ignored: lines 41-52 of `usePrivateChat.ts` are unchanged from `main`.
- `f16636c977-10` ignored: the `Effect.gen` connector (lines 157-168 of `app-graph-builder.ts`) is `main`'s; the PR changes one property inside it.
- `f16636c977-11` resolved: the invitee listing moved into the `useInvitees` hook; it reads `InviteeSource` capabilities, so it is not integration logic for an operation.
- `f16636c977-12` resolved: the invitee listing moved out of the component body into `useInvitees`.
- `f16636c977-13` ignored: `handleAdd`'s `try`/`finally` around a Promise is `main`'s; the PR adds an early branch inside it.
- `f16636c977-14` ignored: `min-w-[6rem]` on the role trigger is `main`'s; the PR only adds a `disabled` condition.
- `f16636c977-15` ignored: lines 278-289 of `ObjectFormDialog.tsx` are unchanged from `main`.
- `f16636c977-16` ignored: lines 99-107 of `AppSpace.test.ts` are unchanged from `main`.
- `f16636c977-17` ignored: the `as any` at line 451 of `spaces.test.ts` is `main`'s.
- `f16636c977-18` ignored: the `retry: 1` at line 811 of `spaces.test.ts` is `main`'s.
- `f16636c977-19` ignored: `SpaceSchema` (lines 181-185 of `client-protocol/src/space.ts`) is unchanged from `main`.
- `f16636c977-20` ignored: lines 391-414 of `data-space-manager.ts` are unchanged from `main`.
- `f16636c977-21` ignored: `_anchorSpaceOnRootDocument` is unchanged from `main`.
- `f16636c977-22` ignored: `SpacesService.querySpaces` (lines 188-199 of `spaces-service.ts`) is unchanged from `main`.
- `f16636c977-23` ignored: `getSpace` (lines 90-106 of `space-proxy.ts`) is unchanged from `main`.
- `f16636c977-24` ignored: lines 635-658 of `space-proxy.ts` are unchanged from `main`.
