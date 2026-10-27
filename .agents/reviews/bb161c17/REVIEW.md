---
branch: dm/eloquent-ptolemy-grnoa2
commit: bb161c1763665cea65a2b8f1ad8732bc6265601a
base: 2bba39256c893d3394a5cedfa54922813cfad12d
mode: fast
createdAt: 2026-10-27T09:30:47.414Z
isFinalized: true
groups: 84
rules: [flat-layer-composition, inline-obj-parent, no-mixed-promise-effect-lifecycle]
reviewId: bb161c17
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bb161c17-1 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184
- bb161c17-2 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184
- bb161c17-3 - ignored - inline-obj-parent - packages/plugins/plugin-github/src/operations/sync.ts:377

## Issues

# WARN bb161c17-1 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 184-195 (`const services = Layer.mergeAll(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb161c17-2 flat-layer-composition `packages/plugins/plugin-github/src/operations/sync-poll.test.ts:184`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 184-195 (`const services = Layer.mergeAll(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb161c17-3 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync.ts:377`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.81. The likeliest place is lines 377-400 (`existing ??`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2bba39256c893d3394a5cedfa54922813cfad12d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 80 uncertain, 36 clean, 0 unanswered
- left for an agentic reviewer: 62 batch(es)

```text
requests: 60 (47 verdicts re-asked with context the model requested)
estimated input tokens: 1091940
billed input tokens: 1110173 (cost $0.0466)
measured chars per token: 2.95
```
