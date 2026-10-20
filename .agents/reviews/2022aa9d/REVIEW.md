---
branch: dm/drawing-svg-fallback-fill
commit: 2022aa9db5bb6fdd15a0d05200cdbd30c67e66d3
base: 40271d566e8d69d0558fe32548a9922e0c67786f
mode: fast
createdAt: 2026-10-19T08:49:14.300Z
isFinalized: true
groups: 65
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, flat-dispatch, follow-existing-lazy-loading-pattern, functions-before-classes, generic-layer-takes-policy-as-parameter, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-durations-and-budgets, named-variants-not-undefined, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 2022aa9d
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `40271d566e8d69d0558fe32548a9922e0c67786f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 39 uncertain, 54 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 52 (19 verdicts re-asked with context the model requested)
estimated input tokens: 458145
billed input tokens: 471848 (cost $0.0198)
measured chars per token: 2.91
```
