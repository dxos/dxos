---
branch: dm/nifty-gates-w8abwd
commit: 4697c3d099ff3636ec08e5c6f2c31d7ad45eff63
base: bc3520fe90f59b3c986ce116b228a7f4745efee7
mode: fast
createdAt: 2026-10-26T14:39:57.522Z
isFinalized: true
groups: 91
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition]
reviewId: 4697c3d0
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4697c3d0-1 - ignored - flat-layer-composition - packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.test.ts:29
- 4697c3d0-2 - ignored - flat-layer-composition - packages/plugins/plugin-code-graph/src/command/Command.e2e.test.ts:90
- 4697c3d0-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code-graph/src/command/Command.ts:345
- 4697c3d0-4 - ignored - flat-layer-composition - packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:127

## Issues

# WARN 4697c3d0-1 flat-layer-composition `packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.test.ts:29`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 29-35 (`const serviceLayer = (apiKey: string) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `serviceLayer(apiKey)` (pre-existing) and the new test's `ask(routes)` build a layer per key or per route set under test, which the rule exempts as genuinely parameterized per call.

# WARN 4697c3d0-2 flat-layer-composition `packages/plugins/plugin-code-graph/src/command/Command.e2e.test.ts:90`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 90-101 (`const aiService = Layer.effect(`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `aiService` is a module-level layer; it provides two separate `AiService` instances (language and decision) to merge their methods, which one `Layer.mergeAll` cannot do for one tag.

# WARN 4697c3d0-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code-graph/src/command/Command.ts:345`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 345-354 (`const resolveJudge = Effect.gen(function* () {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `resolveJudge` is a constant `Effect`, not an arrow function wrapping `Effect.gen`; there are no arguments to turn into `Effect.fn`.

# WARN 4697c3d0-4 flat-layer-composition `packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:127`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 127-140 (`).pipe(Layer.provide(FetchHttpClient.layer));`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the layer depends on the activation's `manager` and `registry`, so it is built per activation, which the rule exempts; this change only swaps the default model id.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc3520fe90f59b3c986ce116b228a7f4745efee7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 173 uncertain, 170 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 201 (102 verdicts re-asked with context the model requested)
estimated input tokens: 1575279
billed input tokens: 1535275 (cost $0.0645)
measured chars per token: 3.08
```
