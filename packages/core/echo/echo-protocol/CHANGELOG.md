# @dxos/echo-protocol

## 0.17.0

### Patch Changes

- Updated dependencies [3aef671]
- Updated dependencies [ece15ab]
- Updated dependencies [768db81]
  - @dxos/keys@0.17.0
  - @dxos/protocols@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/crypto@0.17.0
  - @dxos/util@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- 4007fa2: Quarantine documents whose load runs out of memory instead of hanging the worker, rebuild them from the index, and retire them through the space directory so every peer wipes its copy. A peer never acts on an entry naming a document another space or a live link still uses. Sync cursors whose history has outgrown their state are retired the same way before they stop loading, and any document past 1M changes or ops logs an `oversized automerge document` warning.
- @dxos/crypto@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/util@0.16.0
  - @dxos/protocols@0.16.0

## 0.15.0

### Minor Changes

- d0728d8: `EscapedPropPath` and `referenceIndexKey` move from `@dxos/index-core` to `@dxos/echo-protocol`, and `QueryPlanner` no longer compiles plans to SQL: its `executor` and `sql` options are gone, `QueryExecutor` compiles under the `sql` executor, and `QueryExecutorMode` is no longer exported from `@dxos/echo-host/query` (it remains on the `@dxos/echo-host` root). An app that bundles the ECHO client no longer pulls `@dxos/index-core` or the SQL compiler into the tab.

### Patch Changes

- ce8f092: `QueryAST.visit` matches each node with a matcher built once rather than a `Match.value` pipeline built per call, which allocated every clause and its predicate on every node: ~45 KB per walk of a six-node query, against 312 B now. The client walks every live query three times on each result update; in Composer that was ~67 MiB of allocation in the first five minutes after boot.
- Updated dependencies [0420f87]
- Updated dependencies [ef9aea9]
- Updated dependencies [37edd53]
  - @dxos/protocols@0.15.0
  - @dxos/crypto@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [1819960]
  - @dxos/effect@0.14.0
  - @dxos/protocols@0.14.0
  - @dxos/crypto@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [cb1e218]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
  - @dxos/util@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/protocols@0.13.0
  - @dxos/crypto@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0

## 0.12.0

### Minor Changes

- 4ececc6: Projects and chat sessions can be archived. An archived object leaves the navigation tree but stays
  listed in the space's Database section, where its card shows an "Archived" badge and an Unarchive
  action. Types opt in with `ArchivableAnnotation`; the archive state is `ArchivedAnnotation` in the
  object's meta. `Filter.annotation(annotation)` matches entities carrying any meta annotation, and
  `Filter.annotation(annotation, value)` those whose scalar value is equal, in memory and in SQL.
- f8bfba0: Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

  Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
  Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
  in, and then a new space takes its id from an immutable root document rather than from the space
  key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
  document, and a legacy space is migrated onto a root when it loads, keeping its id.
  `SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
  admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.

### Patch Changes

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
- Updated dependencies [23d2d8c]
- Updated dependencies [472ca95]
- Updated dependencies [e56276b]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [3ea0b0f]
- Updated dependencies [9d2466a]
- Updated dependencies [b1bb838]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [85e6347]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/util@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/crypto@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/protocols@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/invariant@0.11.0
