# @dxos/client-protocol

## 0.12.0

### Minor Changes

- 4e417e9: Delete the protobuf `service {}` definitions for `ContactsService`, `EdgeAgentService`,
  `DevicesService`, `NetworkService`, `InvitationsService`, `IdentityService`, `SystemService`,
  `LoggingService`, `FeedService`, and `QueryService` from `dxos/client/services.proto`,
  `dxos/client/logging.proto`, `dxos/client/feed.proto` (file removed entirely), and
  `dxos/echo/query.proto`, now that all ten are served entirely over `@effect/rpc`. Message
  types still shared outside the RPC boundary (`ContactBook`, `QueryEdgeStatusResponse`,
  `QueryAgentStatusResponse`, `Device`, `Invitation`, `Identity`, `NetworkStatus`, `Platform`,
  `LogEntry`, and the `QueryService` request/response types, among others) are unaffected and
  remain protobuf-encoded on the wire. Consumers that imported a generated proto service
  interface type for any of these ten services must use `@dxos/protocols/rpc`'s effect-rpc
  definitions instead. `@dxos/client-protocol`'s deprecated `ClientServices` map keeps its existing entries'
  signatures — each is now backed by a hand-written Promise/`Stream` interface with the same
  shape as before — except `ClientServices['ContactsService']`, which had no consumers and is
  removed.

### Patch Changes

- a069511: Move the identity, contacts, devices and spaces service RPCs to buf messages, and correct
  `ClientServices` to declare the buf shapes those methods actually carry. The credential subsystem
  keeps its protobuf.js shapes — the payloads cross the RPC boundary as their shared wire bytes — so
  `@dxos/client`'s public API is unchanged.
- 066b35d: Move the devtools snapshot/feed/metadata responses and the invitation device profile to buf
  messages, and correct `ClientServices` to declare the buf shapes those methods carry. `@dxos/echo-client`
  no longer depends on `@dxos/codec-protobuf`. Gossip stays on protobuf.js: announcements cross the network
  between peers, and the two codecs frame an `Any` payload differently.
- 5df602e: Move the wire enums (`EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, `ConnectionState`,
  `DeviceKind`, `DeviceType`) and the remaining `EchoMetadata` decode sites to buf. The enums
  `@dxos/client` re-exports (`SpaceState`, `DeviceKind`, `DeviceType`) are now the buf declarations:
  their members and values are unchanged, but TypeScript enums are nominal, so code comparing one of
  them against the same enum imported from `@dxos/protocols/proto/...` must import it from
  `@dxos/protocols/buf/...` instead.
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [7c87626]
- Updated dependencies [6388838]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [ea11703]
- Updated dependencies [dcf911b]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [915db6a]
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
- Updated dependencies [8ca2ac7]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [0ac2e5f]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [e1ee9dd]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [17ed864]
- Updated dependencies [b125655]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [4da1052]
- Updated dependencies [cc11297]
- Updated dependencies [461ce1e]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/worker-framework@0.12.0
  - @dxos/rpc@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/rpc-tunnel@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/credentials@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/rpc@0.11.1
- @dxos/rpc-tunnel@0.11.1
- @dxos/worker-framework@0.11.1

## 0.11.0

### Minor Changes

- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 962c8cd: Delete the redundant `dxos.iframe.WorkerService` protobuf service (and its `StartRequest` message) now that the tab→worker control channel is defined and served via effect-rpc (`WorkerService` in `@dxos/protocols/rpc`, over the app `MessagePort`). Also removes the now-unused `iframeServiceBundle` and `workerServiceBundle` exports from `@dxos/client-protocol` (they had no consumers). The `dxos.mesh.bridge.BridgeService` and `dxos.iframe.AppService`/`ShellService` protobuf definitions are retained — they are still used by the WebRTC transport bridge and the shell↔app iframe transport respectively.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
