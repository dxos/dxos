# @dxos/client-protocol

## 0.11.0

### Minor Changes

- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 962c8cd: Delete the redundant `dxos.iframe.WorkerService` protobuf service (and its `StartRequest` message) now that the tab→worker control channel is defined and served via effect-rpc (`WorkerService` in `@dxos/protocols/rpc`, over the app `MessagePort`). Also removes the now-unused `iframeServiceBundle` and `workerServiceBundle` exports from `@dxos/client-protocol` (they had no consumers). The `dxos.mesh.bridge.BridgeService` and `dxos.iframe.AppService`/`ShellService` protobuf definitions are retained — they are still used by the WebRTC transport bridge and the shell↔app iframe transport respectively.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [08a3eea]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
