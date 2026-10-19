---
branch: claude/react-ui-next-design-4db6eb
commit: 3bd992565a896a6785a6dcf05e1bd4d14f98d97a
base: fa99da027179ce5b1548fda9b7df4d10909a06e8
mode: fast
createdAt: 2026-10-05T04:01:02.924Z
isFinalized: true
groups: 51
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 3bd992565a8
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3bd992565a8-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-settings/src/operations/open.ts:16

## Issues

# WARN 3bd992565a8-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-settings/src/operations/open.ts:16`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 16-27 (`const handler: Operation.WithHandler<typeof SettingsOperation.Open> = Setting...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fa99da027179ce5b1548fda9b7df4d10909a06e8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 62 uncertain, 84 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 91 (41 verdicts re-asked with context the model requested)
estimated input tokens: 569591
billed input tokens: 527518 (cost $0.0222)
measured chars per token: 3.24
```
