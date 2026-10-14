---
branch: claude/friendly-mccarthy-empiow
commit: 8c844b2808b47e2659fb6b7b6fd5bc187a156ef8
base: ec9f207bfc33423bb844e1ed13d464d865a2026f
mode: fast
createdAt: 2026-10-06T17:30:42.064Z
isFinalized: true
groups: 32
rules: [barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, setter-must-not-own-transaction, state-owned-once]
reviewId: 8c844b28
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `ec9f207bfc33423bb844e1ed13d464d865a2026f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 10 uncertain, 18 clean, 0 unanswered
- left for an agentic reviewer: 14 batch(es)

```text
requests: 21 (9 verdicts re-asked with context the model requested)
estimated input tokens: 53715
billed input tokens: 51278 (cost $0.0022)
measured chars per token: 3.14
```
