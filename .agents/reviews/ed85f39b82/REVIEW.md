---
branch: HEAD
commit: ed85f39b824b2ed7f375aea06f646f94a9b74af6
base: 66304b6baf9d3b7678fb083f301b47df292d2b4e
mode: fast
createdAt: 2026-11-11T19:24:19.340Z
isFinalized: true
groups: 80
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, reuse-shared-test-layer]
reviewId: ed85f39b82
---

_0 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ed85f39b82-1 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- ed85f39b82-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:22
- ed85f39b82-3 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:28
- ed85f39b82-4 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:69
- ed85f39b82-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:80
- ed85f39b82-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:136
- ed85f39b82-7 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40
- ed85f39b82-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/types/DiscordBot.ts:1

## Issues

# WARN ed85f39b82-1 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * from './automerge.ts';`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-2 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:22`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 22-29 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-3 reuse-shared-test-layer `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:28`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 28-43 (`class MockEdgeHttpClient extends EdgeHttpClient {`, location confidence 0.57). Judged with added `siblings, similar` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-4 flat-layer-composition `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:69`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 69-73 (`const testLayer = () =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:80`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 80-91 (`const makeChannel = (token = 'bot-secret') =>`, location confidence 0.68). Judged with added `test` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:136`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 136-147 (`stop: (channel) =>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-7 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 40-52 (`const fakeBot = (members: GuildMember[]) =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed85f39b82-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/types/DiscordBot.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Context from 'effect/Context';`, location confidence 0.80). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `66304b6baf9d3b7678fb083f301b47df292d2b4e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 152 uncertain, 131 clean, 0 unanswered
- left for an agentic reviewer: 61 batch(es)

```text
requests: 165 (116 verdicts re-asked with context the model requested)
estimated input tokens: 1290643
billed input tokens: 1251174 (cost $0.0525)
measured chars per token: 3.09
```
