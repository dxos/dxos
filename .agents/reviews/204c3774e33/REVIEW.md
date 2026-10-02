---
branch: claude/agent-mcp-url-mapping-1eeca5
commit: 204c3774e33f38ccd8fa76da060f8cbcd207f043
base: 318d6109f515e874b892abc360ff92c76558be9f
mode: fast
createdAt: 2026-10-01T15:58:40.478Z
isFinalized: true
groups: 55
rules: [no-casts]
reviewId: 204c3774e33
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 204c3774e33-1 - ignored - no-casts - packages/plugins/plugin-graph/src/graph.ts:87

## Issues

# ERROR 204c3774e33-1 no-casts `packages/plugins/plugin-graph/src/graph.ts:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 87-91 (`const setupDevtools = (graph: AppGraph.ExpandableGraph) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `318d6109f515e874b892abc360ff92c76558be9f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 127 uncertain, 204 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 189 (92 verdicts re-asked with context the model requested)
estimated input tokens: 1288006
billed input tokens: 1205512 (cost $0.0506)
measured chars per token: 3.21
```
