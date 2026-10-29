---
branch: dm/fts-snapshot-index
commit: 60003c6394a3379d775f13de993b2dfaa91a6158
base: 6ba7a88dcf292626b76d827014019c3573a96728
mode: fast
createdAt: 2026-10-27T13:35:02.619Z
isFinalized: true
groups: 70
rules: [always-on-behavior-built-in-not-a-seam, atom-lifetime-bound-to-owner, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, event-handler-naming-convention, fix-root-cause-not-symptom, flat-dispatch, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-legacy-protocol-support, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, measure-before-optimizing, mutate-echo-arrays-with-splice, name-for-general-behavior, named-durations-and-budgets, named-variants-not-undefined, namespace-brand-key-prefixing, namespace-service-layers, no-coined-jargon, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, options-object-with-defaults, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, shared-api-default-unchanged, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern]
reviewId: 60003c63
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `6ba7a88dcf292626b76d827014019c3573a96728`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 124 uncertain, 66 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 154 (67 verdicts re-asked with context the model requested)
estimated input tokens: 2141251
billed input tokens: 2169738 (cost $0.0911)
measured chars per token: 2.96
```
