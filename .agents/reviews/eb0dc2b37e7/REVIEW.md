---
branch: claude/quizzical-payne-cd2620
commit: eb0dc2b37e7260457700c03c433d789537bed7bf
base: 8412f8b2775142a1b4e6d286c54d99d75c309a15
mode: fast
createdAt: 2026-10-02T20:17:04.413Z
isFinalized: true
groups: 41
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, refactor-must-preserve-behavior, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once]
reviewId: eb0dc2b37e7
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `8412f8b2775142a1b4e6d286c54d99d75c309a15`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 41 uncertain, 63 clean, 0 unanswered
- left for an agentic reviewer: 24 batch(es)

```text
requests: 70 (34 verdicts re-asked with context the model requested)
estimated input tokens: 215574
billed input tokens: 196843 (cost $0.0083)
measured chars per token: 3.29
```
