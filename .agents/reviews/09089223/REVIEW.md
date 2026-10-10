---
branch: HEAD
commit: 09089223c07d2043d7098b4d931d164ca4b6c561
base: 151e89ae28b5e2378e6bea242118795a938e46e0
mode: fast
createdAt: 2026-10-02T11:35:27.625Z
isFinalized: true
groups: 57
rules: [effect-fn-not-hand-wrapped-gen, no-echo-internal-in-sdk]
reviewId: 09089223
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 09089223-1 - ignored - no-echo-internal-in-sdk - packages/sdk/types/src/types/Task.ts:1
- 09089223-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/types/src/types/Task.ts:1050

## Issues

# WARN 09089223-1 no-echo-internal-in-sdk `packages/sdk/types/src/types/Task.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.81. The likeliest place is lines 1-24 (`import * as Duration from 'effect/Duration';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 09089223-2 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/Task.ts:1050`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 1050-1074 (`export const collectSubtree = (task: Task): Effect.Effect<Task[], never, Data...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `151e89ae28b5e2378e6bea242118795a938e46e0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 151 uncertain, 151 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 189 (102 verdicts re-asked with context the model requested)
estimated input tokens: 1661583
billed input tokens: 1597519 (cost $0.0671)
measured chars per token: 3.12
```
