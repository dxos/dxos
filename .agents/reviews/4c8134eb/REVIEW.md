---
branch: dm/modest-thompson-82s0oq
commit: 4c8134eb36038c7c2045436655e239bbe94d9a10
base: d338edb7cf94286e9b98ec540e56097183b9c110
mode: fast
createdAt: 2026-11-11T15:19:50.106Z
isFinalized: true
groups: 78
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, change-behavior-inside-existing-api, ci-and-tooling-avoid-duplicate-mechanisms, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, create-then-add-operations, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, namespace-brand-key-prefixing, namespace-service-layers, no-coined-jargon, no-impossible-state-handling, no-lint-suppression-to-pass, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-startup-permission-prompts, no-trivial-wrappers-over-official-apis, no-unused-new-api, obj-update-push, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, operations-resolve-database-from-service, operations-take-refs-not-ids, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, repo-scripts-are-typescript-on-bun, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy]
reviewId: 4c8134eb
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `d338edb7cf94286e9b98ec540e56097183b9c110`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 131 uncertain, 114 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 138 (93 verdicts re-asked with context the model requested)
estimated input tokens: 1251974
billed input tokens: 1177763 (cost $0.0495)
measured chars per token: 3.19
```
