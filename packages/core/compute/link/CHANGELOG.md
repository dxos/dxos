# @dxos/link

## 0.12.0

### Minor Changes

- 592b00e: Mailbox tags now sync **back** to the provider. Starring a message or archiving it (the `inbox` tag
  coming off) reaches Gmail on the next sync, where previously it stayed local and a later sync undid
  it.

  Reconciliation is a three-way merge whose base is the tag index's Automerge heads — recovered with
  `Obj.getVersion` rather than stored as a shadow copy — so no mutation site changes and a crash
  re-derives the same diff instead of diverging. `Cursor.spec` gains `tagHeads`, written together with
  the delta token through the new `Cursor.writeSyncState`; the two describe the same position, and
  advancing one without the other would leave a run diffing a fresh delta against a stale base.

  Which tags participate is the provider's label map inverted, so a user tag is never pushed as a new
  provider label. Gmail's `SPAM` is now mapped onto the canonical `spam` tag in both directions, so its
  spam verdict and `ClassifyMailbox`'s resolve to one tag rather than two parallel notions of junk.
  `TRASH` remains unmapped — deletion is not a tag.

  `MailSyncProviderService` gains an optional `pushTags`, so a provider with no write path (JMAP today)
  degrades to pull-only rather than failing. It reports per-op outcomes: a permanent rejection settles,
  since no retry can help and refusing to advance would block the base forever, while a transient one
  stays pending and holds the base back so the change is retried on a later run.

### Patch Changes

- 6328de3: A mailbox or calendar now always offers exactly one of Connect or Sync, and keeps its sync progress across a disconnect. Deleting a connection leaves its bindings dormant — the cursors are kept rather than deleted with it — so the object offers Connect again; re-connecting the same account resumes where it left off, while connecting an account the object does not already sync is refused rather than merged into it. Connect is disabled when no provider is registered for the type, Sync is disabled when a bound object's provider plugin is absent, and a disabled toolbar dropdown no longer opens an empty menu. A toolbar action or dropdown that starts out disabled now re-enables once the state that disabled it clears, instead of staying greyed out for the rest of the session. Message summaries also appear as soon as they are derived: the mailbox's annotation feed is provisioned lazily, and the article did not subscribe to that reference, so the conversation summary stayed missing until the view was reopened.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [dfce73e]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/pipeline@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/echo@0.11.1
- @dxos/invariant@0.11.1
- @dxos/pipeline@0.11.1
- @dxos/schema@0.11.1

## 0.11.0

### Minor Changes

- 48d168e: Gmail and JMAP sync are now always bidirectional and durably resumable: the sync cursor tracks a `max`/`min` watermark pair (replacing `value`), each run syncs new mail forward and continues backfilling backward in the same pass, and a per-run message cap requests a durable re-run via `Operation.runAgain()` instead of looping in-process. The sync operations now take only the binding — the `direction`/`after`/`before` inputs are removed. Breaking: the `Cursor` schema field `value` becomes the `max`/`min` pair, `Cursor.resolveWindow` is replaced by `Cursor.resolveHorizon`/`Cursor.resolveWindows`, `Cursor.dedupStage` drops its `direction` option, and `Cursor.advance`/`Cursor.parseKey`/`Cursor.formatKey` operate on `max` instead of `value`.
- 2543b63: Mail sync is now incremental and provider system state maps onto shared canonical tags.

  Incremental delta-resume: the sync cursor carries an opaque provider delta token (Gmail `historyId`, JMAP `Email/get` state). After the initial window backfill, each run fetches only the delta since the token (Gmail `history.list` — paginated so multi-page deltas are not dropped; JMAP `Email/changes`), applying additions plus label/flag reconciliation to already-committed feed messages via objectless commit units. A stale token falls back to the window scan and recaptures; the token advances only after the run's merged stream fully drains, so a crash re-fetches the delta idempotently.

  Unified system tags: Gmail system labels, JMAP mailbox roles, and the JMAP `$flagged` keyword now resolve to a shared, provider-agnostic tag registry (`org.dxos.tag`: starred / inbox / important / sent / and the Gmail categories) instead of provider-scoped tags — so a Gmail star, a JMAP flag, and a locally-toggled star are the same tag. Read-state, drafts, trash, spam, and archive are intentionally not tagged (archive is derived as "not in inbox"). The starred tag's foreign key moves from `org.dxos.org` to `org.dxos.tag`; existing locally-starred items under the old key are not migrated.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/invariant@0.11.0
