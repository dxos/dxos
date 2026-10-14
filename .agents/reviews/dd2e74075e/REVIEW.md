---
branch: claude/sync-performance-debug-i1xelq
commit: dd2e74075e4c8a01ef326e46bce7811a39cb3ca0
base: 37fd51fe9c6e7d8a3dead7623a06ebcfafc7f586
mode: fast
createdAt: 2026-09-29T20:34:25.897Z
isFinalized: true
groups: 49
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, batch-queries-not-n-plus-1, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, lifecycle-owned-by-its-resource, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: dd2e74075e
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `37fd51fe9c6e7d8a3dead7623a06ebcfafc7f586`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 21 uncertain, 23 clean, 0 unanswered

```text
requests: 24 (16 verdicts re-asked with context the model requested)
estimated input tokens: 216447
billed input tokens: 217773 (cost $0.0091)
measured chars per token: 2.98
```
