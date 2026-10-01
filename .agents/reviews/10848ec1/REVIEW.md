---
branch: dm/upbeat-lovelace-q9xkyh
commit: 10848ec1eb5b9700bfd9880fe08b1ce716b4feb4
base: 9281e5bec9a053cd29339075b8f4a00bef517a8d
mode: fast
createdAt: 2026-10-01T06:40:30.528Z
isFinalized: true
groups: 55
rules: [flat-layer-composition]
reviewId: 10848ec1
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 10848ec1-1 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:872

## Issues

# WARN 10848ec1-1 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:872`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 872-895 (`}),`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9281e5bec9a053cd29339075b8f4a00bef517a8d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 64 uncertain, 23 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 62 (43 verdicts re-asked with context the model requested)
estimated input tokens: 1348462
billed input tokens: 1283843 (cost $0.0539)
measured chars per token: 3.15
```
