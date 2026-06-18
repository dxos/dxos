# Spec: Replace the RPC engine in `client-services` with `@effect/rpc`

Status: Draft · Owner: TBD · Branch: `claude/charming-euler-2qc9s1`

## 1. Summary

Replace the bespoke protobuf RPC engine (`@dxos/rpc` / `@dxos/codec-protobuf`) that powers
DXOS **client services** with [`@effect/rpc`](https://effect.website) (v0.75.1, already in the
pnpm catalog). The protobuf service definitions for client services (`dxos.client.services.*`,
plus the echo `DataService` / `QueryService` / `QueueService` and the deprecated `DevtoolsHost`)
are replaced with **Effect service definitions** (`RpcGroup` + `Rpc.make`) typed by **Effect
Schema**.

After this change, `@dxos/rpc` is **no longer used anywhere in the client-services path** (host,
worker, proxy, socket, agent). `@dxos/rpc` may remain temporarily for unrelated consumers
(teleport replicator protocols, bot-factory) but is removed from `@dxos/client`,
`@dxos/client-services`, and `@dxos/client-protocol`.

### Non-goals

- Migrating teleport/mesh replication protocols (`@dxos/rpc` over teleport muxer) — out of scope.
- Migrating the iframe `BridgeService` / `WorkerService` / shell protocols — these are separate
  bundles; they ride the same transports but are tracked as a follow-up (see §10).
- Changing the wire transports themselves (SharedWorker `MessagePort`, WebSocket, in-process).
  We bridge the existing byte-level transports into `@effect/rpc`, we do not replace them.

## 2. Background — current architecture

| Concern | Current implementation | File |
| --- | --- | --- |
| Service typing | Protobuf services (`dxos.client.services.*`) | `packages/core/protocols/src/proto/dxos/client/services.proto` |
| Service bundle | `clientServiceBundle = createServiceBundle<ClientServices>({...})` | `packages/sdk/client-protocol/src/service.ts` |
| Engine | `RpcPeer` framing Request/Response/Stream protobuf envelopes | `packages/core/mesh/rpc/src/rpc.ts` |
| Server | `ClientRpcServer` → `RpcPeer` with per-service `ServiceHandler` | `packages/sdk/client-services/src/packlets/services/client-rpc-server.ts` |
| Registry | `ServiceRegistry<ClientServices>` holds `{descriptors, services}` | `.../services/service-registry.ts` |
| Host wiring | `ClientServicesHost.open()` instantiates impls + registers them | `.../services/service-host.ts` |
| Client proxy | `ClientServicesProxy` → `createProtoRpcPeer({ requested: clientServiceBundle })`, exposes `.rpc` as `services` | `packages/sdk/client/src/services/service-proxy.ts` |
| Transport (byte port) | `RpcPort = { send(Uint8Array), subscribe(cb) }` | `packages/core/mesh/rpc/src/rpc.ts:50` |
| Worker transport | `createWorkerPort` (MessagePort), `createIFramePort` | `packages/core/mesh/rpc-tunnel/src/ports/*` |
| Socket transport | `WebsocketRpcClient` wraps a `WebSocket` into an `RpcPort` | `packages/core/mesh/websocket-rpc` |

### Consumer surface (must be understood before changing it)

Consumers call services as:

```ts
// unary
const space = await client.services.services.SpacesService.createSpace(req, { timeout });
// streaming (codec-protobuf Stream: .subscribe(cb, errCb) / .close())
const stream = client.services.services.SpacesService.querySpaces();
stream.subscribe(({ spaces }) => { ... });
streamSubscriptions.add(() => stream.close());
```

Inventory (from `packages/sdk/client/src`): ~22 unary call sites, ~8 streaming call sites,
~85 `.services.` references — concentrated in `space-list.ts`, `space-proxy.ts`, `halo-proxy.ts`,
`mesh-proxy.ts`, `client.ts`, plus `InvitationsProxy`. Streaming methods always re-emit a full
snapshot on (re)subscribe, and are torn down + re-established through `onReconnect()`.

Services to migrate (the `ClientServices` map):

`SystemService, NetworkService, LoggingService, IdentityService, InvitationsService,
DevicesService, SpacesService, ContactsService, EdgeAgentService` (defined in
`dxos.client.services`), plus `DataService` (`dxos.echo.service`), `QueryService`
(`dxos.echo.query`), `QueueService` (`dxos.client.services`), and the deprecated `DevtoolsHost`.

## 3. Target architecture

```
┌─────────────────────────── app / consumer ───────────────────────────┐
│  client.services.services.SpacesService.createSpace(req)              │
│  (legacy Promise/Stream surface, preserved by an adapter)             │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │  ClientServicesAdapter (Phase 1)
                                 ▼
                         RpcClient<ClientRpcs>            (effect/rpc)
                                 │  RpcClient.Protocol
                                 ▼
                    RpcPortClientProtocol(port)           (new bridge)
                                 │  Uint8Array via RpcPort
        ════════════════════════╪════════════════════════  transport (MessagePort / WS / in-proc)
                                 │
                    RpcPortServerProtocol(port)           (new bridge)
                                 ▼
                         RpcServer(group)                 (effect/rpc)
                                 │  RpcGroup.toLayer(handlers)
                                 ▼
              Service impl Layers (SystemService, Spaces, ...)
```

Four pieces change:

1. **Definitions** — `RpcGroup`s of `Rpc.make(...)` typed by Effect Schema, replacing the
   `.proto` services and `clientServiceBundle`.
2. **Transport bridge** — a new adapter that implements `@effect/rpc`'s `RpcClient.Protocol` and
   `RpcServer.Protocol` over the existing `RpcPort` byte duplex.
3. **Server** — `ClientServicesHost` builds an Effect `Layer` graph and runs `RpcServer.layer`
   instead of constructing a `ClientRpcServer`/`RpcPeer`.
4. **Client** — `ClientServicesProxy` derives an `RpcClient` and (Phase 1) exposes it through an
   adapter that preserves today's `Partial<ClientServices>` surface.

### 3.1 Serialization: MessagePack

Use `RpcSerialization.layerMsgPack` (`@effect/rpc/RpcSerialization`).

Rationale: client-service payloads carry binary fields everywhere — `PublicKey` (32 bytes),
`Credential`, automerge sync blobs (`DataService`), `bytes` signatures. JSON serialization cannot
carry `Uint8Array` without lossy base64 wrappers; msgpack encodes binary natively and is
self-framing (`includesFraming = true`), which matches discrete-message transports (postMessage,
WS frames).

### 3.2 Transport bridge: `RpcPort` ↔ `@effect/rpc` Protocol

`@effect/rpc` separates the wire **protocol** (`RpcClient.Protocol` / `RpcServer.Protocol`) from
serialization (`RpcSerialization`). Both protocols expose `Protocol.make(write => Effect<{ send,
... }>)`. We implement a single bridge module that adapts our `RpcPort` (`{ send(bytes),
subscribe(cb) }`):

- **Client** (`RpcClient.Protocol.make`): on `port.subscribe`, decode incoming bytes with the
  serialization `Parser` and `write(FromServerEncoded)` for each decoded message; `send(request)`
  encodes `FromClientEncoded` and calls `port.send(bytes)`. `supportsAck=false`,
  `supportsTransferables=false` (initially).
- **Server** (`RpcServer.Protocol.make`): symmetric — decode `FromClientEncoded`, `write(clientId,
  msg)`; `send(clientId, response)` encodes and `port.send`. A single `RpcPort` represents exactly
  one client connection, so `clientId` is a constant (e.g. `0`); a multi-client transport (one
  worker, many tabs) instantiates one server protocol per `WorkerSession`/port — mirroring today's
  one-`ClientRpcServer`-per-port model.

New package: **`@dxos/effect-rpc`** at `packages/core/mesh/effect-rpc`, exporting:

```ts
// RpcPortProtocol.ts  (@import-as-namespace)
export const layerClient: (port: RpcPort) => Layer.Layer<RpcClient.Protocol, never, RpcSerialization>;
export const layerServer: (port: RpcPort) => Layer.Layer<RpcServer.Protocol, never, RpcSerialization>;
```

This keeps the transport plumbing reusable and isolates the only genuinely tricky boundary code.

> Note on framing: msgpack's `Parser.decode` returns an array of fully-parsed values and tolerates
> messages split/coalesced across `port.send` boundaries, so no extra length-prefix framing is
> required even on transports that don't preserve boundaries. WS and postMessage already preserve
> boundaries.

### 3.3 Connection lifecycle, heartbeat, reconnection

`@dxos/rpc` did an explicit open handshake + `Bye` close + heartbeat; `@effect/rpc` does not. The
bridge must reproduce the behaviours client-services relies on:

- **Open gate** — `ClientServicesProxy.open()` currently waits (with `RemoteServiceConnectionTimeout`,
  30s) for the worker to be ready. Preserve by keeping the existing `SharedWorkerConnection` /
  `WorkerService.start` system-port handshake (unchanged, still `@dxos/rpc` until §10) and only
  building the `RpcClient` once the worker signals ready.
- **Reconnection** — keep `ClientServicesProvider.onReconnect`/`reconnected`. On transport drop, the
  adapter rebuilds the `RpcClient` (new `Scope`) and fires `onReconnect` callbacks so proxies
  re-subscribe their streams. `@effect/rpc` will surface a transport error on in-flight effects;
  the adapter maps that to the existing `closed` event.
- **Timeouts** — per-call `timeout` (`RPC_TIMEOUT=20s`, `EPOCH_CREATION_TIMEOUT=60s`) map to
  `Effect.timeout` in the adapter (Phase 1) or to `Effect.timeout` at Effect-native call sites
  (later phases).

## 4. Schema migration (protobuf → Effect Schema)

This is the largest sub-task. The `.proto` request/response messages must become Effect Schemas.
Strategy: **one Schema module per logical area**, reusing existing Effect Schemas where they exist
and adding codecs for primitive wire types that today only exist as protobuf/classes.

### 4.1 Shared wire types — add Effect Schema codecs

| Type | Today | Plan |
| --- | --- | --- |
| `PublicKey` | class in `@dxos/keys` (binary) | add `PublicKey.Schema` (Schema transform `Uint8Array` ⇄ `PublicKey`, msgpack-friendly) in `@dxos/keys` |
| `SpaceId`, `EntityId`, DID | already Effect Schema (`@dxos/keys`) | reuse |
| `Credential`, `ProfileDocument`, `DeviceProfileDocument`, `Presentation` | protobuf (`dxos.halo.credentials`) | new Schema in `@dxos/credentials` (or a `halo-protocol` schema barrel) |
| `Timeframe` / `TimeframeVector` | protobuf | Schema in `@dxos/timeframe` |
| `GossipMessage`, edge `SwarmResponse`, `JoinRequest`, etc. | protobuf | Schema co-located with their owning package |
| `Struct` / `Any` (config, diagnostics, gossip payload) | `google.protobuf.Struct`/`Any` | `Schema.Unknown` / `Schema.Any` (diagnostics is already JSON) |

`PublicKey.Schema` is the keystone — almost every message references it. It must round-trip through
msgpack as raw bytes (not hex) to keep payloads small.

### 4.2 Service definitions — `RpcGroup` per service

Each protobuf `service` becomes an `RpcGroup` whose members are `Rpc.make`. Streaming RPCs use
`RpcSchema.Stream` + `stream: true`. Example (`SystemService`):

```ts
// SystemRpcs.ts
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcSchema from '@effect/rpc/RpcSchema';
import * as Schema from 'effect/Schema';

export const SystemStatus = Schema.Literal('INACTIVE', 'ACTIVE');

export const GetDiagnosticsResponse = Schema.Struct({
  timestamp: Schema.DateFromSelf,
  diagnostics: Schema.Unknown,
});

export const SystemRpcs = RpcGroup.make(
  Rpc.make('GetConfig', { payload: Schema.Void, success: ConfigSchema }),
  Rpc.make('GetDiagnostics', { payload: GetDiagnosticsRequest, success: GetDiagnosticsResponse }),
  Rpc.make('UpdateStatus', { payload: Schema.Struct({ status: SystemStatus }) }),
  Rpc.make('QueryStatus', {
    payload: Schema.Struct({ interval: Schema.optional(Schema.Number) }),
    success: RpcSchema.Stream({ success: Schema.Struct({ status: SystemStatus }), failure: Schema.Never }),
    stream: true,
  }),
  Rpc.make('Reset', {}),
  Rpc.make('GetPlatform', { payload: Schema.Void, success: Platform }),
);
```

The full `ClientServices` group merges every service group:

```ts
export const ClientRpcs = SystemRpcs
  .merge(IdentityRpcs).merge(DevicesRpcs).merge(ContactsRpcs)
  .merge(SpacesRpcs).merge(InvitationsRpcs).merge(NetworkRpcs)
  .merge(LoggingRpcs).merge(EdgeAgentRpcs)
  .merge(DataRpcs).merge(QueryRpcs).merge(QueueRpcs);
```

> Method naming: keep PascalCase tags (`CreateSpace`) matching the proto rpc names so wire
> compatibility/observability stays familiar; the generated client exposes them as
> `client.CreateSpace(...)`. The legacy adapter (§5.2) maps these to the camelCase
> `services.SpacesService.createSpace(...)` surface.

### 4.3 Decision: echo `DataService` / `QueryService` / `QueueService`

These are defined in `dxos.echo.*` and implemented in `@dxos/echo-host`. They are part of the
`ClientServices` bundle so they must be reachable, but their payloads are the heaviest (automerge
sync). **Recommended:** migrate their definitions in a later phase; in Phase 1 they ride the new
transport via a per-service compatibility shim only if cheap, otherwise keep them on a parallel
`@dxos/rpc` port temporarily. This is the single biggest scoping lever — see §8 and Open Question 1.

## 5. Component changes

### 5.1 Server: `ClientServicesHost`

- Delete `ClientRpcServer` and `ServiceRegistry`'s dependency on `ServiceBundle`.
- Each service impl is exposed as a handler set via `ClientRpcs.toLayer({...})`. Two routes:
  - **Bridge (Phase 1):** keep the existing impl classes; the handler functions adapt
    Promise→`Effect.tryPromise` and codec-protobuf `Stream`→`Stream.async`. A helper
    `adaptStream(stream)` converts `{ subscribe, close }` into an Effect `Stream`.
  - **Native (later):** rewrite impls to return `Effect`/`Stream` directly.
- `ClientServicesHost.open()` constructs the handler layer + `RpcServer.layer(ClientRpcs)`,
  provided with `RpcPortProtocol.layerServer(port)` and `RpcSerialization.layerMsgPack`, and runs
  it on the host's `ManagedRuntime`. The dynamic add/remove of services (`setServices`) becomes a
  handler layer that resolves impls lazily from `ServiceContext` (handlers can `yield*` a service
  registry tag), preserving the "services appear after `open`" behaviour.

`WorkerSession` builds one server scope per `appPort` (and per `shellPort`), replacing the two
`ClientRpcServer` instances. The `handleCall`/`handleStream` middleware (readySignal gate) becomes a
middleware on the `RpcGroup` (`RpcGroup.middleware`) or an `Effect` wrapper in each handler.

### 5.2 Client: `ClientServicesProxy` + adapter

`ClientServicesProxy.open()`:

```ts
this._client = yield* RpcClient.make(ClientRpcs);            // within a scoped runtime
// provided: RpcPortProtocol.layerClient(port) + RpcSerialization.layerMsgPack
```

To avoid touching ~85 call sites at once, ship a **`ClientServicesAdapter`** that turns the Effect
`RpcClient` into the legacy `Partial<ClientServices>` object:

- unary methods → `async (req, opts) => runtime.runPromise(client.Method(req).pipe(Effect.timeout(opts?.timeout)))`
- streaming methods → return a codec-protobuf-compatible `Stream` whose `.subscribe`/`.close`
  drive `Stream.runForEach` on a child scope (interrupt on `.close()`).

`ClientServicesProvider.descriptors` (typed `ServiceBundle<ClientServices>`) is removed from the
interface or returns the `RpcGroup`; downstream uses of `descriptors` are limited (devtools proxy)
and migrated.

### 5.3 Removing `@dxos/rpc`

Remove `@dxos/rpc` from the dependencies of `@dxos/client`, `@dxos/client-services`,
`@dxos/client-protocol`. Remove `createServiceBundle`/`createProtoRpcPeer` usage from the
client-services path. `@dxos/codec-protobuf`'s `Stream` is still used transiently by the adapter
until consumers go Effect-native, then dropped.

## 6. File layout

New / changed files (✎ change, ＋ new, ✗ delete):

```
packages/core/mesh/effect-rpc/                      ＋ new package @dxos/effect-rpc
  src/
    index.ts
    RpcPortProtocol.ts                              ＋ layerClient(port) / layerServer(port)
    RpcPortProtocol.test.ts                         ＋ round-trip over an in-memory RpcPort pair
  package.json moon.yml

packages/sdk/client-protocol/src/
  rpcs/                                             ＋ Effect service definitions (RpcGroups)
    SystemRpcs.ts  IdentityRpcs.ts  DevicesRpcs.ts
    ContactsRpcs.ts  SpacesRpcs.ts  InvitationsRpcs.ts
    NetworkRpcs.ts  LoggingRpcs.ts  EdgeAgentRpcs.ts
    EchoRpcs.ts            (Data/Query/Queue — phased)
    ClientRpcs.ts          (merge of all groups)
    schema/                                          ＋ shared message schemas (Identity, Space, Device, ...)
    index.ts
  service.ts                                         ✎ remove clientServiceBundle / ServiceBundle types
                                                        keep ClientServicesProvider (descriptors → RpcGroup)

packages/sdk/client-services/src/packlets/services/
  client-rpc-server.ts                               ✗ delete (replaced by RpcServer wiring)
  service-registry.ts                                ✎ drop ServiceBundle; hold handler impls only
  service-host.ts                                    ✎ build RpcServer layer instead of ClientRpcServer
  rpc-handlers.ts                                    ＋ ClientRpcs.toLayer({...}) + Promise/Stream adapters
packages/sdk/client-services/src/packlets/worker/
  worker-session.ts                                  ✎ one RpcServer scope per port

packages/sdk/client/src/services/
  service-proxy.ts                                   ✎ RpcClient + ClientServicesAdapter
  client-services-adapter.ts                         ＋ Effect client → legacy ClientServices surface
  local-client-services.ts                           ✎ in-proc: connect client/server protocols directly
  worker-client-services.ts / dedicated/...          ✎ swap proxy internals (ports unchanged)
  socket.ts / agent.ts                               ✎ WS RpcPort → client protocol

packages/common/keys/src/
  public-key.ts                                      ✎ add PublicKey.Schema (bytes ⇄ PublicKey)

packages/core/protocols/src/proto/dxos/client/services.proto   ✗ delete (after all consumers migrated)
```

## 7. Streaming semantics mapping

| Concept | `@dxos/rpc` (today) | `@effect/rpc` (target) |
| --- | --- | --- |
| Server stream def | proto `returns (stream X)` | `Rpc.make(..., { success: RpcSchema.Stream(...), stream: true })` |
| Handler return | `Stream<X>` (codec-protobuf) | `Stream.Stream<X, E, R>` or `Effect<Mailbox>` |
| Client receive | `Stream` with `.subscribe(cb)/.close()` | `Stream.Stream<X>` (or `asMailbox`) |
| Snapshot-on-subscribe | handler re-emits current state | unchanged (handler responsibility) |
| Teardown | `stream.close()` | interrupt the consuming fiber / close scope |
| Backpressure | none (push) | `streamBufferSize` option on client |

The Phase-1 adapter hides this so existing `.subscribe/.close` consumers keep working.

## 8. Phased migration plan

Each phase is independently shippable and keeps CI (build/test/lint/fmt) green.

1. **Bridge foundation** — add `@dxos/effect-rpc` (`RpcPortProtocol`) + msgpack; unit-test a
   client/server round-trip (unary + stream) over an in-memory `RpcPort` pair. No product wiring.
2. **`PublicKey.Schema`** + shared schema barrel; land independently with tests.
3. **First vertical slice** — migrate `SystemService` end-to-end (def + host handler + proxy
   adapter) behind the existing transports; prove the in-proc (`local-client-services`) and
   shared-worker paths. Keep all other services on `@dxos/rpc` simultaneously by running **two
   servers on two ports** during transition, OR a single merged group if slices land fast.
4. **Remaining HALO/system/mesh services** — Identity, Devices, Contacts, Spaces, Invitations,
   Network, Logging, EdgeAgent.
5. **Echo services** — Data/Query/Queue (heaviest; see Open Question 1).
6. **Drop legacy** — remove `ClientRpcServer`, `clientServiceBundle`, `@dxos/rpc` from the client
   path, delete `services.proto`.
7. **Effect-native consumers (optional, later)** — migrate `space-proxy`/`halo-proxy`/etc. off the
   adapter to consume the `RpcClient` (Streams/Effects) directly; drop the adapter and
   `@dxos/codec-protobuf` `Stream`.

Running two engines side-by-side during phases 3–5 requires either two transport ports or a single
demux; recommend a **single `appPort` carrying both** — wrap the legacy `RpcPort` so the effect
protocol claims a channel prefix — only if phases don't land quickly. Default plan: land phases 3–5
quickly enough to flip the whole bundle at once on `appPort`, avoiding a demux.

## 9. Testing

- `RpcPortProtocol.test.ts` — unary + server-stream round-trip over an in-memory port pair;
  error propagation; interrupt/close; reconnect.
- Extend existing suites rather than add new ones:
  - `service-host.test.ts`, `service-registry.test.ts` — host serves via `RpcServer`.
  - `system-service.test.ts`, `identity-service.test.ts`, `spaces-service.test.ts`, etc. — exercise
    each service through the public client surface.
  - `client-services.test.ts` (client-e2e) — full proxy↔host over a `MessageChannel`.
- Schema round-trip tests for `PublicKey.Schema` and each message schema (encode/decode through
  msgpack equals identity).
- Use the unified `TestLayer` pattern; avoid sleeps — drive streams with events/`TestClock`.

## 10. Out-of-scope but adjacent (follow-ups)

- `BridgeService` (iframe), `WorkerService`, `ShellService`, `AppService` bundles — still
  `@dxos/rpc`. They share transports with client services; migrate after the main bundle.
- `WebsocketRpcServer`/devtools proxy (`runtime.client.devtoolsProxy`) — needs the server protocol
  over WS; covered by `RpcServer.makeProtocolWebsocket` or our bridge over `WebsocketRpcClient`.
- Teleport/replication `@dxos/rpc` usage — unrelated, untouched.

## 11. Open questions / decisions needed

1. **Echo services scope.** Migrate `DataService`/`QueryService`/`QueueService` to Effect Schema in
   this effort (heavy, automerge sync payloads), or keep them on a parallel `@dxos/rpc` port until a
   separate effort? *(Recommend: defer to a later phase, parallel port, to bound risk.)*
2. **Transition transport.** During phases 3–5, run two RPC engines on **two ports**, or invest in a
   **single-port channel demux**? *(Recommend: land slices fast and flip the whole bundle on one
   port; only build a demux if timelines slip.)*
3. **Consumer migration.** Keep the legacy `services.XxxService.method()` adapter long-term, or
   commit to migrating all proxies to Effect-native `RpcClient` consumption? *(Recommend: adapter
   first for a safe cutover, Effect-native as an opt-in follow-up.)*
4. **Schema home for HALO credential types.** Add Effect Schemas to `@dxos/credentials`, or a new
   `halo-protocol` schema barrel? *(Recommend: `@dxos/credentials`, alongside the existing types.)*
```
