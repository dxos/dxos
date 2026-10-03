---
branch: dm/vibrant-tesla-zz757b
commit: 809103242b73daebd337da2b27be6b1dc7ca1583
base: 1f0edc6f5ef57a08ecbed1e7f38358809a22aa2f
mode: fast
createdAt: 2026-10-02T16:11:29.368Z
isFinalized: true
groups: 51
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, canonical-api-surface, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-compat-shims, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, obj-update-push, options-object-with-defaults, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-declare-and-brand, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 80910324
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `1f0edc6f5ef57a08ecbed1e7f38358809a22aa2f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 79 uncertain, 108 clean, 0 unanswered
- left for an agentic reviewer: 33 batch(es)

```text
requests: 117 (57 verdicts re-asked with context the model requested)
estimated input tokens: 723098
billed input tokens: 691655 (cost $0.0290)
measured chars per token: 3.14
```
