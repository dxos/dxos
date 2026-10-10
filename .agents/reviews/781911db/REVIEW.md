---
branch: claude/quirky-volta-j5gteq
commit: 781911db9bc12336d127071e1372a6be7f5f8701
base: ec6da5aebbdc93185005f35f39120bc5d3561eed
mode: fast
createdAt: 2026-10-08T13:17:17.802Z
isFinalized: true
groups: 60
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, leaf-owns-its-subscription, name-for-general-behavior, namespace-brand-key-prefixing, namespace-service-layers, no-compat-shims, no-hand-rolled-lists, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, obj-update-push, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, write-through-the-live-object]
reviewId: 781911db
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `ec6da5aebbdc93185005f35f39120bc5d3561eed`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 79 uncertain, 106 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 108 (48 verdicts re-asked with context the model requested)
estimated input tokens: 636865
billed input tokens: 601158 (cost $0.0252)
measured chars per token: 3.18
```
