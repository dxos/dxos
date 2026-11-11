---
branch: HEAD
commit: f2b568b2d86280be043040dac7a56068cbcb8f8b
base: 66304b6baf9d3b7678fb083f301b47df292d2b4e
mode: fast
createdAt: 2026-11-11T18:52:41.487Z
isFinalized: true
groups: 72
rules: [import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, reuse-shared-test-layer]
reviewId: f2b568b2d8
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f2b568b2d8-1 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- f2b568b2d8-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:22
- f2b568b2d8-3 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:34

## Issues

# WARN f2b568b2d8-1 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-12 (`export * from './automerge.ts';`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN f2b568b2d8-2 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:22`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 22-29 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.80). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN f2b568b2d8-3 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:34`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 34-44 (`const fakeBot = (members: DiscordBot.Member[]) =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `66304b6baf9d3b7678fb083f301b47df292d2b4e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 63 uncertain, 74 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 79 (47 verdicts re-asked with context the model requested)
estimated input tokens: 506546
billed input tokens: 489334 (cost $0.0206)
measured chars per token: 3.11
```
