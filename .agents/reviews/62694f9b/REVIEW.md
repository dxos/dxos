---
branch: dm/confident-maxwell-narknv
commit: 62694f9b1ed4d5861e21c87ae973406cbaa50af6
base: cc9bf92a3e3aa64fd64a0e00ba7070dd2bb00582
mode: fast
createdAt: 2026-10-21T13:29:24.632Z
isFinalized: true
groups: 71
rules: [headless-leak-check-per-workerd-plugin]
reviewId: 62694f9b
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 62694f9b-1 - ignored - headless-leak-check-per-workerd-plugin - packages/plugins/plugin-claude/moon.yml:25

## Issues

# WARN 62694f9b-1 headless-leak-check-per-workerd-plugin `packages/plugins/plugin-claude/moon.yml:25`

**Ignored:** pre-existing; this PR only adds two `DX_E2E_*` inputs to the `test` task above it, and `check-module-structure` already guards the headless entry.

System One judges this a likely violation of `headless-leak-check-per-workerd-plugin` (Every plugin with a workerd variant has a React-leak check tracing only worker conditions, with a target of zero), p=0.95. The likeliest place is lines 25-36 (`--to "{react,react-dom}"`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cc9bf92a3e3aa64fd64a0e00ba7070dd2bb00582`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 63 uncertain, 55 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 69 (45 verdicts re-asked with context the model requested)
estimated input tokens: 379639
billed input tokens: 356627 (cost $0.0150)
measured chars per token: 3.19
```
