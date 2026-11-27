---
branch: claude/discord-dm-records
commit: b18941d3d26ba8a48cd803a39fb5c0914ef46830
base: 70fd4dc95c280c8256703dfd7f517c284eb1d28a
mode: fast
createdAt: 2026-11-27T15:07:08.533Z
isFinalized: true
groups: 78
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, call-effect-api-not-promise-bridge, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, create-then-add-operations, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, event-handler-naming-convention, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, machine-written-prompt-text-is-synthetic, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-durations-and-budgets, named-variants-not-undefined, namespace-brand-key-prefixing, namespace-service-layers, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, obj-update-push, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, operations-take-refs-not-ids, options-object-with-defaults, parent-ref-backs-parent-pointer, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, retries-via-schedule-with-evidence, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy]
reviewId: b18941d3d2
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `70fd4dc95c280c8256703dfd7f517c284eb1d28a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 205 uncertain, 206 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 245 (145 verdicts re-asked with context the model requested)
estimated input tokens: 1547381
billed input tokens: 1423576 (cost $0.0598)
measured chars per token: 3.26
```
