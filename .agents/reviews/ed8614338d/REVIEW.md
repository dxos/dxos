---
branch: dm/dazzling-goldberg-fdw85c
commit: ed8614338de82d492e8eb71444bba9bd4e832b21
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T05:31:43.683Z
isFinalized: true
groups: 48
rules: [atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, measure-before-optimizing, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, no-coined-jargon, no-impossible-state-handling, no-invented-theme-tokens, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, options-object-with-defaults, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, setter-must-not-own-transaction, stable-component-for-optional-content, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, themed-primitives-take-classNames]
reviewId: ed8614338d
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 83 uncertain, 52 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 111 (52 verdicts re-asked with context the model requested)
estimated input tokens: 658000
billed input tokens: 637644 (cost $0.0268)
measured chars per token: 3.10
```
