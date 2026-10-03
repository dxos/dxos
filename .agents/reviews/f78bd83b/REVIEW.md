---
branch: dm/busy-bohr-fpmfa1
commit: f78bd83b10b7a34e7f61faebe0a56c74616acad2
base: 0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f
mode: fast
createdAt: 2026-09-30T15:02:56.701Z
isFinalized: true
groups: 62
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, business-logic-out-of-ui, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, leaf-owns-its-subscription, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-hand-rolled-lists, no-impossible-state-handling, no-invented-theme-tokens, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, obj-update-push, operations-take-refs-not-ids, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions, write-through-the-live-object]
reviewId: f78bd83b
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 102 uncertain, 152 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 149 (69 verdicts re-asked with context the model requested)
estimated input tokens: 973235
billed input tokens: 928978 (cost $0.0390)
measured chars per token: 3.14
```
