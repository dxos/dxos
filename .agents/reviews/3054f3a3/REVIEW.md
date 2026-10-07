---
branch: dm/friendly-maxwell-ln3vr9
commit: 3054f3a3d90428b439d61ba940f127360557d394
base: 64f1a7a734790ffa7f7a4b7bff447d5c38e35acf
mode: fast
createdAt: 2026-10-07T10:46:32.109Z
isFinalized: true
groups: 55
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, errors-extend-base-error, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-compat-shims, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, private-new-packages, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-declare-and-brand, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workspace-deps]
reviewId: 3054f3a3
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
- verdicts: 0 violations written to fragments, 53 uncertain, 99 clean, 0 unanswered
- left for an agentic reviewer: 27 batch(es)

```text
requests: 87 (29 verdicts re-asked with context the model requested)
estimated input tokens: 419764
billed input tokens: 404352 (cost $0.0170)
measured chars per token: 3.11
```
