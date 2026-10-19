---
branch: dm/drawing-skill-root
commit: 54400510731e92d3271eb847ee36f16780564a83
base: e8dab41e85c90df21cb52d4e9b2511ab3081ca94
mode: fast
createdAt: 2026-10-19T07:25:29.411Z
isFinalized: true
groups: 65
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, flat-dispatch, follow-existing-lazy-loading-pattern, functions-before-classes, generic-layer-takes-policy-as-parameter, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, namespace-brand-key-prefixing, no-casts, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 5440051073
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `e8dab41e85c90df21cb52d4e9b2511ab3081ca94`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 39 uncertain, 53 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 51 (21 verdicts re-asked with context the model requested)
estimated input tokens: 700122
billed input tokens: 707718 (cost $0.0297)
measured chars per token: 2.97
```
