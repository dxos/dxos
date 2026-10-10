---
branch: claude/serene-babbage-6zvzmf
commit: baefaf2eebfd63e3b08048d04f8ab2b1aad9c6a4
base: 81ce7bba08d10e4f6715d12674ac648e06e3727e
mode: fast
createdAt: 2026-10-07T11:02:55.224Z
isFinalized: true
groups: 49
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-sleep-in-test, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: baefaf2eeb
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `81ce7bba08d10e4f6715d12674ac648e06e3727e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 51 uncertain, 30 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 53 (27 verdicts re-asked with context the model requested)
estimated input tokens: 896421
billed input tokens: 912752 (cost $0.0383)
measured chars per token: 2.95
```
