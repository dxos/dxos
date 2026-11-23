---
branch: claude/devtools-edge-selector-hub
commit: abffa5fb10396950bff443ffa02daeda7cf306b6
base: 1f48095e217de5fa2f52d254ab4ad94588b22225
mode: fast
createdAt: 2026-11-23T19:24:03.644Z
isFinalized: true
groups: 41
rules: [barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, measure-before-optimizing, name-for-general-behavior, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, options-object-with-defaults, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, setter-must-not-own-transaction, stable-component-for-optional-content, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern]
reviewId: abffa5fb10
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `1f48095e217de5fa2f52d254ab4ad94588b22225`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 16 uncertain, 16 clean, 0 unanswered
- left for an agentic reviewer: 25 batch(es)

```text
requests: 22 (6 verdicts re-asked with context the model requested)
estimated input tokens: 72824
billed input tokens: 68473 (cost $0.0029)
measured chars per token: 3.19
```
