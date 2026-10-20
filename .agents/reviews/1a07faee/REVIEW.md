---
branch: dm/nice-hopper-92a9ib
commit: 1a07faee0dd2c06a52c143fcfa71dd4308f3325b
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T05:22:33.669Z
isFinalized: true
groups: 62
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, isolate-legacy-protocol-support, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-name-one-export-per-concept, one-test-suite-per-module, operations-resolve-database-from-service, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, repo-scripts-are-typescript-on-bun, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 1a07faee
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 60 uncertain, 221 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 134 (26 verdicts re-asked with context the model requested)
estimated input tokens: 702381
billed input tokens: 685250 (cost $0.0288)
measured chars per token: 3.07
```
