# @dxos/plugin-client

## 0.11.0

### Minor Changes

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- a77e1a2: Force a full reload when the client reconnects to a newly-elected leader worker, as an interim fix for guest tabs breaking after the leader tab closes.
- eec72c5: Fix comment author attribution and reset-device reload. `useIdentity` now seeds its atom with the service's synchronous snapshot so the current identity is available on the first render instead of a transient `undefined` — a comment sent in that window was stamped with an empty sender and never matched its author, hiding the edit affordance. During `client.reset()` the worker-reconnect handler now reloads to the origin (fresh boot) rather than the stale current route, and `Client.resetting` exposes that state. SQLite hypercore storage drains in-flight writes on `close()` so a save racing reset teardown can't stall or reject against a torn-down connection.
- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-comments**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- 6439417: Publish the HALO Effect service packages (`@dxos/halo`, `@dxos/halo-adapter-client`, `@dxos/halo-react`) and begin migrating Composer/plugins off direct `@dxos/client` HALO access onto them: `plugin-client` now provides `Identity.Service` / `Space.Service` layer specs and wraps the app in `HaloProvider`.
- aea1e6e: Fix an uncaught `Space is not initialized` error thrown from the space replication-progress capability. The `client.spaces` subscription fires while a space is still initializing (on app load and during space creation), and the space name was read eagerly from `space.properties`, whose getter throws until the space is ready. The name is now read lazily per sync-state update and only once the space reaches `SPACE_READY`.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [eec72c5]
- Updated dependencies [1a9bca1]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [6439417]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [717edc0]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [14848a1]
- Updated dependencies [da66270]
- Updated dependencies [4df6cf3]
- Updated dependencies [41141d8]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/shell@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/halo-adapter-client@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/invariant@0.11.0
