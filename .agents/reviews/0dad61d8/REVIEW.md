---
branch: dm/drawing-app-svg-parity
commit: 0dad61d873c593384e34a33ef1488a38bb69fabd
base: 0cc622dceb38943f22df4d9669e86dc55459d95c
mode: fast
createdAt: 2026-10-19T10:12:35.830Z
isFinalized: true
groups: 86
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, call-effect-api-not-promise-bridge, capability-module-layout, catalog-is-dependency-source-of-truth, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, create-then-add-operations, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, moon-yml-entrypoint-registration, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, namespace-brand-key-prefixing, namespace-service-layers, no-coined-jargon, no-impossible-state-handling, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, operations-resolve-database-from-service, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, private-new-packages, reactive-state-via-atom-bridge, read-state-through-owning-api, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, stable-component-for-optional-content, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, workspace-deps]
reviewId: 0dad61d8
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `0cc622dceb38943f22df4d9669e86dc55459d95c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 137 uncertain, 138 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 172 (98 verdicts re-asked with context the model requested)
estimated input tokens: 1013357
billed input tokens: 949148 (cost $0.0399)
measured chars per token: 3.20
```
