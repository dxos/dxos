---
branch: dm/zen-gates-2kzo29
commit: 6dcfc5135fadf01ef8605444b43bb51ce5c87a4d
base: b070c4dd733534cf2eccb46771867dc7489c362a
mode: fast
createdAt: 2026-10-09T04:01:54.367Z
isFinalized: true
groups: 43
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, obj-update-push, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once]
reviewId: 6dcfc513
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `b070c4dd733534cf2eccb46771867dc7489c362a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 19 uncertain, 19 clean, 0 unanswered
- left for an agentic reviewer: 24 batch(es)

```text
requests: 22 (9 verdicts re-asked with context the model requested)
estimated input tokens: 98620
billed input tokens: 90352 (cost $0.0038)
measured chars per token: 3.27
```
