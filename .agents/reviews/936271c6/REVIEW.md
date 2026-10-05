---
branch: dm/sharp-faraday-quo6hw
commit: 936271c64a86930b1e8f810a15b7b861608219ab
base: 38ea01f724735d3a12189401784a882db00ede56
mode: fast
createdAt: 2026-10-01T10:39:05.138Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-layer-composition]
reviewId: 936271c6
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 936271c6-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-code-mode.eval.ts:62
- 936271c6-2 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:943
- 936271c6-3 - resolved - error-messages-carry-context - packages/core/compute/mcp-server/src/McpServer.ts:645

## Issues

# WARN 936271c6-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-code-mode.eval.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 62-71 (`const readTasks = Effect.gen(function* () {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 936271c6-2 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:943`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 943-966 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 936271c6-3 error-messages-carry-context `packages/core/compute/mcp-server/src/McpServer.ts:645`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 645-668 (`Effect.map(({ operations }) => operations),`, location confidence 0.28). Judged with added `diff, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `38ea01f724735d3a12189401784a882db00ede56`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 212 uncertain, 104 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 249 (134 verdicts re-asked with context the model requested)
estimated input tokens: 3271701
billed input tokens: 3115379 (cost $0.1308)
measured chars per token: 3.15
```
