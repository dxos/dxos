---
branch: dm/inspiring-faraday-jo62qs
commit: 505faf0dcb4152d3302576b5a3d9101d6f195ef4
base: a1c69b514b50b7f2b724b87f6e1950491e65365b
mode: fast
createdAt: 2026-10-14T08:21:16.740Z
isFinalized: true
groups: 75
rules: [structured-logging-not-console]
reviewId: 505faf0d
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 505faf0d-1 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:149

## Issues

# WARN 505faf0d-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:149`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 149-172 (`}, [node.id, model.database]);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the match is the row menu's "Print to console" action, whose purpose is to print the object to the devtools console on request; it is not logging, predates this PR, and the PR does not change it.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a1c69b514b50b7f2b724b87f6e1950491e65365b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 62 uncertain, 34 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 58 (40 verdicts re-asked with context the model requested)
estimated input tokens: 687919
billed input tokens: 664301 (cost $0.0279)
measured chars per token: 3.11
```
