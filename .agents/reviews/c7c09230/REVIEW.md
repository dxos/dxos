---
branch: dm/laughing-albattani-jlj352
commit: c7c092300ee28a51203823ee513bf3cce27c91dc
base: 4510d8c374824d88d8c784e03bae5af319e6a4f3
mode: pr-only
createdAt: 2026-10-27T14:36:28.667Z
isFinalized: true
groups: 142
rules: [change-behavior-inside-existing-api, collapse-branches-via-identity-element, construct-populated-dont-mutate-after, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-dispatch, minimal-precise-tests, no-casts, no-impossible-state-handling, no-new-knob-for-derivable-value, no-pointless-indirection, no-premature-abstraction, no-trivial-wrappers-over-official-apis, no-unused-new-api, one-name-one-export-per-concept, one-test-suite-per-module, prefer-branded-types-over-raw-primitives, reuse-existing-mechanism, setter-must-not-own-transaction, state-owned-once]
reviewId: c7c09230
---

_2 error(s), 32 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c7c09230-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-client-e2e/src/feed-branch.test.ts:390
- c7c09230-2 - resolved - state-owned-once - packages/core/echo/echo-client/src/feed/feed-handle.ts:113:3
- c7c09230-3 - resolved - no-new-knob-for-derivable-value - packages/core/echo/echo-client/src/feed/feed-handle.ts:223:75
- c7c09230-4 - resolved - no-unused-new-api - packages/core/echo/echo-client/src/feed/feed-object-core.ts:52
- c7c09230-5 - resolved - no-pointless-indirection - packages/core/echo/echo-client/src/feed/feed-object-core.ts:52:1
- c7c09230-6 - resolved - flat-dispatch - packages/core/echo/echo-client/src/query/util.ts:293:13
- c7c09230-7 - resolved - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:156
- c7c09230-8 - resolved - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:191
- c7c09230-9 - resolved - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:3311
- c7c09230-10 - resolved - no-impossible-state-handling - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:58:13
- c7c09230-11 - ignored - one-name-one-export-per-concept - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:129
- c7c09230-12 - resolved - no-unused-new-api - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234
- c7c09230-13 - resolved - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234
- c7c09230-14 - resolved - no-premature-abstraction - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234
- c7c09230-15 - resolved - prefer-branded-types-over-raw-primitives - packages/core/echo/echo/src/Database.ts:278:3
- c7c09230-16 - resolved - construct-populated-dont-mutate-after - packages/core/echo/echo/src/Feed.test.ts:270:9
- c7c09230-17 - resolved - no-trivial-wrappers-over-official-apis - packages/core/echo/echo/src/Feed.test.ts:287
- c7c09230-18 - resolved - setter-must-not-own-transaction - packages/core/echo/echo/src/Feed.ts:586:7
- c7c09230-19 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Feed.ts:651
- c7c09230-20 - ignored - change-behavior-inside-existing-api - packages/core/echo/echo/src/Feed.ts:738:14
- c7c09230-21 - resolved - collapse-branches-via-identity-element - packages/core/echo/echo/src/internal/Query/pretty.ts:170
- c7c09230-22 - resolved - prefer-branded-types-over-raw-primitives - packages/core/echo/echo/src/Scope.ts:57:3
- c7c09230-23 - resolved - one-test-suite-per-module - packages/core/echo/feed/src/feed-branches.test.ts:43:1
- c7c09230-24 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/feed/src/feed-store.ts:1191
- c7c09230-25 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/feed/src/feed-store.ts:1289
- c7c09230-26 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/feed/src/feed-store.ts:1311
- c7c09230-27 - resolved - state-owned-once - packages/core/echo/feed/src/feed-store.ts:1311:3
- c7c09230-28 - resolved - no-impossible-state-handling - packages/core/echo/feed/src/feed-store.ts:1946:14
- c7c09230-29 - resolved - minimal-precise-tests - packages/core/echo/index-core/src/indexes/entity-meta-index.test.ts:948:3
- c7c09230-30 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/index-core/src/indexes/entity-meta-index.ts:910
- c7c09230-31 - resolved - minimal-precise-tests - packages/plugins/plugin-code/src/components/SpecModel/questions.test.ts:86:3
- c7c09230-32 - resolved - one-name-one-export-per-concept - packages/plugins/plugin-code/src/components/SpecModel/questions.ts:12
- c7c09230-33 - resolved - reuse-existing-mechanism - packages/plugins/plugin-code/src/components/SpecModel/questions.ts:56:7
- c7c09230-34 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/containers/SpecArticle/useGitHubText.ts:29

## Issues

# WARN c7c09230-1 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-client-e2e/src/feed-branch.test.ts:390`

`makeFeed` is `() => Effect.gen(function* () {...})`. Per `effect-fn-not-hand-wrapped-gen`, a test helper should be `Effect.fnUntraced(function* () {...})` (no trace span needed in a test).

# WARN c7c09230-2 state-owned-once `packages/core/echo/echo-client/src/feed/feed-handle.ts:113:3`

`#pendingForks` is a handle-side set tracking "this core's fork write is unconfirmed", state that `FeedObjectCore` already owns in `#fork` (its token is cleared only on confirm/revert) and that the handle keeps in sync by hand in `fork`, `#sendAppendBatches`, `#markWritten` and `#addOptimistic`. Expose a `pendingFork` getter on the core and have the handle read it, deleting the side set (the rule: track state once, on the record that owns it).

# WARN c7c09230-3 no-new-knob-for-derivable-value `packages/core/echo/echo-client/src/feed/feed-handle.ts:223:75`

The new `hidden` option of `#appendCores` repeats a signal the handle already holds: a fork base is hidden exactly while it is in `#pendingForks`, and `#addOptimistic` already filters `#pendingForks` out. Drop the flag and let the existing membership decide (rule `no-new-knob-for-derivable-value`).

# WARN c7c09230-4 no-unused-new-api `packages/core/echo/echo-client/src/feed/feed-object-core.ts:52`

`BranchKeys` and `branchKeysOf` are exported but nothing outside this module (or any test) imports them. Keep them module-private (rule `no-unused-new-api`).

# WARN c7c09230-5 no-pointless-indirection `packages/core/echo/echo-client/src/feed/feed-object-core.ts:52:1`

`BranchKeys = { branch: string | undefined }` wraps a single field, and `branchKeysOf`, `sameBranch` and the `#branch` wrapper object exist only to read and compare that one string (`this.#branch?.branch`, `{ branch: blockId }`). Store the branch as a plain `string | undefined` (plus a separate "has been written" flag if the undefined/root distinction is needed) and compare with `===`; delete the wrapper type and `sameBranch` (the rule: do not wrap a value that does not need it).

# WARN c7c09230-6 flat-dispatch `packages/core/echo/echo-client/src/query/util.ts:293:13`

The `QueryAST.visit` callback nests `if`, `for`, `if`, and then a two-level ternary that accumulates the union of branches per feed while searching the map for the previous entry. Extract a small named helper (for example `unionBranches(previous, next)`) with early returns instead of the nested ternary (rule `flat-dispatch`).

# ERROR c7c09230-7 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:156`

`feedId!` is a non-null assertion inside the rewritten `messages` mapper. Per `no-casts`, narrow `feedId` once before the Effect (e.g. `assertArgument(feedId !== undefined, ...)` or `invariant`) and use the narrowed value instead of `!`.

# ERROR c7c09230-8 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:191`

`objectIds!.map((id, index) => ...)` (changed in this PR to add `branches`) and `feedId!` on the next lines are non-null assertions. Per `no-casts`, validate `objectIds` and `feedId` up front with an argument assertion so they narrow without `!`.

# WARN c7c09230-9 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:3311`

`walkDirection` rejects any non-natural order with the static message 'A walk accepts only the natural order.' although the offending order kind is in hand (`orders.find((order) => order.kind !== 'natural')`). Interpolate the unsupported kind into the message (or put it in `context`) so the failing query can be traced, per `error-messages-carry-context`.

# WARN c7c09230-10 no-impossible-state-handling `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:58:13`

`FeedWriteIntent` is `{ branch?; forkAt? }`, yet `writeIntentOf` only ever returns one of the two (or neither), and the consumer spreads it into `LocalAppendMessage` where `forkAt` silently wins. Make it a discriminated union (`{ forkAt }` | `{ branch }` | `{}`) rather than a struct whose fields apply to different variants.

# WARN c7c09230-11 one-name-one-export-per-concept `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:129`

`EchoFeedCodec.blockId` now only calls `FeedProtocol.formatBlockId` under a second name, so one concept has two names and two paths (`parseBlockId` got the same treatment). Delete the alias and update the call sites to `FeedProtocol.formatBlockId` (rule `one-name-one-export-per-concept`).

# WARN c7c09230-12 no-unused-new-api `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234`

`KEY_FEED_FORK_AT` is re-exported "for `@dxos/echo`", but `@dxos/echo` does not import it (`Feed.ts` takes only the BLOCK, BRANCH, FORK and PREV keys), and nothing else calls it. Remove the re-export (rule `no-unused-new-api`).

# WARN c7c09230-13 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234`

`KEY_FEED_FORK_AT` is re-exported from the package's public entry "for `@dxos/echo`", but nothing outside `echo-protocol` imports it; `Feed.ts` takes only the block, branch, fork and prev keys, and the key is purely the codec-to-store wire detail of asking for a fork. Drop this re-export (the codec reads `FeedProtocol.KEY_FEED_FORK_AT` directly) so the detail can change later (rule `dont-leak-internal-api-through-public-surface`).

# WARN c7c09230-14 no-premature-abstraction `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:234`

`KEY_FEED_FORK_AT` is re-exported "for `@dxos/echo`", but nothing outside this file imports it; `@dxos/echo` reads only the block, branch, fork and predecessor keys, and the fork-at key is used here through `FeedProtocol.KEY_FEED_FORK_AT`. Remove the speculative public export and add it when a second package needs it, per `no-premature-abstraction`.

# WARN c7c09230-15 prefer-branded-types-over-raw-primitives `packages/core/echo/echo/src/Database.ts:278:3`

`forkFeed` takes the fork point as a bare `string` and resolves to a bare `Promise<string>`, although `Feed.BranchId` (branded) and `Feed.BlockId` already name these concepts and `Feed.fork` immediately re-brands the result with `BranchId.make`. Type the return as `Promise<Feed.BranchId>` and the `at` string arm as `Feed.BlockId` so a swapped id is caught by the compiler (rule `prefer-branded-types-over-raw-primitives`).

# WARN c7c09230-16 construct-populated-dont-mutate-after `packages/core/echo/echo/src/Feed.test.ts:270:9`

The `read` helper creates each item with `Obj.make(TestSchema.Task, { title })` and then immediately fills its `@meta.keys` through a follow-up `Obj.update`. `Obj.make` already accepts the initial keys (`[Obj.Meta]: { keys: [...] }`, as `materialize.test.ts` does), so build the keys array from the stamp first and pass it into the `Obj.make` call, per `construct-populated-dont-mutate-after`.

# WARN c7c09230-17 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/Feed.test.ts:287`

`branchId` is a describe-local arrow whose whole body is one call to the public `Feed.BranchId.make`, used at five call sites in the `readBranch` tests. It renames the API under test and hides it from the assertion. Inline `Feed.BranchId.make('3@a')` at each call site and delete the helper (rule `no-trivial-wrappers-over-official-apis`).

# WARN c7c09230-18 setter-must-not-own-transaction `packages/core/echo/echo/src/Feed.ts:586:7`

`setBranchKey` is a property-setting helper that opens its own `internal.change(item, ...)` transaction to write the branch key. Per the rule, a setter should mutate an already-open draft so a caller can batch it with other field writes; `append` calls it once per item (line 360) alongside `setParent`, costing one transaction per field. Make the helper take the open `mutable` draft and have the caller wrap the writes in a single `change`.

# WARN c7c09230-19 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Feed.ts:651`

`fork` is an arrow function whose whole body is `Effect.gen(function* () {...})`. Per `effect-fn-not-hand-wrapped-gen`, define it with `Effect.fn('Feed.fork')(function* (feed, items, options) {...})` (a named span) instead of hand-wrapping `Effect.gen`.

# WARN c7c09230-20 change-behavior-inside-existing-api `packages/core/echo/echo/src/Feed.ts:738:14`

`Feed.walk` is a sibling of `Feed.query` that only builds a query with `Scope.feed(uri, { walk })`, as its own doc says ("a wrapper of the walk query"). `Feed.query` already gained an options argument in this PR; take `walk` there (the caller passes `Query.select(...).orderBy().limit()`) instead of adding a second entry point that callers must choose between (rule `change-behavior-inside-existing-api`).

# WARN c7c09230-21 collapse-branches-via-identity-element `packages/core/echo/echo/src/internal/Query/pretty.ts:170`

The feed-scope case branches on `scope.branches !== undefined` and returns two templates that are identical except for the `, branches: ...` piece. Collapse them into one template that interpolates the optional piece, using the empty string as the identity element (rule `collapse-branches-via-identity-element`), as `Scope.feed` already does with `{}` spreads.

# WARN c7c09230-22 prefer-branded-types-over-raw-primitives `packages/core/echo/echo/src/Scope.ts:57:3`

`FeedScopeOptions.branches` and `walk.branch` (line 64) are typed `string | null` for branch ids, but the same package exports the branded `Feed.BranchId`, which `Feed.ts` already uses for its own `branch` options. Use `ReadonlyArray<Feed.BranchId | null>` and `branch?: Feed.BranchId | null` (type-only import) so unrelated strings are not accepted as branch ids.

# WARN c7c09230-23 one-test-suite-per-module `packages/core/echo/feed/src/feed-branches.test.ts:43:1`

This new file tests `FeedStore` (`feed-store.ts`), whose tests already live in `feed-store.test.ts`. Fold the `FeedStore branches` suite into that file as a nested `describe` (rule `one-test-suite-per-module`).

# WARN c7c09230-24 effect-fn-not-hand-wrapped-gen `packages/core/echo/feed/src/feed-store.ts:1191`

`walk` is `(request) => Effect.gen({ self: this }, function* () {...})`. Per `effect-fn-not-hand-wrapped-gen`, use `Effect.fn('FeedStore.walk')` (or `Effect.fnUntraced`) with a generator body instead of a hand-wrapped `Effect.gen`.

# WARN c7c09230-25 effect-fn-not-hand-wrapped-gen `packages/core/echo/feed/src/feed-store.ts:1289`

`#findPredecessor` is an arrow whose body is only `Effect.gen(function* () {...})`. Per `effect-fn-not-hand-wrapped-gen`, define it with `Effect.fnUntraced(function* (feedPrivateId, block) {...})`.

# WARN c7c09230-26 effect-fn-not-hand-wrapped-gen `packages/core/echo/feed/src/feed-store.ts:1311`

`#noteBranchHead` is an arrow whose body is only `Effect.gen(function* () {...})`. Per `effect-fn-not-hand-wrapped-gen`, define it with `Effect.fnUntraced(function* (...) {...})`.

# WARN c7c09230-27 state-owned-once `packages/core/echo/feed/src/feed-store.ts:1311:3`

`#noteBranchHead` keeps `headInsertionId`/`headSequence`/`headActorId` on every `branches` row up to date on each insert, but nothing reads them: `appendLocal` re-derives the head with a `SELECT ... FROM blocks WHERE branch IS ... ORDER BY insertionId DESC LIMIT 1`, and `walk` uses only the base and fork columns. This is a hand-synchronised denormalisation of data `blocks` already owns. Drop the head columns (and the upsert's update arm) until a reader needs them, or make `appendLocal` read the head from `branches` so the copy has a single consumer (the rule: derive rather than denormalise).

# WARN c7c09230-28 no-impossible-state-handling `packages/core/echo/feed/src/feed-store.ts:1946:14`

`LocalAppendMessage` has `branch` and `forkAt` as sibling optionals where the doc admits `branch` is "Ignored with `forkAt`", so the type permits a state the code never honours, and `appendLocal` must branch on `forkAt !== undefined` first. Model it as a union (`{ forkAt: string } | { branch?: string | null }`) so the impossible combination cannot be written (the rule: use a tagged union for kind-varying data).

# WARN c7c09230-29 minimal-precise-tests `packages/core/echo/index-core/src/indexes/entity-meta-index.test.ts:948:3`

One test asserts seven separate behaviors: branch indexing, a branch filter applied before the limit, a main-branch type query, a two-branch window, an empty branch list, tombstone branch retention and `selectFeedBranchRecordIds` pruning. A failure does not say which is broken. Split into one small test per behavior with a shared `makeItem` helper (rule `minimal-precise-tests`).

# WARN c7c09230-30 effect-fn-not-hand-wrapped-gen `packages/core/echo/index-core/src/indexes/entity-meta-index.ts:910`

`selectFeedBranchRecordIds` passes `Effect.fn(...)` an arrow that returns `Effect.gen({ self: this }, ...)`, which keeps the hand-wrap `Effect.fn` exists to remove. Per `effect-fn-not-hand-wrapped-gen`, give `Effect.fn('EntityMetaIndex.selectFeedBranchRecordIds')` the generator directly (`function* (this: EntityMetaIndex, query) {...}`).

# WARN c7c09230-31 minimal-precise-tests `packages/plugins/plugin-code/src/components/SpecModel/questions.test.ts:86:3`

The `the feeds spec` test parses a living spec file that its own comment says keeps changing, then asserts through a hand-traced condition (`firstSettled === -1 ? [] : statuses.slice(firstSettled)` with `not.toContain('open')`). The existing inline-SPEC tests already pin the parser, so this adds a branching, unstable test that guards nothing specific (rule `minimal-precise-tests`). Drop it, or replace it with one direct `expect` on a fixed input.

# WARN c7c09230-32 one-name-one-export-per-concept `packages/plugins/plugin-code/src/components/SpecModel/questions.ts:12`

`QUESTION_STATUSES` (open, answered, moot) is defined here and again as a `Set` in `packages/reflect/deus/src/extension/check.ts`, and the two can drift. Export it once from the owning module in `@dxos/deus` (the lint and `lang/question.mdl` live there) and reuse it here (rule `one-name-one-export-per-concept`).

# WARN c7c09230-33 reuse-existing-mechanism `packages/plugins/plugin-code/src/components/SpecModel/questions.ts:56:7`

The `list` helper (inline `[a, b]`, wrapped, or `- a` items) and the `prose` join are copied from the verdict parser in `review.ts` (`list` at line 127 and the `note` join), so two parsers of the same `.mdl` field shapes must now be kept in step by hand. Extract one shared field-list/prose helper next to `parseFields` in `spec-model.ts` and call it from both (the rule: extend the existing mechanism rather than add a parallel one).

# WARN c7c09230-34 no-unused-new-api `packages/plugins/plugin-code/src/containers/SpecArticle/useGitHubText.ts:29`

`gitHubRawUrl` and `fetchGitHubText` are exported only so `useGitHubText.test.ts` can call them; the only non-test caller is `useGitHubText` in the same module. Keep them private and test through the hook, or the exported pieces the app uses (rule `no-unused-new-api`).

## Appendix

### Dismissed

- c7c09230-11: `EchoFeedCodec.blockId` is on `main` already; this PR only made it call `FeedProtocol.formatBlockId`. Removing it would change call sites outside this PR's purpose.
- c7c09230-20: `Feed.walk` stays as the convenience form of the core walk query, as agreed in FEEDS.mdl D-57; the docs and tests show the core form first.
- c7c09230-34: `gitHubRawUrl` and `fetchGitHubText` are reachable only from their module and its test (the package exports only `SpecArticle`), so they are not public API; testing them directly avoids rendering the hook.
