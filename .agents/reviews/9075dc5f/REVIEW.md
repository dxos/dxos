---
branch: claude/friendly-mccarthy-empiow
commit: 9075dc5f5736e8d73f90301a3c893f73e0dab760
base: ec9f207bfc33423bb844e1ed13d464d865a2026f
mode: fast
createdAt: 2026-10-06T15:09:40.898Z
isFinalized: true
groups: 43
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 9075dc5f
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `ec9f207bfc33423bb844e1ed13d464d865a2026f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 31 uncertain, 65 clean, 0 unanswered
- left for an agentic reviewer: 22 batch(es)

```text
requests: 55 (23 verdicts re-asked with context the model requested)
estimated input tokens: 180832
billed input tokens: 168417 (cost $0.0071)
measured chars per token: 3.22
```
