---
branch: dm/awesome-hawking-5110zl
commit: d9564072e1b9be97f6cda6b93714f1395a34244a
base: d296c738a5c98efe5130dfa0bebb0ead817af973
mode: fast
createdAt: 2026-10-05T15:00:54.154Z
isFinalized: true
groups: 56
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, leaf-owns-its-subscription, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-casts, no-compat-shims, no-hand-rolled-lists, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: d9564072
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `d296c738a5c98efe5130dfa0bebb0ead817af973`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 140 uncertain, 185 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 206 (70 verdicts re-asked with context the model requested)
estimated input tokens: 2932494
billed input tokens: 3002536 (cost $0.1261)
measured chars per token: 2.93
```
