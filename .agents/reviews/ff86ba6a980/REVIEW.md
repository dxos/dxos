---
branch: worktree-code-index-tree
commit: ff86ba6a980806f1bb452a6149fad7898be6c8bb
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T13:55:13.744Z
isFinalized: true
groups: 3
rules: [catalog-is-dependency-source-of-truth, code-not-in-strings, repo-scripts-are-typescript-on-bun]
reviewId: ff86ba6a980
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
- verdicts: 0 violations written to fragments, 5 uncertain, 8 clean, 0 unanswered
- left for an agentic reviewer: 2 batch(es)

```text
requests: 18 (2 verdicts re-asked with context the model requested)
estimated input tokens: 82660
billed input tokens: 91778 (cost $0.0039)
measured chars per token: 2.70
```
