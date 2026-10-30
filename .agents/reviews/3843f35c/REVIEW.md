---
branch: dm/eloquent-ptolemy-grnoa2
commit: 3843f35c323ddeb777a2b9355149944ca48761ec
base: 45e1c93327f2f95d392615847aebc8c444c617e4
mode: fast
createdAt: 2026-10-29T11:28:09.346Z
isFinalized: true
groups: 60
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, create-then-add-operations, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-casts, no-coined-jargon, no-impossible-state-handling, no-lint-suppression-to-pass, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, operations-take-refs-not-ids, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern]
reviewId: 3843f35c
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `45e1c93327f2f95d392615847aebc8c444c617e4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 31 uncertain, 59 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 50 (17 verdicts re-asked with context the model requested)
estimated input tokens: 402920
billed input tokens: 372203 (cost $0.0156)
measured chars per token: 3.25
```
