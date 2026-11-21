---
branch: dm/charming-knuth-lw1x6k
commit: b455ae613167dc1a26a4401f96aa7c97850504cc
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T14:21:40.869Z
isFinalized: true
groups: 59
rules: [repo-scripts-are-typescript-on-bun]
reviewId: b455ae61
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b455ae61-1 - ignored - repo-scripts-are-typescript-on-bun - .github/workflows/session-board-cache.yml:1

## Issues

# WARN b455ae61-1 repo-scripts-are-typescript-on-bun `.github/workflows/session-board-cache.yml:1`

System One judges this a likely violation of `repo-scripts-are-typescript-on-bun` (New repo scripts are TypeScript run with Bun), p=0.82. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `29101e40203356f34aa01daad996095346dc36b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 34 uncertain, 59 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 58 (11 verdicts re-asked with context the model requested)
estimated input tokens: 238023
billed input tokens: 230508 (cost $0.0097)
measured chars per token: 3.10
```
