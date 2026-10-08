---
branch: HEAD
commit: 400679e1b48330f84cc14ef24fed4a6857ad1302
base: f028b83c401569b816a2e9d05ad4339a9d421656
mode: fast
createdAt: 2026-10-05T09:00:34.589Z
isFinalized: true
groups: 41
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once]
reviewId: 400679e1
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `f028b83c401569b816a2e9d05ad4339a9d421656`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 8 uncertain, 28 clean, 0 unanswered
- left for an agentic reviewer: 13 batch(es)

```text
requests: 17 (4 verdicts re-asked with context the model requested)
estimated input tokens: 67254
billed input tokens: 62621 (cost $0.0026)
measured chars per token: 3.22
```
