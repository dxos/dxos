# @dxos/plugin-connector

## 0.11.0

### Minor Changes

- 68e61ca: Drive connector-auth ("Connect X") toolbar actions from a `ConnectorAuthAnnotation` schema annotation, resolved by a single app-graph extension in plugin-connector — replacing the per-plugin `connectorAuthExtension` helper (removed). Owning plugins inline their own sync/generate toolbar actions. Adds `actionGroups` to `GraphBuilder.createExtension`/`createTypeExtension` and a `primary` menu-action variant.
- a49131a: Introduce `@dxos/link`, a low-level infrastructure package holding a unified `Cursor` ECHO type (`org.dxos.type.cursor` 0.2.0), the relocated `AccessToken` type, and the durable-progress sync machinery. `Cursor` replaces `@dxos/plugin-connector`'s `SyncBinding` relation with a flat object whose discriminated `spec` covers both external-source sync (Gmail, Trello, GitHub, Linear, Slack, Discord, Bluesky) and internal feed-to-feed processing (e.g. mailbox fact extraction), so progress now persists across reloads for both. `Connection`/`Connector` stay in `@dxos/plugin-connector` and correlate to a `Cursor` via their shared `AccessToken` rather than a direct relation. This is a breaking change: existing `SyncBinding` relations and `Cursor` 0.1.0 objects are not migrated and are abandoned on upgrade — external syncs re-bind and feed-to-feed analysis restarts from the beginning.

### Patch Changes

- e0e1a9f: Supporting changes for the new plugin-blogger / plugin-typefully feature:
  - **@dxos/plugin-connector**: expose `Connection` types via a new `./types` export subpath so provider plugins can consume the connection contract without pulling the full package barrel.
  - **@dxos/react-ui**: `Card.Root` now accepts and forwards `onKeyDown`, enabling keyboard-interactive cards (Enter/Space activation) without a cast.

- 6d2afe0: Move `DraftMessage` out of `@dxos/plugin-inbox` into `@dxos/types`, and move the generic email-sync pipeline stages (excluding the `SyncBinding`-coupled `toCommitUnit`) out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, so these can be reused without depending on a full app-framework plugin. `Connection` and `SyncBinding` remain in `@dxos/plugin-connector`; `toCommitUnit` and `factsCommit` (both coupled to `SyncBinding`) live in `@dxos/plugin-inbox`.
- 0d1f866: Fix rebinding a target (e.g. a Mailbox) to an existing connection not renaming it after the connection's account, and fix the newly-created cursor for a target materialized alongside a brand-new connection not being immediately visible to the sync trigger UI.
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [d79482a]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [6439417]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [aea1e6e]
- Updated dependencies [717edc0]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [4df6cf3]
- Updated dependencies [96109be]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
  - @dxos/echo@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/link@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/edge-compute@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
