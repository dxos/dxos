---
branch: dm/relaxed-clarke-1k82bb
commit: 5a51352bc848e0d8116a552843039895ecce185d
base: 72a12c09de555acd82ae4f8f33ea75f3d1293b29
mode: fast
createdAt: 2026-11-25T11:06:40.123Z
isFinalized: true
groups: 52
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, create-then-add-operations, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern]
reviewId: 5a51352b
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `72a12c09de555acd82ae4f8f33ea75f3d1293b29`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 20 uncertain, 22 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 30 (11 verdicts re-asked with context the model requested)
estimated input tokens: 127109
billed input tokens: 112038 (cost $0.0047)
measured chars per token: 3.40
```
