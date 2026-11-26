---
branch: claude/friendly-einstein-0274e1
commit: b5b0c7d9823806e7ba0ec93aeaad0b90a4c1aab7
base: a95caaa4e1963ad2c7e6c082d32169187c215f3e
mode: fast
createdAt: 2026-11-26T21:03:55.924Z
isFinalized: true
groups: 144
rules: [declare-optional-services-with-noop-layers, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, flat-layer-composition, namespace-brand-key-prefixing, no-lint-suppression-to-pass, obj-update-push, one-test-suite-per-module, reuse-shared-test-layer]
reviewId: b5b0c7d982
---

_0 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b5b0c7d982-1 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/operations/testing.ts:52
- b5b0c7d982-2 - ignored - obj-update-push - packages/plugins/plugin-agent/src/types/AgentChannels.ts:60
- b5b0c7d982-3 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:65
- b5b0c7d982-4 - resolved - declare-optional-services-with-noop-layers - packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:45
- b5b0c7d982-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:191
- b5b0c7d982-6 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40
- b5b0c7d982-7 - ignored - reuse-shared-test-layer - packages/plugins/plugin-thread/src/operations/channel-operations.test.ts:34
- b5b0c7d982-8 - ignored - one-test-suite-per-module - packages/plugins/plugin-thread/src/operations/channel-operations.test.ts:91
- b5b0c7d982-9 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-thread/src/types/ThreadOperation.ts:26
- b5b0c7d982-10 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-thread/src/types/ThreadOperation.ts:169

## Issues

# WARN b5b0c7d982-1 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/operations/testing.ts:52`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 52-63 (`posts.push({ channel: channel.id, thread, text: Message.extractText(message) });`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-2 obj-update-push `packages/plugins/plugin-agent/src/types/AgentChannels.ts:60`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.97. The likeliest place is lines 60-71 (`export const addChannel = Effect.fnUntraced(function* (agent: Agent.Agent, ch...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-3 flat-layer-composition `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:65`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 65-69 (`const testLayer = () =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-4 declare-optional-services-with-noop-layers `packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:45`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.92. The likeliest place is lines 45-56 (`export const makeDiscordChannelBackend = ({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:191`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 191-202 (`const loadConfig = (channel: Channel.Channel) =>`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-6 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 40-52 (`const fakeBot = (members: GuildMember[]) =>`, location confidence 0.74). Judged with added `siblings, similar` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-7 reuse-shared-test-layer `packages/plugins/plugin-thread/src/operations/channel-operations.test.ts:34`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 34-45 (`const makeFakeBackend = () => {`, location confidence 0.92). Judged with added `siblings, similar` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-8 one-test-suite-per-module `packages/plugins/plugin-thread/src/operations/channel-operations.test.ts:91`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.90. The likeliest place is lines 91-102 (`describe('channel operations', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-9 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-thread/src/types/ThreadOperation.ts:26`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 26-33 (`options: Schema.optional(Schema.Record(Schema.String, Schema.Any)),`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b5b0c7d982-10 no-lint-suppression-to-pass `packages/plugins/plugin-thread/src/types/ThreadOperation.ts:169`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.83. The likeliest place is lines 169-180 (`export const backendOperations = (kind: string): BackendOperations => ({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a95caaa4e1963ad2c7e6c082d32169187c215f3e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 181 uncertain, 788 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 387 (138 verdicts re-asked with context the model requested)
estimated input tokens: 2779034
billed input tokens: 2564224 (cost $0.1077)
measured chars per token: 3.25
```
