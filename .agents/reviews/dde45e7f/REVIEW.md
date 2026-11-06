---
branch: dm/wizardly-ptolemy-lnx10w
commit: dde45e7f2a22cb3cc6221f6f03561464f66fd1a3
base: 2c9d3c1edfcf91512e7a54783a84255f85f7d90e
mode: fast
createdAt: 2026-11-04T15:35:31.273Z
isFinalized: true
groups: 74
rules: [effect-fn-not-hand-wrapped-gen, no-mixed-promise-effect-lifecycle]
reviewId: dde45e7f
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- dde45e7f-1 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/mcp/client.ts:60
- dde45e7f-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/devtools/cli/src/commands/mcp/util.ts:50

## Issues

# WARN dde45e7f-1 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/mcp/client.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-66 (`export const loadSession = (profile: string, serverUrl: string): Effect.Effec...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN dde45e7f-2 effect-fn-not-hand-wrapped-gen `packages/devtools/cli/src/commands/mcp/util.ts:50`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 50-61 (`export const requireSession = (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2c9d3c1edfcf91512e7a54783a84255f85f7d90e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 134 uncertain, 177 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 181 (82 verdicts re-asked with context the model requested)
estimated input tokens: 975836
billed input tokens: 930043 (cost $0.0391)
measured chars per token: 3.15
```
