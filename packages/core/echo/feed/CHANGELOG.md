# @dxos/feed

## 0.12.0

### Minor Changes

- 34e4fb7: Add optional at-rest encryption for feed blocks. `FeedStore` accepts a `Cypher` that decides per feed whether to seal block payloads and provides encrypt/decrypt; without one, blocks are stored as plaintext (no encryption by default). Blocks gain `encryptionKeyId` + `iv` envelope fields, and a reference `WebCryptoCypher` (AES-256-GCM) ships for the browser, Node, and Cloudflare Workers.

### Patch Changes

- 707fd04: Feed sync heals a namespace whose server lost acknowledged positions: the positions the server re-issues are adopted, the namespace is replayed and the displaced blocks are pushed again, instead of every push and pull of that namespace failing forever. A rollback is also caught once other clients have written the server back past this one's cursor: a held block arriving at a new position counts like a displacement, and every query response names the block the server holds at the requested position so a client holding a different one there replays too. The first server token a client sees is verified by re-fetching the block at its cursor rather than forcing a full re-sync, a failing pull backs off without taking the other spaces' polling schedule with it, a space the server reports deleted (`Error` reply coded `space_deleted`) is left out of sync until the next reconnect instead of timing out on every run, `Error` replies carry the request id so a failed request no longer waits out its timeout, and a reply carrying fewer positions than blocks fails the push instead of silently leaving the tail pending.
- c993432: `EchoHost.updateIndexes` now runs an index pass only when something it reads has changed since the last pass began: a saved document, new feed blocks, or an unfinished batch. A request that finds nothing pending waits for any pass in flight and returns. In production traces 99.6% of passes were such requests, each re-reading every space's feed cursor and every document's heads to index nothing, at a median of 89 ms of worker time.

  Requests are now attributed on the pass span: `rpc-update-indexes` for the client's `DataService.updateIndexes`, `feed-scoped-query` for a feed-scoped query opening, and `epoch` for epoch creation, instead of one label for all three.

  `FeedStore` keeps each space's cursor token in memory after its first read, since the token is written once and every poll validated it with a query.

- 0b2f04a: A document that is `ready` locally but whose heads disagree with a peer's is now resynced once per head pair, so a push that never landed gets retried instead of leaving the space's sync progress stuck. The repo-wide share-policy kick is throttled in proportion to the number of loaded documents, which stops a loop that re-probed every document every few seconds.

  `deleteSubductionRemoteHeads` (echo-host) deletes the Subduction `remote-heads` records a profile accumulated while edge came back under a new identity after every restart. They are sync bookkeeping that is re-learned on the next sync. When they outnumber the other rows, the chunk table is rebuilt in one transaction instead of deleting them row by row. It runs once on every profile's next open.

  `FeedStore` no longer scans the whole `blocks` table for every pulled block: evicting a block's position slot now uses two index searches instead of one `OR` that SQLite planned as a table scan, which kept the storage worker saturated during a large initial feed sync.

- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [6388838]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [7575cb6]
- Updated dependencies [23d2d8c]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [e56276b]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [3ea0b0f]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [df93cc2]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [f8bfba0]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [85e6347]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/context@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
