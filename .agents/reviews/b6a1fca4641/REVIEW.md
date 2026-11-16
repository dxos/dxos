---
branch: worktree-mdl-worker-dialect
commit: b6a1fca46411ecad17269c2aec12b5f5cc074efd
base: origin/main
mode: pr-only
createdAt: 2026-11-09T11:32:26.568Z
isFinalized: true
groups: 62
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, isolate-legacy-protocol-support, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, operations-resolve-database-from-service, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, ref-collections-via-query, refactor-must-preserve-behavior, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: b6a1fca4641
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

- **How this run was made.** `TYPESAFE_API_KEY` is not exported in this session and a local session must not
  invoke `op` (CLAUDE.md), so `system-one.ts` / `fast.ts` could not run and no subagents were spawned. The diff is
  26 lines across five files — four entries each in `BLOCK_TYPES`, the editor's keyword colours and the spec
  viewer's kind styles, one lint test, one changeset — and the 62 selected rules were applied to it in one pass.
  `lang/worker.mdl` matches no rule's globs, so no rule judged it.
- **Judgements worth recording:**
  - `consistent-field-and-list-ordering`: the four types are appended after `table`, in the same order in all three
    maps. `BLOCK_TYPES` is in the order types were added, not alphabetical — `table` was appended last the same way.
  - `minimal-precise-tests`: one case covers the four types, since the change under test is one list.
  - `one-changeset-per-pr`: one changeset, for `@dxos/deus`, which publishes.
  - `operations-resolve-database-from-service`, `isolate-legacy-protocol-support` and
    `reactive-state-via-atom-bridge` select `kinds.ts`, `fences.ts` or the test, but those hold only static style
    maps and a lint case, with no operation, protocol version or reactive state for the rules to judge.
