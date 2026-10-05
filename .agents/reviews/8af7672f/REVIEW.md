---
branch: dm/zen-hawking-92843m
commit: 8af7672f108fe8d1ed595ea505c827f8ff018bce
base: 1ac5511cd3f7f69a58d56d0d24271ceaca740693
mode: fast
createdAt: 2026-10-05T09:19:22.212Z
isFinalized: true
groups: 63
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 8af7672f
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8af7672f-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/apps/composer-app/src/workers/dedicated-worker.ts:52
- 8af7672f-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/worker-services.ts:37

## Issues

# WARN 8af7672f-1 effect-fn-not-hand-wrapped-gen `packages/apps/composer-app/src/workers/dedicated-worker.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 52-63 (`observability = initializeObservability(config, isTauri(), logStore, undefine...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8af7672f-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/worker-services.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 37-48 (`const transportFactory = new RtcTransportProxyFactory();`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1ac5511cd3f7f69a58d56d0d24271ceaca740693`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 182 uncertain, 299 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 286 (116 verdicts re-asked with context the model requested)
estimated input tokens: 1767036
billed input tokens: 1651096 (cost $0.0693)
measured chars per token: 3.21
```
