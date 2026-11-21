---
branch: worktree-code-index-tree
commit: 259ad7cfabd4293794283fbc40520094c9344ebd
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T14:51:23.470Z
isFinalized: true
groups: 5
rules: [catalog-is-dependency-source-of-truth, code-not-in-strings, repo-scripts-are-typescript-on-bun, workaround-is-documented-and-removable]
reviewId: 259ad7cfabd
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
- verdicts: 0 violations written to fragments, 8 uncertain, 15 clean, 0 unanswered
- left for an agentic reviewer: 3 batch(es)

```text
requests: 29 (2 verdicts re-asked with context the model requested)
estimated input tokens: 213306
billed input tokens: 213718 (cost $0.0090)
measured chars per token: 2.99
```
