---
branch: claude/react-ui-next-design-4db6eb
commit: fa99da027179ce5b1548fda9b7df4d10909a06e8
base: bb76137c7323d65053ba2cbb7ecaf69d52a44aae
mode: fast
createdAt: 2026-10-05T02:47:09.433Z
isFinalized: true
groups: 59
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: fa99da02717
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fa99da02717-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-settings/src/operations/open.ts:18

## Issues

# WARN fa99da02717-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-settings/src/operations/open.ts:18`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 18-29 (`const handler: Operation.WithHandler<typeof SettingsOperation.Open> = Setting...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bb76137c7323d65053ba2cbb7ecaf69d52a44aae`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 60 uncertain, 56 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 105 (40 verdicts re-asked with context the model requested)
estimated input tokens: 1479296
billed input tokens: 1437806 (cost $0.0604)
measured chars per token: 3.09
```
