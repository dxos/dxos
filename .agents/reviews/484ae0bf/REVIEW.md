---
branch: dm/nifty-gates-w8abwd
commit: 484ae0bffbac1e2770f762d27561d1398ca9d21c
base: bc3520fe90f59b3c986ce116b228a7f4745efee7
mode: fast
createdAt: 2026-10-26T04:40:03.625Z
isFinalized: true
groups: 91
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition]
reviewId: 484ae0bf
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 484ae0bf-1 - ignored - flat-layer-composition - packages/plugins/plugin-code-graph/src/command/Command.e2e.test.ts:90
- 484ae0bf-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code-graph/src/command/Command.ts:345
- 484ae0bf-3 - ignored - flat-layer-composition - packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:127

## Issues

# WARN 484ae0bf-1 flat-layer-composition `packages/plugins/plugin-code-graph/src/command/Command.e2e.test.ts:90`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 90-101 (`const aiService = Layer.effect(`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `aiService` is a module-level layer; it provides two separate `AiService` instances (language and decision) to merge their methods, which one `Layer.mergeAll` cannot do for one tag.

# WARN 484ae0bf-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code-graph/src/command/Command.ts:345`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 345-354 (`const resolveJudge = Effect.gen(function* () {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `resolveJudge` is a constant `Effect`, not an arrow function wrapping `Effect.gen`; there are no arguments to turn into `Effect.fn`.

# WARN 484ae0bf-3 flat-layer-composition `packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:127`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 127-140 (`).pipe(Layer.provide(FetchHttpClient.layer));`, location confidence 0.86). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

Ignored: the layer depends on the activation's `manager` and `registry`, so it is built per activation, which the rule exempts; this change only swaps the default model id.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc3520fe90f59b3c986ce116b228a7f4745efee7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 174 uncertain, 170 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 202 (104 verdicts re-asked with context the model requested)
estimated input tokens: 1560973
billed input tokens: 1521452 (cost $0.0639)
measured chars per token: 3.08
```
