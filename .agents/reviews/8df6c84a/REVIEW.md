---
branch: worktree-perf-work-counters
commit: 8df6c84a7a9791ae571d53cd7eaa07f3b730d6d7
base: 2a65e7049621053013a9eeca7a99aac6d15e1d2f
mode: fast
createdAt: 2026-10-06T07:13:13.082Z
isFinalized: true
groups: 42
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, name-for-general-behavior, namespace-brand-key-prefixing, no-impossible-state-handling, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, options-object-with-defaults, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 8df6c84a
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `2a65e7049621053013a9eeca7a99aac6d15e1d2f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 13 uncertain, 66 clean, 0 unanswered
- left for an agentic reviewer: 11 batch(es)

```text
requests: 38 (1 verdicts re-asked with context the model requested)
estimated input tokens: 129864
billed input tokens: 122714 (cost $0.0052)
measured chars per token: 3.17
```
