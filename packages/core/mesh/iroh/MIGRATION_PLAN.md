# Iroh as Primary MESH Transport — Research & Migration Plan

**Date:** 2026-07-29
**Status:** Research/plan (no implementation yet)
**Scope:** `dxos/dxos` (MESH, client-services, Composer) + `dxos/edge` (router, replicators)
**Relation to `DESIGN.md`:** `DESIGN.md` (this directory) proposes iroh as a _parallel_
presence/gossip layer, with "iroh as transport" as its Phase 3. This document plans the
larger goal directly: **iroh as the primary transport** for peer-to-peer MESH traffic and,
in a later phase, for client↔EDGE traffic. The two documents are compatible; the presence
work in `DESIGN.md` can proceed orthogonally on the endpoint infrastructure built here.

---

## 1. Upstream state of iroh (verified 2026-07-29)

| Aspect     | State                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version    | **1.0 (2026-06-15), latest v1.0.3** — wire protocol + API now stable; cross-version/language compat guaranteed within v1. Pre-1.0 relays lose public-relay support 2026-12-31.                                                                                                                                                |
| Transport  | QUIC over UDP (n0's `noq` stack), QUIC multipath + IETF-draft NAT traversal, ~90% direct-connection rate (native), relay fallback otherwise.                                                                                                                                                                                  |
| Browser    | **Works via wasm, but relay-only** (WebSocket to relay; no UDP in the sandbox). WebTransport/WebRTC direct paths are "future possibilities", not implemented. **No official npm package** — we must build a wasm-bindgen wrapper crate.                                                                                       |
| Node/Tauri | Official napi bindings **`@number0/iroh` 1.1.0** — endpoint/streams/datagrams only. **Gossip/blobs/docs are NOT exposed to JS** (Rust only). No darwin-x64 prebuild.                                                                                                                                                          |
| Relays     | `iroh-relay` crate self-hostable (HTTP/WS protocol; auth via token or HTTP callout — fits Edge-issued tokens). n0 public relays are rate-limited dev/test only. Managed relays: ~$0.27/relay/hour (services.iroh.computer). Relay had a security patch (1.0.2) — self-hosting implies a patch process.                        |
| Cloudflare | **Workers/workerd cannot host an iroh endpoint** (no UDP). CF Containers (GA 2026-04) can run native iroh but accept **no inbound TCP/UDP** — outbound-initiated flows/hole-punch may still yield direct paths (unverified); worst case the container is relay-connected. n0 ships a pkarr-discovery CF Worker we could host. |
| Protocols  | Custom ALPN protocols are first-class (`ProtocolHandler`/Router). 0-RTT supported. `iroh-gossip`/`iroh-blobs` remain 0.x (outside the stability guarantee); blobs 0.10x self-describes as not production quality. No official presence protocol.                                                                              |
| License    | MIT/Apache-2.0. Production users: Delta Chat, Fedimint, others.                                                                                                                                                                                                                                                               |

**Timing assessment:** post-1.0 is the right time — the wire-stability risk flagged in
`DESIGN.md` (Open Question 2) has resolved. The browser relay-only constraint has **not**
resolved and is the central strategic constraint below.

## 2. Current state (ground truth, both repos)

### 2.1 MESH p2p stack (`dxos/dxos`)

- `Transport`/`TransportFactory` (`packages/core/mesh/network-manager/src/transport/transport.ts`):
  a transport receives `options.stream` (the Teleport muxer `Duplex`) and must move bytes
  reliably and in order — exactly one iroh QUIC bidirectional stream's semantics. Signaling
  is an opaque `google.protobuf.Struct` (`dxos/mesh/swarm.proto` `Signal`), so iroh
  addressing (`{ endpointId, relayUrl, directAddrs }`) can ride the existing signaling path
  with **zero proto changes**.
- Implementations today: WebRTC (`createRtcTransportFactory`, browser + Node via
  `node-datachannel`), WebRTC proxy/service pair for the shared-worker split, Memory, TCP
  (localhost tests). No websocket transport exists.
- **One global `TransportFactory` per `SwarmNetworkManager`** (`network-manager.ts:83`) —
  no per-swarm/per-peer selection seam. This is the main structural change needed.
- `Connection` state machine (`swarm/connection.ts`) is the contract: `connected` within
  **10 s** (`TRANSPORT_CONNECTION_TIMEOUT`, hard-coded), `closed` exactly once, errors as
  `ConnectionResetError`/`ConnectivityError`, `getStats()` polled at 5 s, buffered-signal
  replay after `open()`. Initiator glare is resolved above the transport (`peer.ts:108`).
- Construction sites that hard-code WebRTC (all must gain selection logic):
  `client-services/src/packlets/services/service-host.ts:435`,
  `client/src/services/local-client-services.ts:82`,
  `client-services/src/packlets/worker/worker-runtime.ts:102` (+ tab-side
  `dedicated-worker-client-services.ts:62`).
- **No transport-selection config exists.** `TransportKind` is test-only. ICE comes from
  `runtime.services.ice`/`iceProviders` (`https://edge-production.dxos.workers.dev/ice`).
- What flows p2p today (Teleport extensions, all active in Composer): auth, hypercore
  `replicator`, `blobsync`, `gossip` (presence), `notarization`, `admission-discovery`,
  and **`dxos.mesh.teleport.automerge` — `MeshEchoReplicator` p2p ECHO sync is ON by
  default** (`runtime.client.disableP2pReplication` unset in Composer).
- Composer (`dx.yml`): EDGE signaling + subduction replication + feed replicator over the
  EDGE websocket; WebRTC for all p2p.
- CI reality: WebRTC transport tests are `describe.skip`ped (node-datachannel segfaults) —
  **no real network transport has green CI coverage today**; an iroh Node transport would
  be testable, which is an argument in its favor.

### 2.2 Client↔EDGE path (`dxos/edge` + `@dxos/edge-client`)

- Exactly one bidirectional transport: WS `GET /ws/:identity/:peerKey` → `RouterObject`
  DO (keyed by identity DID). Everything multiplexes over it via the protobuf
  `dxos.edge.messenger.Message` envelope, demuxed on `serviceId`:
  `automerge-replicator:<spaceId>`, `subduction-replicator:<spaceId>`,
  `feed-replicator:<spaceId>`, `queue-replicator:…`, `swarm`, `signal` (direct relay +
  tag broadcast). Payloads are CBOR (protobuf `Any` for swarm control).
- **Everything downstream of `RouterObject.webSocketMessage` is already
  transport-agnostic**: replicator DOs receive `(ctx, Message, AuthState)` via
  `MessageSink.receiveMessage` and reply via `ROUTER_MESSENGER.sendMessage(ctx, Message)`
  (`RouterEntrypoint`). WebSocket coupling is concentrated in ~3 files
  (`router/src/worker/api.ts`, `router/src/worker/router.ts`,
  `hub-protocol/src/middleware.ts` subprotocol auth smuggling).
- Auth: Verifiable Presentation, base64 in `Authorization` or smuggled through
  `sec-websocket-protocol`; verification (`tryVerifiablePresentation`) is
  carriage-agnostic. Known gaps to fix rather than port: no nonce (replayable
  presentation), `peerKey` unverified.
- Protocol invariants any new transport must preserve:
  1. `AutomergeReplicator` enforces `dxos_sequence` exactly-+1 per `dxos_connectionId` —
     requires one ordered, gap-free stream per logical connection.
  2. Subduction's `connectionId` lifetime + `SUH\0` handshake magic + out-of-band
     `subduction-reconnect` encode "one logical connection, server may hibernate".
  3. Per-frame metering (`Metering.WsMessageEvent`) must be reproduced.
- No UDP/TCP sockets anywhere in the repo; the only container (sandbox-service) is a CF
  Container with HTTP-only ingress. **An iroh endpoint for EDGE must live in a new
  component** (CF Container or external host).

## 3. Strategic assessment

Splitting "iroh as primary transport" into its two distinct migrations:

### 3.1 P2P transport (replace WebRTC) — high value, one hard trade-off

**Wins:** dial-by-Ed25519-key matches DXOS identity; no SDP/ICE/TURN machinery (deletes
the ICE provider path and eventually CF TURN); working Node story (node-datachannel
segfaults today → untestable transport); wire-stable 1.0; QUIC streams map naturally onto
Teleport's needs; native↔native gets ~90% direct connections with encrypted relay
fallback; signaling load on EDGE shrinks to a one-shot address exchange (and can later
move to iroh discovery entirely).

**The trade-off:** **browser peers are relay-only.** Today, WebRTC gives Composer-web
browser↔browser _direct_ connections (with TURN fallback); with iroh, every
browser-involved p2p byte transits a DXOS-operated relay. For a browser-dominant product
this is a real regression in path quality and a new bandwidth cost center — the same
relay-shaped traffic profile as EDGE today, just on iroh infrastructure. For
Tauri/desktop/Node peers iroh is a strict improvement. Upstream WebTransport/WebRTC
direct paths for browsers are on iroh's roadmap but not committed.

**Consequence:** the migration must be built as a **hybrid with per-connection selection**
(composite factory), so we can run iroh-preferred for native pairs immediately and make
the browser↔browser call (iroh-relay vs keep-WebRTC) on measured data, not upfront.

### 3.2 Client↔EDGE transport (replace the router WebSocket) — lower value, do second

The EDGE websocket is not the pain point WebRTC is: it is a single ordered TLS stream on
443, already hibernation-aware, metered, and authenticated. Since workerd cannot terminate
QUIC, iroh-to-EDGE requires a **gateway** (native process) that bridges iroh ↔ the
Workers runtime — and for browser clients the path becomes
`browser → relay (WS) → gateway (QUIC) → edge (WS/RPC)`, which is strictly more hops than
today's direct WS unless the relay+gateway are colocated. The payoffs are architectural:
one transport stack and identity model everywhere, EDGE as "just another iroh peer"
(dialable by key), 0-RTT reconnects, and the option for native clients to reach EDGE
without Cloudflare in the loop. Plan it as Phase 4, gated on Phase 1–3 metrics, with a
transparent-gateway design that requires **zero changes to the edge repo** to pilot.

## 4. Target architecture

```text
                       ┌───────────────────────────┐
                       │   DXOS iroh relay fleet   │  (iroh-relay, self-hosted or n0-managed,
                       │  (HTTPS/WSS, auth callout)│   colocated with EDGE regions)
                       └─────┬────────────┬────────┘
                     WSS (wasm)         WSS/QUIC
                             │            │
Browser Composer ── wasm iroh┘            │
   (worker-side endpoint)                 │
Native Composer/Tauri/agents ── @dxos/iroh-node (napi) ── direct QUIC (~90%) ──┐
                                                                               │ p2p (Teleport over
                                                                               │  iroh bidi streams)
EDGE  ◄── edge-iroh-gateway (CF Container or external) ── iroh endpoint ───────┘
      │        │ (Phase 4: ALPN /dxos/edge/1, VP auth, Message envelope bridge)
      │        └── WS/service-binding into RouterObject / MessageSink seams
      └── existing WS `/ws/:identity/:peerKey` retained as fallback throughout
```

- **Key mapping:** keep DXOS peerKey and iroh EndpointId separate; announce
  `{ endpointId, relayUrl, directAddrs }` through the existing signaling `Signal` Struct
  (per-connection) and optionally the `PeerInfo.state` announce blob (per-swarm). This is
  `DESIGN.md` D1-Option-C; revisit key unification (peerKey == EndpointId, eliminating
  address exchange entirely) only after the transport is proven.
- **Stream mapping:** one iroh connection per remote peer; one QUIC bidirectional stream
  per swarm topic (mirrors `RtcPeerConnection`'s one-peer-connection/N-data-channels
  pattern, `rtc-peer-connection.ts:76`). Teleport keeps its own muxer on top initially —
  double-muxing is accepted; mapping Teleport channels onto native QUIC streams is a
  later optimization, not part of the migration.
- **Browser placement:** the wasm endpoint needs only `WebSocket`, which exists in
  workers — so in shared/dedicated-worker mode the endpoint lives **in the worker**,
  eliminating the `RtcTransportProxy`/`BridgeService` tab indirection WebRTC requires.
  This is a meaningful simplification of the client networking topology.

## 5. Phases

### Phase 0 — Bindings, relay, spikes (de-risk; no dxos-repo behavior change)

1. **`@dxos/iroh-node`**: adopt `@number0/iroh` (napi, 1.1.0) behind a thin wrapper
   package; verify endpoint/dial/accept/bidi-stream APIs, darwin-x64 gap (build or
   exclude), and Node 20/22 support in agents + Tauri.
2. **`@dxos/iroh-wasm`**: new Rust wasm-bindgen crate wrapping `iroh` (endpoint + connect
   - accept + bidi streams, relay-only). Measure bundle size (target: lazy-loaded chunk in
     the worker), Safari/WebKit behavior, connection setup latency through a relay.
3. **Relay spike**: deploy one `iroh-relay` (fly.io/Hetzner-class host) with HTTP-callout
   auth stubbed; interop test browser-wasm ↔ node peers; measure connect times against the
   10 s `TRANSPORT_CONNECTION_TIMEOUT` and relay throughput for automerge-sync-shaped
   traffic. Decide self-host vs n0-managed (D3 below).
4. **CF Container spike** (for Phase 4): can a Container-hosted iroh endpoint get direct
   paths via outbound-initiated hole-punch, and does outbound UDP work at all? (Both
   unverified upstream.) Outcome decides gateway hosting: Container vs external host.

Exit criteria: browser↔node iroh connection over our relay carrying a Teleport session in
a spike harness; go/no-go numbers for connect latency and relay bandwidth.

### Phase 1 — `IrohTransport` in MESH (flag-gated, parallel to WebRTC)

New package `packages/core/mesh/iroh` (`@dxos/iroh`, private):

- `IrohEndpointManager` — one endpoint per device, keypair persisted alongside device
  state; platform adapter selects `@dxos/iroh-node` vs `@dxos/iroh-wasm`.
- `IrohTransportFactory` / `IrohTransport implements Transport` —
  - initiator: `sendSignal({ payload: { endpointId, relayUrl, directAddrs } })`; dial on
    the remote's signal; responder: accept by ALPN `/dxos/mesh/teleport/1`, correlate to
    the `Connection` via `sessionId` carried in the stream header.
  - pipe `options.stream` ↔ QUIC bidi stream with backpressure; emit
    `connected`/`closed`/`errors` per the `Connection` contract; map iroh conn stats to
    `TransportStats`; `getDetails()` reports direct-vs-relay path.
- Config plumbing (from the code map):
  - `config.proto`: `Runtime.Client.transport` enum field **17**
    (`WEBRTC | IROH | IROH_PREFERRED | MEMORY`), `Runtime.Services.iroh` message field
    **20** (`relay_url`, `fallback_relay_url`); `dx-env.yml`: `DX_TRANSPORT`,
    `DX_IROH_RELAY_URL`.
  - `TransportKind.IROH`; thread selection through `service-host.ts:435`,
    `local-client-services.ts:82`, worker runtime (endpoint-in-worker — no proxy).
  - Make `TRANSPORT_CONNECTION_TIMEOUT` configurable (`connection.ts:28`).
- **Composite factory**: `createHybridTransportFactory(primary, fallback)` — attempt
  iroh when the peer has announced iroh addressing, fall back to WebRTC on failure or
  absence. Per-pair decision, silent to the app, diagnostics events for devtools
  (mirrors `DESIGN.md` D5).
- **Testing**: `TransportKind.IROH` in `network-manager/src/testing/test-builder.ts` +
  run `basic-test-suite` and `teleport-e2e` over it (node↔node with a local relay or
  direct). This gives MESH its first non-memory transport with green CI.

### Phase 2 — Iroh-preferred p2p in Composer (labs)

- Enable `transport: IROH_PREFERRED` in Composer behind labs/dev (same gating as
  `plugin-iroh-beacon`, which stays the UI surface for transport status).
- Telemetry: connect success rate, direct-vs-relay ratio, time-to-connected, bytes via
  relay — segmented browser↔browser / browser↔native / native↔native; compare against
  WebRTC cohorts. Surface in devtools via existing `transportStats`/`ConnectionInfo`.
- Fix-forward on the known hazards: multiple topics per peer (stream-per-topic), offline/
  online transitions (`setConnectionState`), shared-worker session election.

### Phase 3 — Primary for p2p (default flip)

- Flip default to `IROH_PREFERRED` in `config-service.ts` defaults + Composer `dx.yml`
  once Phase 2 metrics hold. Decision point (data-driven): browser↔browser pairs —
  iroh-relay vs retaining WebRTC for that pair class only.
- Begin decommission: remove ICE-provider dependency where iroh is primary; WebRTC stays
  available behind config until Phase 4 exit.
- Presence/gossip work from `DESIGN.md` (Phases 1–2 there) can now run on the same
  endpoints (Rust-side `iroh-gossip` needs its own FFI shim — not exposed in official JS
  bindings; only needed for the presence track, not for transport).

### Phase 4 — EDGE over iroh (gateway)

**4a — Transparent gateway (zero edge-repo changes):** a native service
(`edge-iroh-gateway`, Rust or Node+napi; CF Container if the Phase 0 spike is positive,
else external host colocated with the relay) that:

- runs an iroh endpoint with a well-known EndpointId published in client config
  (`runtime.services.iroh.edgeEndpointId`);
- accepts ALPN `/dxos/edge/1`; first frame carries the client's Verifiable Presentation
  (+ a server nonce — fixing the replayability TODO rather than porting it);
- on auth, opens the standard authenticated WS to
  `wss://edge…/ws/:identity/:peerKey` on the client's behalf and pipes `Message`
  envelope frames 1:1 (keeping `WebSocketMuxer` segmentation, the `__ping__` liveness,
  and therefore all `RouterObject` semantics — hibernation, metering, ordering — intact).
- Client side: `EdgeIrohConnection implements EdgeConnection`
  (`send/onMessage/onReconnected/setIdentity`) selected by config; one QUIC bidi stream
  per connection preserves the automerge `dxos_sequence` and Subduction single-stream
  invariants by construction.

**4b — Native integration (edge-repo changes, only if 4a proves value):** replace the
gateway's client-WS hop with direct ingress: a trusted gateway ingress route/service
binding calling the existing seams — inbound `MessageSink.receiveMessage(ctx, message,
auth)`, outbound by generalizing `RouterObject._relayMessage`/`_getSocket` into a
`resolveConnection(peerKey)` that can return a gateway route; connection state moves from
the WS attachment to explicit DO storage. Re-implement per-frame metering at the ingress.

Exit criteria for calling iroh "primary for edge & composer": default-on p2p
(Phase 3) + gateway path default for native clients, with the router WS retained as the
browser fallback until relay+gateway latency/cost matches it.

## 6. Decisions needed (numbered; recommendations first)

1. **Browser↔browser policy** — (a) _recommended:_ hybrid — iroh-preferred everywhere,
   keep WebRTC for browser↔browser pairs until measured relay cost/latency is acceptable
   or upstream ships browser direct paths; (b) iroh-relay-only everywhere (simpler, pays
   relay cost, path-quality regression); (c) defer any browser flip until upstream
   WebTransport lands (blocks "primary" indefinitely).
2. **Relay operations** — (a) _recommended:_ self-host `iroh-relay` colocated with EDGE
   regions, auth via HTTP callout to EDGE-issued tokens; (b) n0 managed relays
   (~$0.27/relay/hour, less ops, version-locked); (c) n0 public relays — dev/test only,
   never production.
3. **Scope of "primary for edge"** — (a) _recommended:_ p2p-primary first (Phases 1–3),
   EDGE gateway as Phase 4 behind its own flag; (b) run both tracks in parallel from the
   start (more risk, faster to the end-state); (c) p2p only — drop the edge-transport
   goal (revisit later).
4. **Key mapping** — (a) _recommended:_ separate iroh keypair, addressing announced via
   signaling Struct (no proto change, D1-C); (b) derive EndpointId from the device key
   (unified identity, couples secret handling to iroh; revisit post-Phase 3).
5. **Gateway hosting** — decide after the Phase 0 CF Container spike: (a) CF Container
   next to the edge worker; (b) external host colocated with the relay fleet.

## 7. Risks

| Risk                                                                            | Mitigation                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Browser relay-only → all browser p2p bandwidth on our relays                    | Hybrid factory (Decision 1a); colocate relays; telemetry before default flip; track upstream WebTransport. |
| Relay fleet = new production infra (incl. security patches, cf. 1.0.2)          | Ops runbook in Phase 0; consider n0-managed for the first year.                                            |
| `@number0/iroh` API surface is endpoint-only; gossip/blobs need custom Rust FFI | Transport phases need none of them; presence track owns that shim separately.                              |
| wasm bundle size / worker init latency in Composer                              | Lazy chunk in the worker; measure in Phase 0 before committing.                                            |
| 10 s connect timeout vs hole-punch+relay-fallback tail                          | Make timeout configurable (Phase 1); measure in Phase 0.                                                   |
| Double-muxing (Teleport muxer over QUIC) inefficiency                           | Accepted for migration; QUIC-stream-per-Teleport-channel is a post-migration optimization.                 |
| Automerge/Subduction ordering invariants over a new transport                   | One bidi stream per logical connection by construction (Phases 1, 4a).                                     |
| Edge gateway is a stateful native service in a stateless-worker architecture    | 4a keeps all state in existing `RouterObject`; gateway holds only live socket pairs.                       |
| darwin-x64 prebuild missing in `@number0/iroh`                                  | Build in CI or gate native path to arm64 initially.                                                        |

## 8. Package/file inventory (what gets created/touched)

- **New:** `packages/core/mesh/iroh` (`@dxos/iroh`: endpoint manager, transport factory);
  `@dxos/iroh-wasm` (Rust crate, likely separate repo or `tools/`); `edge-iroh-gateway`
  (Phase 4; lives with the relay deployment, not in workerd).
- **Modified (dxos):** `config.proto` (+ regenerated), `config-service.ts` defaults,
  `dx-env.yml`, `transport.ts` (`TransportKind.IROH`), `connection.ts` (configurable
  timeout), `service-host.ts`, `local-client-services.ts`, `worker-runtime.ts`,
  `network-manager/src/testing/test-builder.ts` + test suites, Composer `dx.yml`
  (labs → default), `plugin-iroh-beacon` (real transport status instead of hardcoded
  `'gossip'`).
- **Modified (edge):** none until Phase 4b; then `router.ts` (`resolveConnection`),
  a gateway ingress entrypoint, metering at ingress.
