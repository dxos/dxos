---
branch: dm/pensive-curie-hlco63
commit: aac69588154ff45e314542e1608d6888fe8a8372
base: 0420f87b2f6174efd378bb2dee85f858b4d7624a
mode: fast
createdAt: 2026-10-16T05:05:15.760Z
isFinalized: true
groups: 71
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, canonical-api-surface, catalog-is-dependency-source-of-truth, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, effect-requirement-type-not-erased, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, generic-layer-takes-policy-as-parameter, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, private-new-packages, read-state-through-owning-api, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, subpath-lint-not-adhoc-entrypoints, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workspace-deps]
reviewId: aac6958815
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `0420f87b2f6174efd378bb2dee85f858b4d7624a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 31 uncertain, 70 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 59 (18 verdicts re-asked with context the model requested)
estimated input tokens: 208485
billed input tokens: 199191 (cost $0.0084)
measured chars per token: 3.14
```
