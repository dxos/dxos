---
branch: HEAD
commit: 9271256175b06354191a1c141287832110e564ca
base: 66304b6baf9d3b7678fb083f301b47df292d2b4e
mode: fast
createdAt: 2026-11-11T19:43:56.180Z
isFinalized: true
groups: 80
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, reuse-shared-test-layer]
reviewId: 9271256175
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9271256175-1 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- 9271256175-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:22
- 9271256175-3 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:69
- 9271256175-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:80
- 9271256175-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:88
- 9271256175-6 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40

## Issues

# WARN 9271256175-1 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * from './automerge.ts';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9271256175-2 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:22`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 22-29 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9271256175-3 flat-layer-composition `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:69`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 69-73 (`const testLayer = () =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9271256175-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.test.ts:80`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 80-91 (`const makeChannel = (token = 'bot-secret') =>`, location confidence 0.55). Judged with added `test` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 9271256175-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/channel-backend.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 88-99 (`);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9271256175-6 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 40-52 (`const fakeBot = (members: GuildMember[]) =>`, location confidence 0.86). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `66304b6baf9d3b7678fb083f301b47df292d2b4e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 154 uncertain, 131 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 166 (115 verdicts re-asked with context the model requested)
estimated input tokens: 1337830
billed input tokens: 1298858 (cost $0.0546)
measured chars per token: 3.09
```
