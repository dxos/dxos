---
branch: claude/ci-budget-guards
commit: a1356b2878ca2243b57a4ea8974cffb3157cb1e8
base: 4820c0263c24a199a2ce579c421131bd4fed1fd3
mode: fast
createdAt: 2026-10-09T15:59:42.340Z
isFinalized: true
groups: 6
rules: [ci-and-tooling-avoid-duplicate-mechanisms, delete-dead-code-after-migration, diff-scoped-to-pr-purpose, no-trivial-wrappers-over-official-apis, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate]
reviewId: a1356b2878c
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `4820c0263c24a199a2ce579c421131bd4fed1fd3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 1 uncertain, 3 clean, 0 unanswered
- left for an agentic reviewer: 3 batch(es)

```text
requests: 4
estimated input tokens: 53477
billed input tokens: 50430 (cost $0.0021)
measured chars per token: 3.18
```
