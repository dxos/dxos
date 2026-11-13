---
branch: dm/fix-blob-hosted-vendoring
commit: 96e4cab00d0b62b5c5cb558f9df08baed5cfa72c
base: 66cf99379f94cf79ded48ea940879486e851448e
mode: fast
createdAt: 2026-11-12T10:04:09.374Z
isFinalized: true
groups: 68
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, generic-layer-takes-policy-as-parameter, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, namespace-brand-key-prefixing, no-coined-jargon, no-compat-shims, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, read-state-through-owning-api, ref-collections-via-query, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, shared-api-default-unchanged, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workaround-is-documented-and-removable]
reviewId: 96e4cab0
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `66cf99379f94cf79ded48ea940879486e851448e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 32 uncertain, 61 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 46 (10 verdicts re-asked with context the model requested)
estimated input tokens: 247132
billed input tokens: 233805 (cost $0.0098)
measured chars per token: 3.17
```
