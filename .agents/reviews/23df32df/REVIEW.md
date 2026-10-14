---
branch: dm/vibrant-gates-u8vy5m
commit: 23df32df5e30c7a02af0db50f20bdc438c93ccc6
base: 3d683a28facdff586c19b9a42b3d3f228de47433
mode: fast
createdAt: 2026-10-02T13:40:10.385Z
isFinalized: true
groups: 45
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, batch-queries-not-n-plus-1, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, lifecycle-owned-by-its-resource, name-for-general-behavior, namespace-brand-key-prefixing, no-env-vars-in-low-level-modules, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, use-context-scoped-cancellation]
reviewId: 23df32df
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `3d683a28facdff586c19b9a42b3d3f228de47433`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 37 uncertain, 37 clean, 0 unanswered
- left for an agentic reviewer: 31 batch(es)

```text
requests: 45 (19 verdicts re-asked with context the model requested)
estimated input tokens: 317461
billed input tokens: 314916 (cost $0.0132)
measured chars per token: 3.02
```
