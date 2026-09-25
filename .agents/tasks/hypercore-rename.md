# Task: rename hypercore-related `feed` naming to `hypercore`

## Goal

Two green PRs (`dxos/dxos` + `dxos/edge`) that rename the hypercore-specific
`feed` naming to `hypercore`, so that the name `feed` is left to the newer,
unrelated ECHO feed concept (`packages/core/echo/feed`,
`packages/core/echo/echo-client/src/feed`, `@dxos/react-ui-feed`, …).

## Constraints

1. Rename only what is genuinely hypercore-related.
2. **No change to stored data or wire protocol.** In particular:
   - no protobuf/buf message, field or service renames (`dxos/echo/feed.proto`,
     `@dxos/protocols/feed-replication`, halo credential assertions);
   - no Durable Object class names, wrangler bindings, or DO storage keys;
   - no storage directory names, file names on disk, or persisted key strings;
   - serialized property names (e.g. `feedKey`) stay as they are.

## In scope

### dxos/dxos

- `packages/common/feed-store` → `packages/common/hypercore-store`
  (`@dxos/feed-store` → `@dxos/hypercore-store`), including file names and every
  exported symbol (`FeedStore` → `HypercoreStore`, `FeedWrapper` →
  `HypercoreWrapper`, …).
- `packages/common/hypercore`: `HypercoreFactory` → `RawHypercoreFactory`, to
  free the unqualified name for the store-level factory.
- Every call site in the repo updated; no compatibility re-exports.

### dxos/edge

- `packages/sdk/edge-feed` → `packages/sdk/edge-hypercore`
  (`@dxos/edge-feed` → `@dxos/edge-hypercore`), a private package explicitly
  described as a re-implementation of hypercore, plus its exported symbols.
- Import updates in consumers only — `db-service`'s `FeedReplicator` DO, its
  module layout and its storage keys are deployment/stored state and stay.

## Out of scope

- Renaming the ECHO feed concept or anything derived from proto.
- The `@dxos/*` catalog bump in edge that will be needed once the dxos rename
  lands; edge builds against the currently pinned `pkg.pr.new` build.
