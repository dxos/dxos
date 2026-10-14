---
branch: dm/lucid-rubin-u0fk2s
commit: 0d186fb6554538b902e2d009f2450fd2d8775ceb
base: a9fa4bc5688e63fbc63a0dc6acb3f0fa58f91c85
mode: fast
createdAt: 2026-10-03T13:44:15.804Z
isFinalized: true
groups: 88
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, private-new-packages, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, workspace-deps]
reviewId: 0d186fb6
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `a9fa4bc5688e63fbc63a0dc6acb3f0fa58f91c85`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 15 uncertain, 540 clean, 0 unanswered
- left for an agentic reviewer: 20 batch(es)

```text
requests: 372 (4 verdicts re-asked with context the model requested)
estimated input tokens: 1186505
billed input tokens: 1203007 (cost $0.0505)
measured chars per token: 2.96
```
