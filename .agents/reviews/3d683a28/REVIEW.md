---
branch: dm/vibrant-gates-u8vy5m
commit: 3d683a28facdff586c19b9a42b3d3f228de47433
base: 8d1b56fb0e767bc1f0f341b47083fa38dc52e937
mode: fast
createdAt: 2026-10-02T13:10:25.175Z
isFinalized: true
groups: 43
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, lifecycle-owned-by-its-resource, name-for-general-behavior, namespace-brand-key-prefixing, no-casts, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, use-context-scoped-cancellation]
reviewId: 3d683a28
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d1b56fb0e767bc1f0f341b47083fa38dc52e937`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 18 uncertain, 20 clean, 0 unanswered
- left for an agentic reviewer: 23 batch(es)

```text
requests: 21 (7 verdicts re-asked with context the model requested)
estimated input tokens: 139292
billed input tokens: 135445 (cost $0.0057)
measured chars per token: 3.09
```
