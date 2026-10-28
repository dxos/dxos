---
branch: dm/charming-maxwell-j23a59
commit: 519a438cec3e54c0f550d9c07e4722a259a618ed
base: 3aef671a11a223a5640de7c1a6cf73685b21c537
mode: fast
createdAt: 2026-10-26T13:52:05.973Z
isFinalized: true
groups: 87
rules: [barrel-imports-not-internal-paths, consistent-private-field-convention, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, one-changeset-per-pr, state-owned-once, use-context-scoped-cancellation]
reviewId: 519a438c
---

_1 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 519a438c-1 - resolved - one-changeset-per-pr - .changeset/comment-reply-during-save.md:1
- 519a438c-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:158
- 519a438c-3 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- 519a438c-4 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:518
- 519a438c-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:539
- 519a438c-6 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122
- 519a438c-7 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210
- 519a438c-8 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402
- 519a438c-9 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:570
- 519a438c-10 - resolved - no-module-level-object-caches - packages/plugins/plugin-review/src/operations/add-message.ts:13
- 519a438c-11 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-review/src/operations/add-message.ts:13
- 519a438c-12 - resolved - state-owned-once - packages/plugins/plugin-review/src/operations/add-message.ts:13

## Issues

# WARN 519a438c-1 one-changeset-per-pr `.changeset/comment-reply-during-save.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.98. This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-2 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:158`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 158-169 (`onTestFinished(() => source.close());`, location confidence 0.28). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 519a438c-3 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-4 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:518`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 518-529 (`graph: mockGraph,`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-5 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:539`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 539-546 (`const makeQueryClient = async (handlers: QueryService.Handlers): Promise<Quer...`, location confidence 0.07). Judged with added `test` context after a first pass of 0.15. This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-6 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 122-137 (`export class IndexQuerySource implements RemoteQuerySource {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-7 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 210-233 (`void this._hydrationCtx?.dispose().catch(() => {});`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-8 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:402`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 402-425 (`try {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-9 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:570`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 570-593 (`try {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-10 no-module-level-object-caches `packages/plugins/plugin-review/src/operations/add-message.ts:13`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 13-29 (`import { batchEvents } from '@dxos/echo/internal';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-11 barrel-imports-not-internal-paths `packages/plugins/plugin-review/src/operations/add-message.ts:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.83. The likeliest place is lines 13-29 (`import { batchEvents } from '@dxos/echo/internal';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 519a438c-12 state-owned-once `packages/plugins/plugin-review/src/operations/add-message.ts:13`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.83. The likeliest place is lines 13-29 (`import { batchEvents } from '@dxos/echo/internal';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3aef671a11a223a5640de7c1a6cf73685b21c537`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 104 uncertain, 48 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 95 (58 verdicts re-asked with context the model requested)
estimated input tokens: 1272819
billed input tokens: 1217113 (cost $0.0511)
measured chars per token: 3.14
```

## Triage

1 is fixed: the two changesets are merged into one that names both packages. 10 and 12 are fixed: the in-flight save
moved from a module-level `WeakMap` onto `CommentState.saving`, next to the drafts it guards. 11 is ignored: the
`@dxos/echo/internal` import predates this PR and is a published subpath of `@dxos/echo`. 2 to 9 are ignored as in the
previous review of this PR: they sit on lines this PR does not change, or on the test file's existing loader-boundary
fakes, or on the hydration timer, which is cleared in a `finally` and ends with the context.
