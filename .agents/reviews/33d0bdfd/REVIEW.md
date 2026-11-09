---
branch: dm/app-unblock-cache-ready
commit: 33d0bdfd397ad10732ca88f4a511c03052f5c3e4
base: origin/dm/client-ready-signals
mode: fast
createdAt: 2026-10-28T13:16:59.098Z
isFinalized: true
groups: 76
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition]
reviewId: 33d0bdfd
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 33d0bdfd-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/client.test.ts:20
- 33d0bdfd-2 - ignored - flat-layer-composition - packages/plugins/plugin-client/src/capabilities/client.ts:201
- 33d0bdfd-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/index.ts:83

## Issues

# WARN 33d0bdfd-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/client.test.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 20-31 (`const makeProbePlugin = (activated: string[], release: Trigger) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33d0bdfd-2 flat-layer-composition `packages/plugins/plugin-client/src/capabilities/client.ts:201`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 201-212 (`catch: (error) => new ClientInitError({ context: { initializeTimeout }, cause...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33d0bdfd-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/index.ts:83`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 83-100 (`export const Observability = Capability.inlineModule(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/dm/client-ready-signals`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 111 uncertain, 117 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 141 (74 verdicts re-asked with context the model requested)
estimated input tokens: 771183
billed input tokens: 693402 (cost $0.0291)
measured chars per token: 3.34
```
