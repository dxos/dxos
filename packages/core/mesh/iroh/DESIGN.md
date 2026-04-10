# Iroh Transport for DXOS Mesh

## Overview

This document proposes extending the DXOS mesh networking layer with an [iroh](https://github.com/n0-computer/iroh)-based transport that runs **in parallel** with the existing EDGE client/server stack. Iroh provides peer-to-peer connectivity via QUIC, with automatic NAT traversal, relay fallback, and a "dial by public key" model that aligns well with DXOS's identity-based architecture.

The primary goals are:
1. Enable **direct peer-to-peer presence** exchange without routing through EDGE.
2. Provide a **decentralized gossip layer** (via iroh-gossip) for presence, awareness, and lightweight messaging.
3. Lay groundwork for future peer-to-peer data sync that bypasses the centralized server.

## Background

### Iroh at a Glance

| Property | Detail |
|----------|--------|
| Transport | QUIC over UDP (via noq) |
| Identity | Ed25519 keypair; peers addressed by public key (EndpointId) |
| NAT traversal | ICE-like hole-punching over QUIC; ~90% success rate |
| Relay fallback | Stateless relay servers; traffic remains E2E encrypted |
| Discovery | DNS (pkarr), mDNS (LAN), BitTorrent DHT (optional) |
| Protocol mux | ALPN-based; multiple protocols over single endpoint |
| Higher-level | iroh-gossip (pub-sub), iroh-blobs (content-addressed transfer), iroh-docs (KV store) |
| Browser support | WASM compilation works (v0.33+); relay-only (no raw UDP in browsers) |
| Status | v0.97 (Feb 2026), targeting 1.0 in Q1 2026 |

### Current DXOS Mesh Architecture

```
                    EDGE Server
                   /     |     \
              WebSocket  WS    WS
                /        |       \
           Peer A     Peer B    Peer C
              \        / \       /
               WebRTC   WebRTC
              (direct p2p when possible)
```

**Key abstractions (bottom-up):**

| Layer | Abstraction | Role |
|-------|------------|------|
| Transport | `Transport` / `TransportFactory` | Pluggable connection (WebRTC, TCP, Memory) |
| Wire Protocol | `WireProtocol` / `Teleport` | Multiplexed streams + extensions over transport |
| Signal | `SignalManager` / `SignalMethods` | Peer discovery + message routing (EDGE, WebSocket) |
| Swarm | `Swarm` / `SwarmNetworkManager` | Topic-based peer lifecycle + topology decisions |
| Extensions | `Gossip` / `Presence` | Application-level protocols over Teleport |

**Presence today** flows through the Teleport gossip extension: each peer periodically broadcasts `PeerState` (identityKey + connections list) over `Gossip.postMessage()`. This runs over WebRTC data channels established via EDGE signaling.

## Proposal

### Architecture: Parallel Iroh Sidecar

Rather than replacing the existing stack, iroh runs as a **parallel transport layer** alongside EDGE+WebRTC:

```
                    EDGE Server                    Iroh Relay
                   /     |     \                  /    |    \
              WebSocket  WS    WS            QUIC   QUIC   QUIC
                /        |       \            /      |       \
           Peer A     Peer B    Peer C     Peer A  Peer B  Peer C
              \        / \       /            \      / \      /
               WebRTC   WebRTC                 Direct QUIC
              (data sync, RPC)               (presence, gossip)
```

**Responsibilities split:**
- **EDGE + WebRTC**: Data sync (ECHO replication, automerge), RPC services, authentication -- unchanged.
- **Iroh**: Presence, awareness, lightweight peer-to-peer messaging, and (future) direct data sync.

### Integration Points

#### 1. IrohEndpointManager

A new service that manages the local iroh endpoint lifecycle:

```
IrohEndpointManager
  - Creates and manages a single iroh Endpoint (bound to the peer's device key).
  - Maps DXOS PublicKey <-> iroh EndpointId (Ed25519 keys on both sides).
  - Publishes addressing info (relay URL, direct addresses) via iroh discovery.
  - Provides connect(endpointId, alpn) -> Connection for higher-level protocols.
```

**Key design decision -- key mapping:**
- Option A: **Derive** iroh EndpointId from the existing DXOS device key (if both are Ed25519).
- Option B: **Generate** a separate iroh keypair and publish the mapping through EDGE or a shared ECHO object.
- Option C: **Announce** the iroh EndpointId in the existing DXOS presence payload so peers learn each other's iroh addresses through the current stack.

Option C is the most pragmatic bootstrap approach -- it avoids key management complexity and uses the existing trusted channel to distribute iroh addresses.

#### 2. IrohPresenceExtension

A Teleport-independent presence system that uses iroh-gossip:

```
IrohPresenceExtension
  - Joins an iroh-gossip topic derived from the DXOS space key.
  - Broadcasts PeerState (identity, cursor position, custom awareness data).
  - Receives PeerState from other peers via gossip subscription.
  - Exposes the same Presence API (getPeersOnline, updated event, etc.).
```

**Topic mapping:** Each DXOS space (or swarm topic) maps to an iroh-gossip TopicId (32 bytes). Derived deterministically: `TopicId = hash(space_key + "presence")`.

**Bootstrap:** Peers discover each other's iroh EndpointIds through the existing EDGE presence channel (Option C above), then use those addresses to join the gossip topic.

#### 3. IrohTransportFactory (Future)

A `TransportFactory` implementation that creates iroh QUIC connections instead of WebRTC:

```typescript
// Future: plug into existing SwarmNetworkManager
const irohTransportFactory: TransportFactory = {
  createTransport(options: TransportOptions): Transport {
    // Use iroh endpoint to connect to remote peer via QUIC.
    // Wrap the QUIC bidirectional stream as a Node.js Duplex.
    // Signal channel not needed (iroh handles its own signaling).
  }
};
```

This is a later phase -- presence via gossip is the first milestone.

### Phased Rollout

#### Phase 1: Iroh Endpoint + Presence Bootstrap

**Goal:** Peers exchange iroh addressing info through existing EDGE presence, establishing a parallel iroh-gossip presence channel.

**Components:**
- `IrohEndpointManager` -- manages local iroh endpoint.
- Extended `PeerState` proto -- adds optional `irohEndpointId` and `irohRelayUrl` fields.
- `IrohGossipPresence` -- subscribes to iroh-gossip topic for a space, broadcasts/receives presence.
- `PresenceAggregator` -- merges presence data from both Teleport gossip and iroh gossip channels.

**Data flow:**
```
1. Peer A starts iroh endpoint, gets EndpointId + relay URL.
2. Peer A announces via existing Teleport gossip: PeerState { ..., irohEndpointId, irohRelayUrl }.
3. Peer B receives this, learns Peer A's iroh address.
4. Peer B connects to Peer A via iroh, joins gossip topic for the space.
5. Both peers now exchange presence over iroh-gossip (lower latency, no EDGE hop).
6. If iroh connection fails, presence falls back to Teleport gossip (already running).
```

#### Phase 2: Direct Messaging

**Goal:** Peer-to-peer RPC and ephemeral messaging over iroh QUIC streams.

**Components:**
- Custom ALPN protocol for DXOS messaging (`/dxos/messaging/1`).
- `IrohMessenger` -- send/receive typed messages over bidirectional QUIC streams.
- Use cases: cursor positions (high frequency), typing indicators, collaborative editing signals.

#### Phase 3: Iroh as Transport

**Goal:** Iroh as an alternative `TransportFactory` for the mesh, running Teleport over QUIC instead of WebRTC.

**Components:**
- `IrohTransportFactory` implementing `TransportFactory`.
- `IrohSignalManager` implementing `SignalManager` (using iroh's built-in discovery instead of EDGE signaling).
- Full Teleport extension stack (gossip, object-sync, replication) running over iroh.

#### Phase 4: Reduced EDGE Dependency

**Goal:** EDGE becomes optional for connected peers; iroh handles discovery, messaging, and data sync directly.

### Browser Considerations

Iroh compiles to WASM but browsers lack raw UDP access. Browser peers will:
- Connect through iroh relay servers (similar to WebRTC TURN).
- Traffic remains E2E encrypted; relay cannot read data.
- Direct browser-to-browser connections are not possible via iroh today (WebRTC DataChannel integration is on iroh's long-term roadmap).

**Implication:** For browser-only deployments, the latency profile is similar to the current WebRTC-via-EDGE model. The benefit is decoupling from EDGE for discovery and presence. Native/Electron/Tauri peers get true direct connections.

### WASM Integration Strategy

Since there is no ready-made NPM package for iroh:

1. **Option A: WASM bundle** -- Compile a minimal Rust crate (`iroh-endpoint` + `iroh-gossip`) to WASM via `wasm-bindgen`. Publish as an internal `@dxos/iroh-wasm` package. Thin TypeScript wrapper exposes typed APIs.

2. **Option B: Native sidecar** -- For Tauri/Electron, run iroh as a native Rust process. Communicate via IPC (stdin/stdout, Unix socket, or HTTP). Browser falls back to WASM.

3. **Option C: Hybrid** -- WASM for browsers, native for desktop. Unified TypeScript API abstracts the difference.

Option A (WASM-first) is recommended for Phase 1 since it works everywhere and keeps the deployment model simple.

### Key Identity Mapping

| DXOS Concept | Iroh Concept | Mapping |
|--------------|-------------|---------|
| Device Key (Ed25519 PublicKey) | EndpointId (Ed25519 PublicKey) | Derived or announced |
| Identity Key | No equivalent | Announced in gossip payload |
| Space Key / Swarm Topic | Gossip TopicId (32 bytes) | `hash(spaceKey \|\| "presence")` |
| EDGE WebSocket URL | Relay URL | Configured or discovered |

### Proto Changes

```protobuf
// Extend existing PeerState (dxos/mesh/presence.proto)
message PeerState {
  dxos.keys.PublicKey identity_key = 1;
  repeated dxos.keys.PublicKey connections = 2;
  dxos.keys.PublicKey peer_id = 3;

  // New: iroh addressing info.
  optional bytes iroh_endpoint_id = 10;
  optional string iroh_relay_url = 11;
}
```

### Package Structure

```
packages/core/mesh/iroh/
  src/
    iroh-endpoint-manager.ts    -- Manages local iroh endpoint lifecycle.
    iroh-gossip-presence.ts     -- Presence over iroh-gossip topics.
    presence-aggregator.ts      -- Merges presence from multiple sources.
    iroh-transport-factory.ts   -- (Phase 3) TransportFactory implementation.
    wasm/
      iroh-bindings.ts          -- TypeScript wrapper over WASM bindings.
    testing/
      mock-iroh-endpoint.ts     -- In-memory mock for testing.
```

## Design Decisions

### D1. Key Derivation vs Announcement

How should DXOS peers obtain their iroh EndpointId?

| Option | Pros | Cons |
|--------|------|------|
| **A. Derive from DXOS device key** | Single identity; no extra key management; verifiable mapping | Couples crypto implementations; DXOS key format must stay Ed25519; harder to rotate iroh key independently |
| **B. Separate keypair, announced via EDGE** | Decoupled; can rotate independently; works regardless of DXOS key type | Extra key to manage/persist; requires trusted channel to distribute; identity not cryptographically linked |
| **C. Separate keypair, announced via presence payload** | Same as B, but uses existing gossip channel; no EDGE API changes | Same as B; bootstrap depends on existing presence working first |

**Recommendation: Option C** for Phase 1. Pragmatic bootstrap -- uses the existing trusted channel, avoids coupling crypto implementations, and works today. Option A can be revisited once iroh is proven and we understand whether key unification is worth the coupling.

### D2. WASM vs Native (Tauri)

How should iroh run in desktop (Tauri) vs browser environments?

| Option | Pros | Cons |
|--------|------|------|
| **A. WASM everywhere** | Single code path; simpler build/test; works in all environments | No UDP hole-punching in browser (relay-only); WASM overhead on desktop; larger bundle |
| **B. Native sidecar for Tauri, WASM for browser** | Full UDP/hole-punching on desktop; better performance; smaller browser bundle (lazy-loaded) | Two code paths; IPC complexity; harder to test; Tauri-specific build step |
| **C. Hybrid with unified TS API** | Best of both; platform-appropriate transport; clean abstraction | Most complex to build; API must abstract over different capabilities |

**Recommendation: Option A (WASM-first)** for Phase 1. Keeps the deployment model simple and lets us validate the architecture before investing in platform-specific optimizations. Option B/C for Phase 3+ once we need direct UDP connectivity for data sync on desktop.

### D3. Relay Infrastructure

Who operates the iroh relay servers?

| Option | Pros | Cons |
|--------|------|------|
| **A. n0's public relays only** | Zero ops burden; free; maintained by iroh team | Rate-limited; no SLA; dependency on third party; latency may vary |
| **B. DXOS-operated relays only** | Full control; SLA guarantees; geographic placement; isolated from other traffic | Ops burden; cost; must track iroh relay releases |
| **C. Configurable (default to provisioned)** | Flexibility; can use n0 for dev, DXOS-provisioned for production; self-hosted for enterprise | Configuration complexity; must test multiple configurations |

**Recommendation: Option C (configurable).** n0/iroh will provision dedicated relay infrastructure for DXOS. Default configuration points to these provisioned relays for production use. n0's public relays serve as fallback for development. Enterprise deployments can point to self-hosted relays. Configuration via DXOS client config:

```typescript
{
  iroh: {
    relayUrl: 'https://relay.dxos.iroh.network',  // Default: DXOS-provisioned by n0.
    fallbackRelayUrl: 'https://relay.iroh.network', // Default: n0 public.
  }
}
```

### D4. Presence Data Model

Should iroh presence carry richer data than the current `PeerState`?

| Option | Pros | Cons |
|--------|------|------|
| **A. Same PeerState as today** | Drop-in replacement; simple aggregation; proven data model | Doesn't leverage iroh's lower latency for high-frequency data |
| **B. Extended PeerState with app data** | Cursor positions, selections, typing indicators over p2p; lower latency than EDGE-routed gossip; enables new UX | Larger payloads; more complex serialization; must handle schema evolution |
| **C. Channeled: base presence + app-specific channels** | Clean separation; apps subscribe to channels they care about; base presence stays lightweight | More API surface; channel management complexity |

**Recommendation: Option C (channeled).** The iroh gossip layer should support multiple channels per topic -- a base `presence` channel for online/offline status (same as today's `PeerState`), plus app-defined channels for high-frequency data like cursor positions and typing indicators. This matches the existing `Gossip.postMessage(channelId, payload)` pattern and lets applications opt into richer presence without bloating the base protocol.

### D5. Failure Modes and Fallback

How should the system behave when iroh connectivity fails?

| Option | Pros | Cons |
|--------|------|------|
| **A. Silent fallback to Teleport gossip** | Seamless UX; always-available presence; no user-facing errors | Harder to debug; may mask persistent iroh issues; dual data sources can cause inconsistency |
| **B. Surface failure to application** | Transparent; app can adapt UI; easier to debug | More complex app-side handling; worse UX if errors are frequent |
| **C. Silent fallback + diagnostic events** | Best UX (seamless); observability via diagnostic channel; no user-facing errors but devtools/logs show iroh status | Slightly more complex than A; diagnostic events need consumer |

**Recommendation: Option C (silent fallback + diagnostics).** The `PresenceAggregator` merges both sources transparently -- if iroh drops, Teleport gossip continues and the application sees no gap. Iroh connection status is exposed via a diagnostic event (for devtools and logging) but not surfaced to end users. This matches the existing pattern where EDGE connection issues are logged but don't break the UI.

### D6. Phase 1 Scope

**Decision: General-purpose gossip with presence as the first consumer.**

Phase 1 delivers:
- `IrohEndpointManager` -- manages the iroh endpoint lifecycle.
- `IrohGossipChannel` -- generic channel abstraction over iroh-gossip topics.
- `IrohPresence` -- presence built on `IrohGossipChannel` (who's online, PeerState).
- `PresenceAggregator` -- merges Teleport and iroh presence sources.

Applications can create additional channels on the same gossip topic for cursor positions, typing indicators, or custom data. This avoids building presence-specific plumbing that would need to be generalized later.

### D7. WASM Bundle Size

**Decision: Lazy-load the iroh WASM bundle.**

Estimated size: 1-3 MB gzipped for a minimal build (endpoint + gossip). This is too large for the critical path bundle. The iroh module will be loaded on-demand when the first space is joined, behind a dynamic `import()`. The `IrohEndpointManager` initializes asynchronously and presence falls back to Teleport gossip until the WASM bundle is ready.

## Open Questions

1. **Key derivation vs announcement:** Decision D1 recommends announcement for Phase 1. Should we revisit derivation if we pursue key unification in Phase 3+?

2. **iroh API stability:** iroh is targeting 1.0 in Q1 2026 with one planned breaking change to the wire protocol. How do we insulate DXOS from pre-1.0 churn? Pin to a specific version and upgrade deliberately?

3. **Failure modes:** Decision D5 recommends silent fallback. Do we need a mechanism for the application to _prefer_ iroh when available (e.g., for latency-sensitive features), or is the aggregator always authoritative?

4. **EDGE independence timeline:** This project explores whether iroh can reduce EDGE dependency. What EDGE services beyond signaling (auth, admin, storage) would need alternatives before EDGE could become optional?

## References

- [iroh GitHub](https://github.com/n0-computer/iroh)
- [iroh documentation](https://docs.iroh.computer)
- [iroh-gossip](https://github.com/n0-computer/iroh-gossip) -- epidemic broadcast tree pub-sub
- [iroh & the Web](https://www.iroh.computer/blog/iroh-and-the-web) -- browser/WASM roadmap
- [iroh 1.0 roadmap](https://www.iroh.computer/blog/road-to-1-0)
- DXOS mesh: `packages/core/mesh/network-manager/src/transport/transport.ts`
- DXOS presence: `packages/core/mesh/teleport-extension-gossip/src/presence.ts`
- DXOS signal: `packages/core/mesh/messaging/src/signal-methods.ts`
