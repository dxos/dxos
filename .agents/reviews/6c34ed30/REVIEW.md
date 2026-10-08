---
branch: HEAD
commit: 6c34ed30dbb6bcb6dd626b7270bf234afb6eb884
base: 2f0bc383df7561584f8514b3f996191ddc5fe8df
mode: fast
createdAt: 2026-10-05T08:41:41.935Z
isFinalized: true
groups: 105
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 6c34ed30
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6c34ed30-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:54
- 6c34ed30-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.ts:133

## Issues

# WARN 6c34ed30-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:54`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 54-65 (`const replies = (feed: Feed.Feed, count: number) =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6c34ed30-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.ts:133`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 133-144 (`const runTurn = (prompt: readonly ContentBlock.Any[]) =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f0bc383df7561584f8514b3f996191ddc5fe8df`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 171 uncertain, 586 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 356 (101 verdicts re-asked with context the model requested)
estimated input tokens: 2595038
billed input tokens: 2357956 (cost $0.0990)
measured chars per token: 3.30
```
