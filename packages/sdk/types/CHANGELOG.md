# @dxos/types

## 0.11.0

### Minor Changes

- f0ec728: Promote `Topic` to a first-class domain type. `Topic` moves from `@dxos/pipeline-email` to `@dxos/types` as a Project-style class (inline title/label/icon annotations + `make` factory), keeping a shared `Topic.Props` struct and its `org.dxos.type.topic` DXN. The Topic detail view (`TopicArticle`) moves to `@dxos/plugin-brain` and renders via a regular object/article surface.

  Breaking: `Topic` / `TopicProps` are no longer exported from `@dxos/pipeline-email` — import from `@dxos/types` and use the namespace form (`Topic.Topic`, `Topic.Props`). No compatibility re-export is left behind.

- a49131a: Introduce `@dxos/link`, a low-level infrastructure package holding a unified `Cursor` ECHO type (`org.dxos.type.cursor` 0.2.0), the relocated `AccessToken` type, and the durable-progress sync machinery. `Cursor` replaces `@dxos/plugin-connector`'s `SyncBinding` relation with a flat object whose discriminated `spec` covers both external-source sync (Gmail, Trello, GitHub, Linear, Slack, Discord, Bluesky) and internal feed-to-feed processing (e.g. mailbox fact extraction), so progress now persists across reloads for both. `Connection`/`Connector` stay in `@dxos/plugin-connector` and correlate to a `Cursor` via their shared `AccessToken` rather than a direct relation. This is a breaking change: existing `SyncBinding` relations and `Cursor` 0.1.0 objects are not migrated and are abandoned on upgrade — external syncs re-bind and feed-to-feed analysis restarts from the beginning.

### Patch Changes

- 6d2afe0: Move `DraftMessage` out of `@dxos/plugin-inbox` into `@dxos/types`, and move the generic email-sync pipeline stages (excluding the `SyncBinding`-coupled `toCommitUnit`) out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, so these can be reused without depending on a full app-framework plugin. `Connection` and `SyncBinding` remain in `@dxos/plugin-connector`; `toCommitUnit` and `factsCommit` (both coupled to `SyncBinding`) live in `@dxos/plugin-inbox`.
- Updated dependencies [4e64123]
- Updated dependencies [48d168e]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2543b63]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [f15c632]
- Updated dependencies [96109be]
  - @dxos/echo@0.11.0
  - @dxos/link@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/log@0.11.0
  - @dxos/random@0.11.0
  - @dxos/invariant@0.11.0
