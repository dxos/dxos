---
branch: dm/modest-thompson-xt9ex2
commit: ae613e6441f5c90597f0fa98028e2b7b988384af
base: bb2b6723db1f3f3bf24241b5bdd04b47d97470bd
mode: fast
createdAt: 2026-10-05T09:11:16.667Z
isFinalized: true
groups: 58
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-impossible-state-handling, no-invented-theme-tokens, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, private-new-packages, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, workspace-deps]
reviewId: ae613e64
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `bb2b6723db1f3f3bf24241b5bdd04b47d97470bd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 113 uncertain, 81 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 131 (77 verdicts re-asked with context the model requested)
estimated input tokens: 1126177
billed input tokens: 1066731 (cost $0.0448)
measured chars per token: 3.17
```
