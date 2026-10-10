---
branch: dm/awesome-hawking-5110zl
commit: 9f58c5a135d43693a57af9cc7c3be97e6dedc5a4
base: c53b30f45b4639b29c3a48728b4349c7b4266eaa
mode: fast
createdAt: 2026-10-05T09:51:38.155Z
isFinalized: true
groups: 62
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, layout-only-wrapper-invisible-to-a11y, leaf-owns-its-subscription, name-for-general-behavior, namespace-brand-key-prefixing, no-casts, no-compat-shims, no-hand-rolled-lists, no-impossible-state-handling, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structural-regions-use-design-system-components, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, write-through-the-live-object]
reviewId: 9f58c5a1
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `c53b30f45b4639b29c3a48728b4349c7b4266eaa`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 167 uncertain, 203 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 227 (78 verdicts re-asked with context the model requested)
estimated input tokens: 2848193
billed input tokens: 2872362 (cost $0.1206)
measured chars per token: 2.97
```
