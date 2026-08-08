# @dxos/plugin-connector

## 0.12.0

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [557e243]
- Updated dependencies [7c426d4]
- Updated dependencies [678ba58]
- Updated dependencies [0280a6a]
  - @dxos/app-framework@1.0.0
  - @dxos/app-toolkit@1.0.0
  - @dxos/echo@1.0.0
  - @dxos/react-ui@1.0.0
  - @dxos/compute@1.0.0
  - @dxos/plugin-space@0.12.0
  - @dxos/client@1.0.0
  - @dxos/cli-util@1.0.0
  - @dxos/plugin-client@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/plugin-routine@0.12.0
  - @dxos/edge-compute@1.0.0
  - @dxos/link@1.0.0
  - @dxos/echo-react@1.0.0
  - @dxos/react-client@1.0.0
  - @dxos/schema@1.0.0
  - @dxos/react-ui-form@1.0.0
  - @dxos/react-ui-list@1.0.0
  - @dxos/edge-client@1.0.0
  - @dxos/context@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/errors@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/node-std@1.0.0
  - @dxos/protocols@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/cli-util@0.11.1
- @dxos/client@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/context@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/edge-compute@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/pipeline@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/schema@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-routine@0.11.1
- @dxos/plugin-space@0.11.1

## 0.11.0

### Minor Changes

- 68e61ca: Drive connector-auth ("Connect X") toolbar actions from a `ConnectorAuthAnnotation` schema annotation, resolved by a single app-graph extension in plugin-connector — replacing the per-plugin `connectorAuthExtension` helper (removed). Owning plugins inline their own sync/generate toolbar actions. Adds `actionGroups` to `GraphBuilder.createExtension`/`createTypeExtension` and a `primary` menu-action variant.
- a49131a: Introduce `@dxos/link`, a low-level infrastructure package holding a unified `Cursor` ECHO type (`org.dxos.type.cursor` 0.2.0), the relocated `AccessToken` type, and the durable-progress sync machinery. `Cursor` replaces `@dxos/plugin-connector`'s `SyncBinding` relation with a flat object whose discriminated `spec` covers both external-source sync (Gmail, Trello, GitHub, Linear, Slack, Discord, Bluesky) and internal feed-to-feed processing (e.g. mailbox fact extraction), so progress now persists across reloads for both. `Connection`/`Connector` stay in `@dxos/plugin-connector` and correlate to a `Cursor` via their shared `AccessToken` rather than a direct relation. This is a breaking change: existing `SyncBinding` relations and `Cursor` 0.1.0 objects are not migrated and are abandoned on upgrade — external syncs re-bind and feed-to-feed analysis restarts from the beginning.

### Patch Changes

- 9da013f: New package `@dxos/echo-panproto`: declarative, JSON-serializable lenses (`Panproto.Lens`) between ECHO objects and foreign wire records, executed by a runner (`Panproto.encode`/`decode`) rather than expressed as closures.

  Annotation-driven publishing of ECHO objects to the AT Protocol. `@dxos/schema` gains `AtprotoRecordAnnotation` (type-level: target collection, record-key strategy, and a declarative serializable lens) and `AtprotoVisibilityAnnotation` (field-level, private by default — a field is published only when explicitly marked), so a generic companion can discover and publish any annotated type without knowing the type itself.

  `MasterDetail` moves from plugin-routine into `@dxos/react-ui-list` as a reusable primitive: a selectable master list above a detail slot, nestable by placing another `MasterDetail` in `detail`. Per-row overflow menus are driven by `useMenuBuilder` from `@dxos/react-ui-menu`.

  `ComboboxField` now shows the selected option's label rather than the stored value, which is often an opaque id the user never chose to see.

- c3625d3: Group a connector's sync surface into a nested `sync` field (`operation`, `getTargets`, `materializeTarget`, `optionsSchema`) with an optional `trigger` spec and an `auto` flag. A connector that declares a trigger spec is synced by force-running its binding's Routine trigger — on demand as well as on schedule, so both share the dispatcher's durable execution — and one that declares `auto` syncs as soon as a binding is created.
- e0e1a9f: Supporting changes for the new plugin-blogger / plugin-typefully feature:
  - **@dxos/plugin-connector**: expose `Connection` types via a new `./types` export subpath so provider plugins can consume the connection contract without pulling the full package barrel.
  - **@dxos/react-ui**: `Card.Root` now accepts and forwards `onKeyDown`, enabling keyboard-interactive cards (Enter/Space activation) without a cast.

- 6d2afe0: Move `DraftMessage` out of `@dxos/plugin-inbox` into `@dxos/types`, and move the generic email-sync pipeline stages (excluding the `SyncBinding`-coupled `toCommitUnit`) out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, so these can be reused without depending on a full app-framework plugin. `Connection` and `SyncBinding` remain in `@dxos/plugin-connector`; `toCommitUnit` and `factsCommit` (both coupled to `SyncBinding`) live in `@dxos/plugin-inbox`.
- 0d1f866: Fix rebinding a target (e.g. a Mailbox) to an existing connection not renaming it after the connection's account, and fix the newly-created cursor for a target materialized alongside a brand-new connection not being immediately visible to the sync trigger UI.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [1a9bca1]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [d79482a]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [277e365]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [cd3ed11]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [a83d98a]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/link@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/edge-compute@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
