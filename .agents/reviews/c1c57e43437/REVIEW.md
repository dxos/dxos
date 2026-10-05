---
branch: claude/react-ui-next-design-4db6eb
commit: c1c57e43437bfbbeb899b34099badbe19e618d00
base: 3bd992565a896a6785a6dcf05e1bd4d14f98d97a
mode: fast
createdAt: 2026-10-05T06:20:21.723Z
isFinalized: true
groups: 56
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, layout-only-wrapper-invisible-to-a11y, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-invented-theme-tokens, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, obj-update-push, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, write-through-the-live-object]
reviewId: c1c57e43437
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `3bd992565a896a6785a6dcf05e1bd4d14f98d97a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 70 uncertain, 104 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 109 (45 verdicts re-asked with context the model requested)
estimated input tokens: 609259
billed input tokens: 593860 (cost $0.0249)
measured chars per token: 3.08
```
