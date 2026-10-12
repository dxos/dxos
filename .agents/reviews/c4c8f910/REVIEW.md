---
branch: dm/eloquent-dijkstra-jkbi9g
commit: c4c8f91058ddee3c92b4d4baee3470c9b9c631b5
base: cd3e6c06c3d3c767ed62d412e0b5969e8a9848a6
mode: fast
createdAt: 2026-10-08T10:42:26.949Z
isFinalized: true
groups: 54
rules: [no-invented-theme-tokens]
reviewId: c4c8f910
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c4c8f910-1 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:14

## Issues

# WARN c4c8f910-1 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:14`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 14-22 (`const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; class...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cd3e6c06c3d3c767ed62d412e0b5969e8a9848a6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 28 uncertain, 78 clean, 0 unanswered
- left for an agentic reviewer: 23 batch(es)

```text
requests: 59 (20 verdicts re-asked with context the model requested)
estimated input tokens: 274333
billed input tokens: 265728 (cost $0.0112)
measured chars per token: 3.10
```
