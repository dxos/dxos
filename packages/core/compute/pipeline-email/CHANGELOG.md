# @dxos/pipeline-email

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

- fa36e26: Add a cursored, resettable ProcessMailbox pipeline with a start/stop mailbox toolbar action, sync-style progress, and a routine template; AnalyzeMailbox now reports progress, no longer adopts other consumers' feed cursors, and fact extraction processes unordered feeds oldest-first so the cursor cannot skip unprocessed messages.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [592b00e]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [9c86066]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [3e02201]
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
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [dfce73e]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [5d816a6]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/link@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/extractor-lib@0.12.0
  - @dxos/pipeline@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/extractor@0.12.0
  - @dxos/pipeline-rdf@0.12.0
  - @dxos/log@0.12.0
  - @dxos/markdown@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/extractor@0.11.1
- @dxos/extractor-lib@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/markdown@0.11.1
- @dxos/node-std@0.11.1
- @dxos/pipeline@0.11.1
- @dxos/pipeline-rdf@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [48d168e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [2543b63]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [0a4bbde]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/link@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/extractor@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/extractor-lib@0.11.0
  - @dxos/pipeline-rdf@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/markdown@0.11.0
  - @dxos/node-std@0.11.0
