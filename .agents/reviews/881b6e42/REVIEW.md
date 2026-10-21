---
branch: worktree-agentic-review-cost-cap
commit: 881b6e42d113e42e9dae44fba34a6935d615cb5a
base: b440559823fb87ed1a4590dab21ae924d4d76c3a
mode: fast
createdAt: 2026-10-19T05:46:17.067Z
isFinalized: true
groups: 1
rules: [harness-script-hygiene]
reviewId: 881b6e42
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `b440559823fb87ed1a4590dab21ae924d4d76c3a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 4 uncertain, 0 clean, 0 unanswered
- left for an agentic reviewer: 1 batch(es)

```text
requests: 8 (1 verdicts re-asked with context the model requested)
estimated input tokens: 55627
billed input tokens: 57826 (cost $0.0024)
measured chars per token: 2.89
```
