---
branch: dm/charming-knuth-lw1x6k
commit: 184a5de36ad8726a1ce448d657eecd3830cb17d9
base: 29101e40203356f34aa01daad996095346dc36b2
mode: fast
createdAt: 2026-11-21T12:37:21.653Z
isFinalized: true
groups: 58
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, ci-and-tooling-avoid-duplicate-mechanisms, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, mutate-echo-arrays-with-splice, name-for-general-behavior, named-variants-not-undefined, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-module-level-object-caches, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-name-one-export-per-concept, options-object-with-defaults, prefer-branded-types-over-raw-primitives, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, repo-scripts-are-typescript-on-bun, reuse-existing-mechanism, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, workaround-is-documented-and-removable]
reviewId: 184a5de3
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `29101e40203356f34aa01daad996095346dc36b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 32 uncertain, 59 clean, 0 unanswered
- left for an agentic reviewer: 31 batch(es)

```text
requests: 53 (10 verdicts re-asked with context the model requested)
estimated input tokens: 212403
billed input tokens: 206534 (cost $0.0087)
measured chars per token: 3.09
```
