---
branch: dm/drawing-skill-pin
commit: 3762ba2d980b127cb68982bc39aadb7a39fac401
base: 0cc622dceb38943f22df4d9669e86dc55459d95c
mode: fast
createdAt: 2026-10-19T10:17:48.415Z
isFinalized: true
groups: 49
rules: [repo-scripts-are-typescript-on-bun]
reviewId: 3762ba2d980b
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3762ba2d980b-1 - resolved - repo-scripts-are-typescript-on-bun - packages/devtools/drawing/scripts/pin-skill.mjs:1

## Issues

# WARN 3762ba2d980b-1 repo-scripts-are-typescript-on-bun `packages/devtools/drawing/scripts/pin-skill.mjs:1`

System One judges this a likely violation of `repo-scripts-are-typescript-on-bun` (New repo scripts are TypeScript run with Bun), p=0.97. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0cc622dceb38943f22df4d9669e86dc55459d95c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 2 uncertain, 36 clean, 0 unanswered
- left for an agentic reviewer: 12 batch(es)

```text
requests: 16 (1 verdicts re-asked with context the model requested)
estimated input tokens: 43046
billed input tokens: 39612 (cost $0.0017)
measured chars per token: 3.26
```
