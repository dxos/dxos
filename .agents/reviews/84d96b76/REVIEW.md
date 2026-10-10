---
branch: dm/clever-knuth-39s82g
commit: 84d96b7644056774490510cab4d48752fc122a5a
base: c531b05ff4de88bb5d4032891d2f9ad4d5932595
mode: fast
createdAt: 2026-10-06T07:01:32.161Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, no-casts]
reviewId: 84d96b76
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 84d96b76-1 - ignored - no-casts - packages/apps/composer-app/src/functions/_worker.test.ts:21
- 84d96b76-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:407

## Issues

# ERROR 84d96b76-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-34 (`const archive = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 84d96b76-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:407`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 407-418 (`data: () =>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c531b05ff4de88bb5d4032891d2f9ad4d5932595`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 119 uncertain, 234 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 203 (84 verdicts re-asked with context the model requested)
estimated input tokens: 1312450
billed input tokens: 1252594 (cost $0.0526)
measured chars per token: 3.14
```
