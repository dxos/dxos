---
branch: dm/ecstatic-galileo-mqm193
commit: 6166c35ce80f73bd92bc7043daa951881436e31f
base: 57676339bdc204e94d85767a0c3632588d5a8d02
mode: fast
createdAt: 2026-10-02T06:21:56.259Z
isFinalized: true
groups: 59
rules: [effect-fn-not-hand-wrapped-gen, no-casts]
reviewId: 6166c35c
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6166c35c-1 - ignored - no-casts - packages/plugins/plugin-markdown/src/testing.ts:13
- 6166c35c-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/types/src/types/Task.ts:1050

## Issues

# ERROR 6166c35c-1 no-casts `packages/plugins/plugin-markdown/src/testing.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 13-26 (`import { SpaceProperties } from '@dxos/client-protocol';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6166c35c-2 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/Task.ts:1050`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 1050-1074 (`export const collectSubtree = (task: Task): Effect.Effect<Task[], never, Data...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `57676339bdc204e94d85767a0c3632588d5a8d02`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 134 uncertain, 192 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 193 (75 verdicts re-asked with context the model requested)
estimated input tokens: 1535699
billed input tokens: 1483453 (cost $0.0623)
measured chars per token: 3.11
```
