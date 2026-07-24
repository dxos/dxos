# @dxos/echo

## 0.11.0

### Minor Changes

- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- 46ec569: Add ECHO-core per-object time travel and subtree branching: `setTimeTravel`/`clearTimeTravel` pin a live object to a historical version (writes throw, `latestOnly` subscribers stay live), `createBranch`/`switchBranch`/`mergeBranch`/`deleteBranch` fork an object subtree into writable CRDT branches with shared history and true merge-back, and `db.branch()` returns caller-owned writable per-surface branch bindings.
- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.

### Patch Changes

- 46ec569: Remap branch-registry document urls when a space is imported or copied (branch documents live outside `links`, so they were previously left pointing at the source space), and resolve a ref atom to `undefined` on its initial read when the target is already deleted (previously only handled on later updates).
- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- 923d5be: Auto-create a recurring sync Routine when a mailbox or calendar is bound to a connection (new connection, multi-target selection, or reusing an existing connection); the toolbar "Sync" action force-runs it and disables while a sync is already in progress. Fixes a legacy-DXN compatibility gap in `refToEffectSchema` and a bug where cancelling a Gmail sync left its progress monitor stuck at "running".
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 12fd785: Fix memoized language model dynamic-value remapping: collect tokens over the normalized prompt so timestamp metadata cannot shift positional ids, and preserve per-pattern regex flags so uppercase-hex UUIDs match.
- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [6a03a30]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
