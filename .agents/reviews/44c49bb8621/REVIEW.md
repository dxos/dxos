---
branch: dm/trusting-goodall-baxvow
commit: 44c49bb86212dcf57663b435fcae495b60fb3be6
base: origin/main
mode: pr-only
createdAt: 2026-11-06T16:59:57.532Z
isFinalized: true
groups: 73
rules: [always-on-behavior-built-in-not-a-seam, avoid-full-collection-scans, barrel-imports-not-internal-paths, bounded-live-state, change-behavior-inside-existing-api, co-locate-tightly-coupled-code, code-not-in-strings, collapse-branches-via-identity-element, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, deferred-callback-owns-its-context, delete-dead-code-after-migration, dependency-direction, deprecated-tag-must-be-accurate, diff-scoped-to-pr-purpose, dont-bend-product-for-tests, dont-leak-internal-api-through-public-surface, error-messages-carry-context, event-handler-naming-convention, fix-root-cause-not-symptom, follow-existing-lazy-loading-pattern, functions-before-classes, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, log-fire-and-forget-rejections, minimal-precise-tests, mutate-echo-arrays-with-splice, name-for-general-behavior, named-durations-and-budgets, named-variants-not-undefined, namespace-brand-key-prefixing, no-coined-jargon, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-new-knob-for-derivable-value, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, obj-update-push, one-changeset-per-pr, one-name-one-export-per-concept, one-test-suite-per-module, options-object-with-defaults, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, ref-collections-via-query, refactor-must-preserve-behavior, reference-definitions-by-object, reuse-existing-mechanism, reuse-shared-test-layer, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, shared-api-default-unchanged, stable-component-for-optional-content, standalone-service-accessor, state-owned-once, store-events-not-projections, symbol-lives-in-module-of-its-concern, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, workerd-variant-imports-conditioned-barrel]
reviewId: 44c49bb8621
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

- **How this run was made.** `TYPESAFE_API_KEY` is not exported in this session and a local session must not
  invoke `op` (CLAUDE.md), so `system-one.ts` / `fast.ts` could not run and no subagents were spawned. The two
  files carried over from `1c506f9de80` were judged there; this run judged the 24 LOC added since — plugin-file's
  `EdgeBackend` environments, the `Interview` story's `tags`, and the changeset — against the rules that can bear
  on them, reading each rule's instructions rather than sampling.
- **Judgements on the new lines:**
  - `workerd-variant-imports-conditioned-barrel`: dropping `workerd` from `EdgeBackend` is the direction this rule
    asks for. It requires the Client capability, so it is not headless-capable, and the rule's fix is exactly
    "list `environments` on each module". `InlineBackend` keeps `workerd` and provides the same backend.
  - `dont-bend-product-for-tests`: plugin-file's change is a product change prompted by a failing check, which the
    rule's own exception covers — the check caught a real impossibility (a capability that cannot exist in a
    bundle), not a test being fussy.
  - `one-changeset-per-pr`: exactly one new changeset, on a PR that changes a published package.
  - `diff-scoped-to-pr-purpose`: both drive-bys (plugin-file, the story) are named and justified in the PR body,
    which is the exception the rule states.
- **Accepted outside the rule set.** Excluding `Interview.stories.tsx > Test Interview Scripted` with
  `tags: ['!test']` hides a real failure behind a green build, which is what
  `isolate-benchmark-setup-and-flaky-tests` warns against in spirit (its globs select only `*.test.ts`, so no
  selected rule formally covers a story). It was done at the user's explicit instruction to unblock the merge
  queue: the test fails in the queue for unrelated PRs too (dxos#14315), and a push to `main` skips
  `test browser`, so `main` reads green while every PR that reaches the browser suite is blocked. The underlying
  bug — the `space-*` toolkit not registered in that environment — is untouched and still owed a fix.
