---
branch: dm/sleepy-hawking-rp43cc
commit: 7f4762127fcc282e36a118ecb4b0a5c89d68a185
base: 9f930a20c60948896df2293601a8a5313a1d5bee
mode: fast
createdAt: 2026-10-09T06:48:09.070Z
isFinalized: true
groups: 41
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once]
reviewId: 7f476212
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `9f930a20c60948896df2293601a8a5313a1d5bee`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 14 uncertain, 22 clean, 0 unanswered
- left for an agentic reviewer: 19 batch(es)

```text
requests: 21 (8 verdicts re-asked with context the model requested)
estimated input tokens: 129260
billed input tokens: 120471 (cost $0.0051)
measured chars per token: 3.22
```
