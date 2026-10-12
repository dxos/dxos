---
branch: dm/friendly-maxwell-ln3vr9
commit: 817b5148f032e3517e42fd27294993bf73f8e6b3
base: 36f4894cc7f413abf8c3988738f77cbd4286df58
mode: fast
createdAt: 2026-10-12T05:37:13.333Z
isFinalized: true
groups: 54
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, catalog-is-dependency-source-of-truth, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, errors-extend-base-error, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-compat-shims, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, private-new-packages, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workspace-deps]
reviewId: 817b5148
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `36f4894cc7f413abf8c3988738f77cbd4286df58`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 92 uncertain, 135 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 137 (64 verdicts re-asked with context the model requested)
estimated input tokens: 1059523
billed input tokens: 1009821 (cost $0.0424)
measured chars per token: 3.15
```
