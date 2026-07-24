# @dxos/client

## 0.11.0

### Minor Changes

- 856c4f0: Remove the legacy SharedWorker client-services path. The `@dxos/client/worker` and `@dxos/react-client/worker` subpath exports, the `createWorker` client option, and `ServicesMode.SHARED_WORKER` support are gone; use the dedicated-worker mode (`createDedicatedWorker`) instead. The `SHARED_WORKER` proto enum values are retained but deprecated for wire compatibility.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- eec72c5: Fix comment author attribution and reset-device reload. `useIdentity` now seeds its atom with the service's synchronous snapshot so the current identity is available on the first render instead of a transient `undefined` — a comment sent in that window was stamped with an empty sender and never matched its author, hiding the edit affordance. During `client.reset()` the worker-reconnect handler now reloads to the origin (fresh boot) rather than the stale current route, and `Client.resetting` exposes that state. SQLite hypercore storage drains in-flight writes on `close()` so a save racing reset teardown can't stall or reject against a torn-down connection.
- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 410a019: Restore the iframe shell (`shell='./shell.html'`) client-services connection after the effect-rpc migration. The app now re-serves its services to the shell over effect-rpc (matching the shell's `ClientServicesProxy` consumer) instead of the removed protobuf peer, and the shell provides its parent origin upfront so the effect-rpc client can initiate the connection without deadlocking. Fixes apps that embed the external shell iframe hanging on startup.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [b3a3fcf]
- Updated dependencies [da66270]
- Updated dependencies [41141d8]
- Updated dependencies [da66270]
- Updated dependencies [08a3eea]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/websocket-rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
