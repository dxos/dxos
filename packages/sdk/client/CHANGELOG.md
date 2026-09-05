# @dxos/client

## 0.12.0

### Minor Changes

- 881f900: The agent debug port can now survive a reload of the tab it was authorized in. `start({ persist: true })` records the session in `sessionStorage`, and `resume()` restarts the loop under the same id, so an agent's session id keeps working across a navigation the user did not intend to end it — an OAuth redirect above all, which previously stranded the investigation exactly when the interesting state appeared.

  Deliberately narrow: `sessionStorage`, not `localStorage`, so an arbitrary-eval port cannot outlive its tab; a 30-minute expiry so a forgotten port lapses on its own; `resume()` never mints a session, so mounting the devtools hook cannot switch the port on; and stopping clears the record.

- a74e9b0: **Breaking:** `Invitation` and `QueryInvitationsResponse` are now the buf-generated types. `InvitationsService` carries them over `bufMessage`, which matches the previous wire format byte-for-byte apart from proto3 default values that protobuf.js wrote explicitly, so invitation codes stay interchangeable across the change.

  Consumers of `@dxos/client/invitations` and `@dxos/react-client/invitations`:

  - Nested enums are flattened: `Invitation.State.SUCCESS` becomes `Invitation_State.SUCCESS`, and likewise for `Type`, `Kind` and `AuthMethod`. The enum values are unchanged.
  - `Invitation` is now a type; construct one with `create(InvitationSchema, { ... })` from `@bufbuild/protobuf`.
  - Key fields (`spaceKey`, `swarmKey`, `identityKey`, `delegationCredentialId`) are `dxos.keys.PublicKey` messages rather than the `PublicKey` class. Read one with `PublicKey.from(key.data)`; the `useInvitationStatus` hook still reports the class.
  - `created` is a `google.protobuf.Timestamp` rather than a `Date`.

- 0280a6a: Cut app startup cost by loading feature code on demand rather than at boot.

  Activation: the coarse `DeferredStartup` event is replaced by per-plugin start events (`<pluginKey>.event.start`, built with `ActivationEvent.pluginStart`). A plugin's own start event now fires when one of its modules contributes a `ReactSurface` — the feature being rendered is the demand signal — so an unvisited feature's contributions never load. Contributions no surface can gate ride the feature they belong to instead: app-graph builders default to the graph plugin's start event, skill definitions to the assistant's, and cross-plugin contributions (markdown extensions, connectors, game variants) to the consuming plugin's. React surfaces activate on their declared roles.

  Client: initialization can run forked off app startup. `Client.waitUntilInitialized()` exposes a stable completion signal, `useClient` suspends until it resolves, `ClientProvider` gains a `suspend` mode that provides context immediately instead of rendering the fallback subtree-wide, and the HALO adapters are construction-safe over an uninitialized client.

  Bundle: `runDedicatedWorker` moves to `@dxos/client/worker` so the worker-side service runtime (client-services, sqlite, hypercore) is no longer statically reachable from main-thread bundles; the in-process host (`fromHost`) and the RTC ice provider load on demand. A new engine-free `@dxos/compute-hyperformula/types` subpath lets schema and operation definitions use cell-address helpers without loading HyperFormula.

  Breaking: `ActivationEvents.DeferredStartup` and `ActivationEvents.SkillsRequested` are removed; worker entrypoints importing `runDedicatedWorker` from the root must import it from `@dxos/client/worker`; and a plugin's React surface must declare the roles it serves to be activated.

### Patch Changes

- 86d1482: Let a dev server start the agent debug port on a known session, and let plugins contribute
  slash-menu commands to the markdown editor.

  `DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
  copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
  names an Operation (not a callback), and contributions are grouped by the contributing plugin.

  Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
  It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.

- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [c01fef6]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [2c5aaf0]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [ca4429a]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [df93cc2]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [631ade3]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [461ce1e]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/client-services@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/util@0.12.0
  - @dxos/worker-framework@0.12.0
  - @dxos/messaging@0.12.0
  - @dxos/network-manager@0.12.0
  - @dxos/rpc@0.12.0
  - @dxos/websocket-rpc@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/timeframe@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/blob@0.12.0
  - @dxos/rpc-tunnel@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/client-services@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-host@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/kv-store@0.11.1
- @dxos/log@0.11.1
- @dxos/messaging@0.11.1
- @dxos/network-manager@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/random-access-storage@0.11.1
- @dxos/rpc@0.11.1
- @dxos/rpc-tunnel@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/timeframe@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1
- @dxos/websocket-rpc@0.11.1
- @dxos/worker-framework@0.11.1

## 0.11.0

### Minor Changes

- 856c4f0: Remove the legacy SharedWorker client-services path. The `@dxos/client/worker` and `@dxos/react-client/worker` subpath exports, the `createWorker` client option, and `ServicesMode.SHARED_WORKER` support are gone; use the dedicated-worker mode (`createDedicatedWorker`) instead. The `SHARED_WORKER` proto enum values are retained but deprecated for wire compatibility.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- eec72c5: Fix comment author attribution and reset-device reload. `useIdentity` now seeds its atom with the service's synchronous snapshot so the current identity is available on the first render instead of a transient `undefined` — a comment sent in that window was stamped with an empty sender and never matched its author, hiding the edit affordance. During `client.reset()` the worker-reconnect handler now reloads to the origin (fresh boot) rather than the stale current route, and `Client.resetting` exposes that state. SQLite hypercore storage drains in-flight writes on `close()` so a save racing reset teardown can't stall or reject against a torn-down connection.
- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 410a019: Restore the iframe shell (`shell='./shell.html'`) client-services connection after the effect-rpc migration. The app now re-serves its services to the shell over effect-rpc (matching the shell's `ClientServicesProxy` consumer) instead of the removed protobuf peer, and the shell provides its parent origin upfront so the effect-rpc client can initiate the connection without deadlocking. Fixes apps that embed the external shell iframe hanging on startup.
- d547045: Use the WebRTC transport for bun as well as node: bump node-datachannel to 0.32.3 (the 0.30.0 darwin-arm64 binary crashed under both runtimes) and remove the obsolete bun memory-transport guard. CLI `halo share` prints the joinable URL and validates `--host` as an absolute URL.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [b3a3fcf]
- Updated dependencies [4bb7e3b]
- Updated dependencies [da66270]
- Updated dependencies [41141d8]
- Updated dependencies [da66270]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/websocket-rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
