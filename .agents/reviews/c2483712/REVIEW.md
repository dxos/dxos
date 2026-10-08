---
branch: dm/friendly-maxwell-ln3vr9
commit: c24837125c430b1070c35c96ab646e9ca6ae1812
base: 64f1a7a734790ffa7f7a4b7bff447d5c38e35acf
mode: fast
createdAt: 2026-10-08T10:30:05.649Z
isFinalized: true
groups: 54
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, errors-extend-base-error, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-compat-shims, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, private-new-packages, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workspace-deps]
reviewId: c2483712
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `64f1a7a734790ffa7f7a4b7bff447d5c38e35acf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 78 uncertain, 112 clean, 0 unanswered
- left for an agentic reviewer: 33 batch(es)

```text
requests: 114 (54 verdicts re-asked with context the model requested)
estimated input tokens: 829876
billed input tokens: 790400 (cost $0.0332)
measured chars per token: 3.15
```
