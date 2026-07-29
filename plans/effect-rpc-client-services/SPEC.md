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
- Changing the wire transports themselves (SharedWorker `MessagePort`, WebSocket, in-process). We
  reuse the existing transports; the `MessagePort`s are driven by `@effect/rpc`'s native worker
  protocol (structured clone, no byte serializer) rather than the `@dxos/rpc` byte engine.

## 2. Background — current architecture

| Concern               | Current implementation                                                                                         | File                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Service typing        | Protobuf services (`dxos.client.services.*`)                                                                   | `packages/core/protocols/src/proto/dxos/client/services.proto`            |
| Service bundle        | `clientServiceBundle = createServiceBundle<ClientServices>({...})`                                             | `packages/sdk/client-protocol/src/service.ts`                             |
| Engine                | `RpcPeer` framing Request/Response/Stream protobuf envelopes                                                   | `packages/core/mesh/rpc/src/rpc.ts`                                       |
| Server                | `ClientRpcServer` → `RpcPeer` with per-service `ServiceHandler`                                                | `packages/sdk/client-services/src/packlets/services/client-rpc-server.ts` |
| Registry              | `ServiceRegistry<ClientServices>` holds `{descriptors, services}`                                              | `.../services/service-registry.ts`                                        |
| Host wiring           | `ClientServicesHost.open()` instantiates impls + registers them                                                | `.../services/service-host.ts`                                            |
| Client proxy          | `ClientServicesProxy` → `createProtoRpcPeer({ requested: clientServiceBundle })`, exposes `.rpc` as `services` | `packages/sdk/client/src/services/service-proxy.ts`                       |
| Transport (byte port) | `RpcPort = { send(Uint8Array), subscribe(cb) }`                                                                | `packages/core/mesh/rpc/src/rpc.ts:50`                                    |
| Worker transport      | `createWorkerPort` (MessagePort), `createIFramePort`                                                           | `packages/core/mesh/rpc-tunnel/src/ports/*`                               |
| Socket transport      | `WebsocketRpcClient` wraps a `WebSocket` into an `RpcPort`                                                     | `packages/core/mesh/websocket-rpc`                                        |

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
                  RpcClient<ClientRpcs>  →  client.SpacesService.CreateSpace
                                 │  RpcClient.makeProtocolWorker
                                 ▼
                BrowserWorker.layerPlatform(() => appMessagePort)
                                 │  postMessage / structured clone (NO serialization)
        ════════════════════════╪════════════════════════  MessagePort (worker / in-proc MessageChannel)
                                 │
                BrowserWorkerRunner.layerMessagePort(appMessagePort)
                                 ▼
                RpcServer.layerProtocolWorkerRunner + RpcServer.layer(ClientRpcs)
                                 │  RpcGroup.toLayer(handlers)
                                 ▼
              Service impl Layers (SystemService, Spaces, ...)
```

Four pieces change:

1. **Definitions** — `RpcGroup`s of `Rpc.make(...)` typed by Effect Schema and prefixed with the
   service name, replacing the `.proto` services and `clientServiceBundle`.
2. **Transport** — Effect's **native worker protocol** over the existing `MessagePort`s. No custom
   byte port, no serialization codec on the MessagePort path (see §3.1–3.2).
3. **Server** — `ClientServicesHost` builds an Effect `Layer` graph and runs `RpcServer.layer`
   instead of constructing a `ClientRpcServer`/`RpcPeer`.
4. **Client** — `ClientServicesProxy` derives an `RpcClient` and (Phase 1) exposes it through an
   adapter that preserves today's `Partial<ClientServices>` surface.

### 3.1 Transport: native worker protocol (no serialization on MessagePort)

The client-services transports are `MessagePort`s (SharedWorker / dedicated worker), an in-process
pair (local), and a remote WebSocket (agent/vault). `@effect/rpc` ships a worker protocol that runs
directly over `@effect/platform`'s `Worker`/`WorkerRunner`, which `@effect/platform-browser` binds
to a `MessagePort`. On this path messages move via `postMessage` **structured clone** with
zero-copy `Transferable`s — there is no JSON/msgpack byte-serialization step and no `RpcPort`.

- **Client:** `RpcClient.makeProtocolWorker({ size: 1 })` (or `layerProtocolWorker`), whose
  requirements `Worker.PlatformWorker | Worker.Spawner` are satisfied by
  `BrowserWorker.layerPlatform((_id) => appMessagePort)` — the spawner returns the **existing**
  `MessagePort` rather than spawning a new `Worker`.
- **Server (inside the worker):** `RpcServer.layerProtocolWorkerRunner` whose requirement
  `WorkerRunner.PlatformRunner` is satisfied by `BrowserWorkerRunner.layerMessagePort(appMessagePort)`.

Effect Schema payloads are encoded to their `Encoded` representation (plain structured-cloneable
objects); `Uint8Array`/`ArrayBuffer` fields (e.g. `PublicKey`, credential bytes, automerge chunks)
clone (and can transfer) natively — so binary survives the hop without base64 or msgpack. We still
need Effect Schema definitions (§4) so that class instances like `PublicKey` round-trip to/from
their clonable encoded form; what we drop is the wire **serializer**, not the schema.

The remote **WebSocket** transport (agent/vault) is the one exception: there is a real byte wire,
so it keeps a serializer — `RpcSerialization.layerMsgPack` (binary-friendly) over
`@effect/platform`'s `Socket` (`BrowserSocket` / node socket) with `RpcClient.makeProtocolSocket`
and `RpcServer.makeProtocolSocketServer`.

### 3.2 In-process (local) and node transports

- **Local (`fromHost`, same thread, no worker):** wire client and server with an in-memory
  `MessageChannel` pair (`new MessageChannel()` → `port1` to the client spawner, `port2` to the
  runner) so the same worker-protocol code path is exercised with no postMessage hop across
  threads, or use `RpcTest`/a direct in-memory protocol where a real channel is undesirable.
- **Node worker (cli/agent host):** the same shape using `@effect/platform-node`'s worker layers
  instead of `@effect/platform-browser`. Platform selection is a layer choice, not a code change.

A thin **`@dxos/effect-rpc`** package (`packages/core/mesh/effect-rpc`) holds the small glue that
is shared across these cases:

```ts
// transport.ts  (@import-as-namespace)
// Client protocol layer from an existing MessagePort (browser).
export const clientLayer: (port: MessagePort) => Layer.Layer<RpcClient.Protocol, WorkerError>;
// Server protocol layer from an existing MessagePort (browser worker).
export const serverLayer: (port: MessagePort) => Layer.Layer<RpcServer.Protocol, WorkerError>;
// In-process MessageChannel pair for local services.
export const inProcessPair: () => { client: Layer.Layer<RpcClient.Protocol>; server: Layer.Layer<RpcServer.Protocol> };
```

### 3.3 Connection lifecycle, heartbeat, reconnection

`@dxos/rpc` did an explicit open handshake + `Bye` close + heartbeat; `@effect/rpc` does not. The
transport layer must reproduce the behaviours client-services relies on:

- **Open gate** — `ClientServicesProxy.open()` currently waits (with `RemoteServiceConnectionTimeout`,
  30s) for the worker to be ready. Preserve by keeping the existing `SharedWorkerConnection` /
  `WorkerService.start` system-port handshake (unchanged, still `@dxos/rpc` until §10) and only
  building the `RpcClient` once the worker signals ready.
- **Reconnection** — keep `ClientServicesProvider.onReconnect`/`reconnected`. On transport drop, the
  adapter rebuilds the `RpcClient` (new `Scope`, new `MessagePort`) and fires `onReconnect`
  callbacks so proxies re-subscribe their streams. `@effect/rpc` surfaces a transport error on
  in-flight effects; the adapter maps that to the existing `closed` event.
- **Timeouts** — per-call `timeout` (`RPC_TIMEOUT=20s`, `EPOCH_CREATION_TIMEOUT=60s`) map to
  `Effect.timeout` in the adapter (Phase 1) or to `Effect.timeout` at Effect-native call sites
  (later phases).

## 4. Schema migration (protobuf → Effect Schema)

This is the largest sub-task. The `.proto` request/response messages must become Effect Schemas.
Strategy: **one Schema module per logical area**, reusing existing Effect Schemas where they exist
and adding codecs for primitive wire types that today only exist as protobuf/classes.

### 4.1 Shared wire types — add Effect Schema codecs

| Type                                                                     | Today                                | Plan                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `PublicKey`                                                              | class in `@dxos/keys` (binary)       | add `PublicKey.Schema` (Schema transform `Uint8Array` ⇄ `PublicKey`; encoded form is structured-cloneable) in `@dxos/keys` |
| `SpaceId`, `EntityId`, DID                                               | already Effect Schema (`@dxos/keys`) | reuse                                                                                                                      |
| `Credential`, `ProfileDocument`, `DeviceProfileDocument`, `Presentation` | protobuf (`dxos.halo.credentials`)   | new Schema in `@dxos/credentials` (or a `halo-protocol` schema barrel)                                                     |
| `Timeframe` / `TimeframeVector`                                          | protobuf                             | Schema in `@dxos/timeframe`                                                                                                |
| `GossipMessage`, edge `SwarmResponse`, `JoinRequest`, etc.               | protobuf                             | Schema co-located with their owning package                                                                                |
| `Struct` / `Any` (config, diagnostics, gossip payload)                   | `google.protobuf.Struct`/`Any`       | `Schema.Unknown` / `Schema.Any` (diagnostics is already JSON)                                                              |

`PublicKey.Schema` is the keystone — almost every message references it. Its `Encoded` form is a
raw `Uint8Array` (not hex) so it structured-clones (and can transfer) without bloating payloads.

### 4.2 Service definitions — `RpcGroup` per service

Each protobuf `service` becomes an `RpcGroup` whose members are `Rpc.make`, **prefixed with the
service name** via `RpcGroup.prefix('<ServiceName>.')`. Prefixing makes the wire tag
`SpacesService.CreateSpace` and — because `RpcClient` splits tags on the first `.` — nests the
generated client as `client.SpacesService.CreateSpace(...)`, which both namespaces the methods and
mirrors today's `services.SpacesService.*` access. Streaming RPCs use `RpcSchema.Stream` +
`stream: true`.

Full example (`SpacesService`); request/response messages are Effect Schema classes named to match
the proto types they replace:

```ts
// SpacesRpcs.ts
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcSchema from '@effect/rpc/RpcSchema';
import * as Schema from 'effect/Schema';

import { PublicKey, SpaceId } from '@dxos/keys';

import { Credential } from '../schema/credentials'; // Effect Schema (was dxos.halo.credentials).

export const SpaceState = Schema.Literal('ACTIVE', 'INACTIVE', 'CLOSED', 'ERROR');

// Messages — `PublicKey` round-trips as raw bytes via structured clone (no base64).
export class Space extends Schema.Class<Space>('dxos.client.services.Space')({
  id: SpaceId,
  spaceKey: PublicKey,
  state: SpaceState,
  members: Schema.Array(SpaceMember),
}) {}

export class CreateSpaceRequest extends Schema.Class<CreateSpaceRequest>('CreateSpaceRequest')({
  tags: Schema.optional(Schema.Array(Schema.String)),
}) {}

// Snapshot re-emitted on every (re)subscribe — the stream element type.
export class QuerySpacesResponse extends Schema.Class<QuerySpacesResponse>('QuerySpacesResponse')({
  spaces: Schema.Array(Space),
}) {}

export const SpacesRpcs = RpcGroup.make(
  Rpc.make('CreateSpace', { payload: CreateSpaceRequest, success: Space }),
  Rpc.make('UpdateSpace', { payload: UpdateSpaceRequest }), // success defaults to Schema.Void.
  Rpc.make('QuerySpaces', {
    payload: Schema.Void,
    success: RpcSchema.Stream({ success: QuerySpacesResponse, failure: Schema.Never }),
    stream: true,
  }),
  Rpc.make('WriteCredentials', { payload: WriteCredentialsRequest }),
  Rpc.make('QueryCredentials', {
    payload: QueryCredentialsRequest,
    success: RpcSchema.Stream({ success: Credential, failure: Schema.Never }),
    stream: true,
  }),
).prefix('SpacesService.'); // tags become `SpacesService.CreateSpace`, etc.
```

The full `ClientServices` group merges every prefixed service group (tags stay unique across
services because each carries its own prefix):

```ts
export const ClientRpcs = SystemRpcs.merge(IdentityRpcs)
  .merge(DevicesRpcs)
  .merge(ContactsRpcs)
  .merge(SpacesRpcs)
  .merge(InvitationsRpcs)
  .merge(NetworkRpcs)
  .merge(LoggingRpcs)
  .merge(EdgeAgentRpcs)
  .merge(DataRpcs)
  .merge(QueryRpcs)
  .merge(QueueRpcs);
```

Server handlers and the client both key off the prefixed tag:

```ts
// Server: handler keys are the full prefixed tags.
const SpacesHandlers = SpacesRpcs.toLayer({
  'SpacesService.CreateSpace': (req) => Effect.promise(() => impl.createSpace(req)),
  'SpacesService.QuerySpaces': () => adaptStream(impl.querySpaces()), // codec-protobuf Stream → Effect Stream.
  // ...
});

// Client: nested by prefix.
const client = yield * RpcClient.make(ClientRpcs);
const space = yield * client.SpacesService.CreateSpace({ tags: [] }); // Effect<Space>
const spaces = client.SpacesService.QuerySpaces(); // Stream<QuerySpacesResponse>
```

> Method naming: tags keep PascalCase matching the proto rpc names for observability; the
> service-name prefix yields `client.SpacesService.CreateSpace`. The Phase-1 legacy adapter (§5.2)
> down-cases the leaf to the existing `services.SpacesService.createSpace(...)` surface so consumers
> don't change.

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
  provided with `EffectRpc.serverLayer(appMessagePort)` (= `RpcServer.layerProtocolWorkerRunner` +
  `BrowserWorkerRunner.layerMessagePort`) — **no serialization layer** — and runs it on the host's
  `ManagedRuntime`. The dynamic add/remove of services (`setServices`) becomes a handler layer that
  resolves impls lazily from `ServiceContext` (handlers can `yield*` a service registry tag),
  preserving the "services appear after `open`" behaviour.

`WorkerSession` builds one server scope per `appPort` (and per `shellPort`), replacing the two
`ClientRpcServer` instances. The `handleCall`/`handleStream` middleware (readySignal gate) becomes a
middleware on the `RpcGroup` (`RpcGroup.middleware`) or an `Effect` wrapper in each handler.

### 5.2 Client: `ClientServicesProxy` + adapter

`ClientServicesProxy.open()`:

```ts
this._client = yield * RpcClient.make(ClientRpcs); // within a scoped runtime
// provided: EffectRpc.clientLayer(appMessagePort)  (= makeProtocolWorker + BrowserWorker.layerPlatform)
// no serialization layer on the MessagePort path
```

To avoid touching ~85 call sites at once, ship a **`ClientServicesAdapter`** that turns the Effect
`RpcClient` into the legacy `Partial<ClientServices>` object (mapping `client.SpacesService.CreateSpace`
→ `services.SpacesService.createSpace`):

- unary methods → `async (req, opts) => runtime.runPromise(client.Svc.Method(req).pipe(Effect.timeout(opts?.timeout)))`
- streaming methods → return a codec-protobuf-compatible `Stream` whose `.subscribe`/`.close`
  drive `Stream.runForEach` on a child scope (interrupt on `.close()`).

Teardown contract: each `.subscribe()` runs the underlying `RpcClient` stream in a fiber forked
into a **child scope** of the proxy's runtime scope. `.close()` interrupts that fiber and closes
its child scope; scope closure runs the stream's finalizers, which send the `@effect/rpc`
`Interrupt` message so the server cancels the corresponding handler fiber and stops emitting. A
pending unary call interrupted this way rejects with an interruption error (surfaced as the
existing `closed`/timeout path). Because the child scope is owned by the proxy scope, closing the
proxy (or a transport drop rebuilding the client, §3.3) cancels all in-flight subscriptions
automatically — individual `.close()` calls are not required for global teardown.

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
packages/core/mesh/effect-rpc/                      ＋ new package @dxos/effect-rpc (transport glue)
  src/
    index.ts
    transport.ts                                    ＋ clientLayer(port) / serverLayer(port) / inProcessPair()
                                                       (wraps BrowserWorker / BrowserWorkerRunner + worker protocol)
    socket.ts                                       ＋ remote WS: makeProtocolSocket(+msgPack) client/server
    transport.test.ts                               ＋ round-trip over a MessageChannel pair (unary + stream + transferable)
  package.json moon.yml

packages/sdk/client-protocol/src/
  rpcs/                                             ＋ Effect service definitions (prefixed RpcGroups)
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
  worker-session.ts                                  ✎ one RpcServer scope per MessagePort

packages/sdk/client/src/services/
  service-proxy.ts                                   ✎ RpcClient + ClientServicesAdapter
  client-services-adapter.ts                         ＋ Effect client → legacy ClientServices surface
  local-client-services.ts                           ✎ in-proc: EffectRpc.inProcessPair() (MessageChannel)
  worker-client-services.ts / dedicated/...          ✎ feed existing MessagePort to EffectRpc.clientLayer
  socket.ts / agent.ts                               ✎ remote WS → EffectRpc.socket client protocol (+msgPack)

packages/common/keys/src/
  public-key.ts                                      ✎ add PublicKey.Schema (bytes ⇄ PublicKey)

packages/core/protocols/src/proto/dxos/client/services.proto   ✗ delete (after all consumers migrated)
```

## 7. Streaming semantics mapping

| Concept               | `@dxos/rpc` (today)                     | `@effect/rpc` (target)                                            |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Server stream def     | proto `returns (stream X)`              | `Rpc.make(..., { success: RpcSchema.Stream(...), stream: true })` |
| Handler return        | `Stream<X>` (codec-protobuf)            | `Stream.Stream<X, E, R>` or `Effect<Mailbox>`                     |
| Client receive        | `Stream` with `.subscribe(cb)/.close()` | `Stream.Stream<X>` (or `asMailbox`)                               |
| Snapshot-on-subscribe | handler re-emits current state          | unchanged (handler responsibility)                                |
| Teardown              | `stream.close()`                        | interrupt the consuming fiber / close scope                       |
| Backpressure          | none (push)                             | `streamBufferSize` option on client                               |

The Phase-1 adapter hides this so existing `.subscribe/.close` consumers keep working.

## 8. Phased migration plan

Each phase is independently shippable and keeps CI (build/test/lint/fmt) green.

1. **Transport foundation** — add `@dxos/effect-rpc` (`clientLayer`/`serverLayer`/`inProcessPair`
   over the native worker protocol); unit-test a client/server round-trip (unary + stream +
   transferable bytes) over a `MessageChannel` pair. No product wiring.
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

Running two engines side-by-side during phases 3–5 requires either two `MessagePort`s (one for the
legacy `@dxos/rpc` peer, one for the effect worker protocol) or a single demux. Two ports is the
simple option — the worker already passes multiple ports (app/system/shell). Default plan: land
phases 3–5 quickly enough to flip the whole bundle at once on a single `appPort`, avoiding both.

## 9. Testing

- `transport.test.ts` — unary + server-stream round-trip over a `MessageChannel` pair;
  transferable bytes; error propagation; interrupt/close; reconnect.
- Extend existing suites rather than add new ones:
  - `service-host.test.ts`, `service-registry.test.ts` — host serves via `RpcServer`.
  - `system-service.test.ts`, `identity-service.test.ts`, `spaces-service.test.ts`, etc. — exercise
    each service through the public client surface.
  - `client-services.test.ts` (client-e2e) — full proxy↔host over a `MessageChannel`.
- Schema round-trip tests for `PublicKey.Schema` and each message schema (decode∘encode is identity;
  encoded form survives `structuredClone`).
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
   separate effort? _(Recommend: defer to a later phase, parallel port, to bound risk.)_
2. **Transition transport.** During phases 3–5, run two RPC engines on **two ports**, or invest in a
   **single-port channel demux**? _(Recommend: land slices fast and flip the whole bundle on one
   port; only build a demux if timelines slip.)_
3. **Consumer migration.** Keep the legacy `services.XxxService.method()` adapter long-term, or
   commit to migrating all proxies to Effect-native `RpcClient` consumption? _(Recommend: adapter
   first for a safe cutover, Effect-native as an opt-in follow-up.)_
4. **Schema home for HALO credential types.** Add Effect Schemas to `@dxos/credentials`, or a new
   `halo-protocol` schema barrel? _(Recommend: `@dxos/credentials`, alongside the existing types.)_

```

```
