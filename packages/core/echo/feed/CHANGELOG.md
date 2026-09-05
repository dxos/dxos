# @dxos/feed

## 0.12.0

### Minor Changes

- 34e4fb7: Add optional at-rest encryption for feed blocks. `FeedStore` accepts a `Cypher` that decides per feed whether to seal block payloads and provides encrypt/decrypt; without one, blocks are stored as plaintext (no encryption by default). Blocks gain `encryptionKeyId` + `iv` envelope fields, and a reference `WebCryptoCypher` (AES-256-GCM) ships for the browser, Node, and Cloudflare Workers.

### Patch Changes

- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [7575cb6]
- Updated dependencies [23d2d8c]
- Updated dependencies [e56276b]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [df93cc2]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

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
