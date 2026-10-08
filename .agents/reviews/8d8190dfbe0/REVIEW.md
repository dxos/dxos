---
branch: claude/task-list-status-reactivity-5b50c1
commit: 8d8190dfbe0602b544662423229fa2f2b77a9caa
base: ee3aff1d7c4dd886e8d30910642444ceb2aed5b0
mode: fast
createdAt: 2026-10-08T15:46:38.963Z
isFinalized: true
groups: 63
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, layout-only-wrapper-invisible-to-a11y, leaf-owns-its-subscription, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-impossible-state-handling, no-invented-theme-tokens, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, obj-update-push, options-object-with-defaults, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, subscribe-where-you-read, themed-primitives-take-classNames, write-through-the-live-object]
reviewId: 8d8190dfbe0
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `ee3aff1d7c4dd886e8d30910642444ceb2aed5b0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 79 uncertain, 43 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 82 (47 verdicts re-asked with context the model requested)
estimated input tokens: 1086688
billed input tokens: 1078679 (cost $0.0453)
measured chars per token: 3.02
```
