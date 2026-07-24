# @dxos/link

## 0.11.0

### Minor Changes

- 48d168e: Gmail and JMAP sync are now always bidirectional and durably resumable: the sync cursor tracks a `max`/`min` watermark pair (replacing `value`), each run syncs new mail forward and continues backfilling backward in the same pass, and a per-run message cap requests a durable re-run via `Operation.runAgain()` instead of looping in-process. The sync operations now take only the binding — the `direction`/`after`/`before` inputs are removed. Breaking: the `Cursor` schema field `value` becomes the `max`/`min` pair, `Cursor.resolveWindow` is replaced by `Cursor.resolveHorizon`/`Cursor.resolveWindows`, `Cursor.dedupStage` drops its `direction` option, and `Cursor.advance`/`Cursor.parseKey`/`Cursor.formatKey` operate on `max` instead of `value`.
- 2543b63: Mail sync is now incremental and provider system state maps onto shared canonical tags.

  Incremental delta-resume: the sync cursor carries an opaque provider delta token (Gmail `historyId`, JMAP `Email/get` state). After the initial window backfill, each run fetches only the delta since the token (Gmail `history.list` — paginated so multi-page deltas are not dropped; JMAP `Email/changes`), applying additions plus label/flag reconciliation to already-committed feed messages via objectless commit units. A stale token falls back to the window scan and recaptures; the token advances only after the run's merged stream fully drains, so a crash re-fetches the delta idempotently.

  Unified system tags: Gmail system labels, JMAP mailbox roles, and the JMAP `$flagged` keyword now resolve to a shared, provider-agnostic tag registry (`org.dxos.tag`: starred / inbox / important / sent / and the Gmail categories) instead of provider-scoped tags — so a Gmail star, a JMAP flag, and a locally-toggled star are the same tag. Read-state, drafts, trash, spam, and archive are intentionally not tagged (archive is derived as "not in inbox"). The starred tag's foreign key moves from `org.dxos.org` to `org.dxos.tag`; existing locally-starred items under the old key are not migrated.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [46ec569]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [96109be]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/invariant@0.11.0
