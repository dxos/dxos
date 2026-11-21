---
branch: dm/charming-knuth-lw1x6k
commit: 205ede4d7278b31580913d5b793e72e8fb7fa2a0
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T13:47:39.389Z
isFinalized: true
groups: 59
rules: [repo-scripts-are-typescript-on-bun]
reviewId: 205ede4d
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 205ede4d-1 - ignored - repo-scripts-are-typescript-on-bun - .github/workflows/session-board-cache.yml:1

## Issues

# WARN 205ede4d-1 repo-scripts-are-typescript-on-bun `.github/workflows/session-board-cache.yml:1`

System One judges this a likely violation of `repo-scripts-are-typescript-on-bun` (New repo scripts are TypeScript run with Bun), p=0.82. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `29101e40203356f34aa01daad996095346dc36b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 29 uncertain, 64 clean, 0 unanswered
- left for an agentic reviewer: 29 batch(es)

```text
requests: 55 (8 verdicts re-asked with context the model requested)
estimated input tokens: 220216
billed input tokens: 213418 (cost $0.0090)
measured chars per token: 3.10
```

205ede4d-1 ignored: the workflow runs `tools/session-board/src/cli.ts`, a TypeScript script, which the rule's letter does not cover. It stays on `node` because the same CLI is the Stop hook, which runs with a plain shell PATH where no other `.claude/hooks` script relies on Bun.
