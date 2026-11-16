---
branch: dm/trusting-goodall-baxvow
commit: b46043f0c9f3a075a81d7268cc73d8f8abcb39ad
base: origin/main
mode: pr-only
createdAt: 2026-11-06T14:53:36.356Z
isFinalized: true
groups: 62
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, shared-api-default-unchanged, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: b46043f0c9f
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

- **How this run was made.** `TYPESAFE_API_KEY` is not exported in this session and a local session must
  not invoke `op` (CLAUDE.md), so `system-one.ts` / `fast.ts` could not run. The 62 rules were applied in one
  pass over the whole diff by the orchestrating agent rather than by 62 subagents: the change is 27 added
  lines across two files (`PluginActivation.ts`, one `manager.activate` call plus its rationale comment, and
  `Output.workerd.test.ts`, two cases), and one reader holding all 62 rule instructions against a diff that
  size is both cheaper and more coherent than 62 agents reading the same two files. A reviewer who wants the
  subagent pass can rerun it with `prepare.ts --pr-only --base=origin/main` and spawn per group.
- **Judgements worth recording**, since no fragment shows the reasoning behind a clean result:
  - `minimal-precise-tests`: the two added cases are not trivial variations. The second drives the walker's
    array branch, which the first does not reach.
  - `barrel-imports-not-internal-paths` and `import-as-namespace-is-all-or-nothing`:
    `import * as ActivationEvent from '@dxos/app-framework/ActivationEvent'` is the package's own namespace
    convention, matching the `ActivationEvents`, `Capabilities` and `Capability` imports already in the file.
  - `one-name-one-export-per-concept`: `ActivationEvent` (constructors) beside `ActivationEvents` (the
    framework's own events) is app-framework's existing split, not a pair this diff coined.
- **Fixed outside the rule set.** The first version of the test read the encoded ref through two `as object`
  casts, which no selected rule covers but CLAUDE.md's no-cast non-negotiable does. It now goes through
  `Object(...)`, which needs no cast and throws if the field is absent.
