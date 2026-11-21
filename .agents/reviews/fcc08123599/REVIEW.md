---
branch: worktree-code-index-tree
commit: fcc0812359933f5406d316f4004efe0330f517a4
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T15:05:41.097Z
isFinalized: true
groups: 5
rules: [catalog-is-dependency-source-of-truth, code-not-in-strings, repo-scripts-are-typescript-on-bun, workaround-is-documented-and-removable]
reviewId: fcc08123599
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `29101e40203356f34aa01daad996095346dc36b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 9 uncertain, 14 clean, 0 unanswered
- left for an agentic reviewer: 3 batch(es)

```text
requests: 30 (2 verdicts re-asked with context the model requested)
estimated input tokens: 216816
billed input tokens: 217296 (cost $0.0091)
measured chars per token: 2.99
```
