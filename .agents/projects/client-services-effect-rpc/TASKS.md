# client-services protobuf → effect-rpc conversion — Tasks

_Resume: Transport seam (PR #12127) and internal service architecture (PR #12214) audited
DONE against `main` source. Phase 4 (protobuf-removal pass) now IMPLEMENTED for 9 of 13
services — `ContactsService`, `EdgeAgentService`, `DevicesService`, `NetworkService`,
`InvitationsService`, `IdentityService`, `SystemService`, `LoggingService`, `FeedService` —
plus the `service {}` block only (message types kept, all shared) for `QueryService`. Each
service's proto `service {}` block and now-orphaned request/response messages were deleted
from `.proto`; `gen-service-rpcs.ts`'s SERVICES list trimmed to the 3 remaining
proto-generated services (`SpacesService`, `DataService`, `DevtoolsHost`);
`@dxos/client-protocol`'s deprecated `ClientServices` type re-sourced off hand-written
Promise/Stream interfaces (`EdgeAgentServicePromise`, `DevicesServicePromise`,
`FeedServicePromise`, `IdentityServicePromise`, `InvitationsServicePromise`,
`LoggingServicePromise`, `NetworkServicePromise`, `SystemServicePromise`,
`QueryServicePromise`) sourced either from the still-live proto modules (types still shared
outside the RPC boundary) or from the effect-rpc namespaces in `@dxos/protocols/rpc`
(`ContactsService` entry dropped outright — zero consumers). One entire file,
`dxos/client/feed.proto`, was deleted (fully orphaned); `dxos/client/logging.proto` had its
imports pruned to match. `NetworkService.ts` gained one genuinely-new inline schema
(`SubscribeMessagesRequest`, moved off `dxos.edge.signal.SubscribeMessagesRequest`, which is
now deleted from `edge/signal.proto` since nothing else referenced it). Two additional host
implementations beyond `client-services` needed fixing to the new `FeedService.` namespace
types: `echo-host`'s `echo-host.ts`/`local-feed-service.ts`. `plugin-calls` needed a new
`@dxos/client-protocol` dependency to pick up `ClientServices['NetworkService']`.
VERIFIED: `protocols`/`client-protocol`/`client-services`/`client`/`echo-host`/`devtools`/
`react-client`/`shell`/`plugin-client`/`plugin-space`/`plugin-calls`/`client-e2e`/
`observability`/`blade-runner`/`stories-inbox` build and lint clean; `protocols`/
`client-protocol`/`client-services`/`client`/`echo-host`/`plugin-calls` tests green — the two
`client:test` failures seen under full-suite parallelism (`dedicated-worker-client-services.test.ts`
"connect client", "two clients share coordinator") are a pre-existing tight-timeout
(1-2s) flake, confirmed passing in isolation (7/7, unrelated to this change), same pattern as
the earlier `feed-syncer.test.ts` flake found in the first round. Remaining 3 services
(`SpacesService`, `DataService`, `DevtoolsHost`) deliberately deferred — largest, most
`protoMessage`-retained, not attempted this round. Payload-schema inlining + native-MessagePort
transport work from `dm/worker-package` (last touch 2026-07-10) remains stalled/unmerged,
badly diverged from `main`, never opened as a PR — separate from this pass, not attempted here
(see item 3 below and DESIGN.md's scope note on why item 4 deliberately excludes it)._

## Phase 1: RPC transport seam (protobuf peer → effect-rpc)

- [x] **Replace `createProtoRpcPeer`/`RpcPeer` on the client-services seam with `@effect/rpc`**
      — PR #12127, merged 2026-07-09. 13 client services, generated `RpcGroup` definitions
      (`scripts/gen-service-rpcs.ts`), custom `RpcClient.Protocol`/`RpcServer.Protocol` over
      `RpcPort` in `@dxos/rpc/effect-rpc.ts`.
- [x] **Migrate `dxos.iframe.WorkerService` (tab→worker control) off protobuf** — PR #12204;
      served via effect-rpc `WorkerService` in `@dxos/protocols/rpc` over the app `MessagePort`.
- [x] **Fix the shell↔app client-services connection**, broken by #12127's migration — PR #12191;
      `Client` now re-serves to the shell iframe over effect-rpc instead of the removed protobuf
      peer. Distinct from `AppService`/`ShellService` below (the iframe's own control protocol,
      still protobuf).
- [x] **Remove legacy protobuf byte-transport providers** (`fromSocket`, `fromAgent`,
      `AgentClientServiceProvider`) — PR #12206.
- [x] **Drop the dead `descriptors`/`ServiceRegistry` proto-bundle surface** — PR #12201 (prep,
      no consumers). PR #12190 (JSDoc parity pass) documents why full deletion wasn't yet safe
      at that point.
- [ ] **`dxos.mesh.bridge.BridgeService` (WebRTC transport bridge)** — still protobuf, no
      migration started. Deliberate/retained, not scheduled.
- [ ] **`dxos.iframe.AppService`/`ShellService` (shell↔app iframe transport)** — still
      protobuf, no migration started. Deliberate/retained, not scheduled.
- Out of scope by design: teleport extensions (gossip/object-sync/replicator), signal client,
  `websocket-rpc` devtools remote proxy — not part of this conversion.

## Phase 2: Internal service architecture (imperative classes → Effect services)

- [x] **Kill shared-worker path** — PR #12214 phase 1.
- [x] **`WorkerRuntime`/`WorkerSession` → Effect `Context.Tag` + `Layer`** — PR #12214 phase 2.
- [x] **Delete `ServiceRegistry`; handlers resolved from Context** — PR #12214 phase 3.
- [x] **Fold `ServiceContext` into `ClientServicesHost`** — PR #12214 phase 4. Verified in
      current `main` source: `service-host.ts:162` (`ServiceContext` type alias),
      `service-host.ts:929` (`ClientServicesHostService` self-provision breaking the circular
      dependency).
- [ ] **Doc cleanup: reconcile `packages/sdk/client-services/TASKS.md`** — its Phase 4
      checkboxes are stale/unchecked against the shipped #12214 solution (that file arrived on
      `main` via an unrelated PR #12516 squash, dated to before #12214's actual approach existed).
- [ ] **Decide fate of PR #12193** (`replace ServiceContext class with effect-native
lifecycle`) — open since 2026-07-13, proposes an alternate mechanism for the same problem
      #12214 already shipped differently. Likely close-as-superseded; needs the author/reviewer's
      call, not a unilateral close.

## Phase 3: RPC payload encoding (protobuf bytes on the wire → inline Effect schemas)

Design spec (as of 2026-07-10, unrevised since): `plans/worker-package/service-rpc-schemas.md`.
Rule: inline as `Schema.Struct` only messages whose sole consumers are the service-RPC
boundary; anything shared outside it (client proxies, echo-client, plugins, devtools UI) stays
`protoMessage` **permanently by design** — not migration debt.

Work happened on `origin/dm/worker-package`, never merged, never opened as a PR, stalled
since 2026-07-10 (commit `877a2a14b7`) and now badly diverged from `main` (predates PR #12214;
no clean rebase path — reviving this means re-deriving the relevant commits against current
`main`, not merging).

- [x] **(on dm/worker-package, uncommitted-to-main) Inline service-only RPC payloads as Effect
      schemas** — commit `239ad1702a`. Per-service breakdown in
      `plans/worker-package/service-rpc-schemas.md` §"Per-service summary".
- [~] **(on dm/worker-package) Phase A — app-port transport off generic `RpcPort` onto native
  `@effect/platform-browser` `BrowserWorker`/`BrowserWorkerRunner` MessagePort-direct
  platform** — commit `47c158cf7c`. Code landed but **not verified green**: suite 1 of
  `effect-rpc.test.ts` was 8/10 failing (`RpcClosedError`, suspected `MessagePort.start()` /
  runtime-lifecycle-ordering regression after the `MessageChannel` switch). Devtools extension
  RPC bridge (`window.postMessage` ↔ content script) broke and was never re-bridged.
- [ ] **Phase B — define `WorkerService`/`BridgeService` as generated effect-rpc groups**
      (`packages/core/protocols/src/WorkerService.ts`, `BridgeService.ts`) — not started.
      **Hazard:** running the full `gen-service-rpcs.ts` generator against the hand-edited
      inline-schema service files overwrites them; needs a targeted generation path or manual
      files (see `plans/worker-package/rpc-effect.md` Phase B note).
- [ ] **Phase C — system port to duplex effect-rpc**: fold `WorkerService` (tab→worker) into
      the app RPC group; flip `BridgeService` (worker→tab) to a worker-side runner over a
      renamed `bridgePort`; retire `SharedWorkerConnection`'s `createProtoRpcPeer` usage — not
      started.
- [ ] **Phase D — cleanup**: retire `createWorkerPort` where fully replaced (keep for OPFS
      worker); drop `makeProtocolRpcPortClient`/`layerProtocolRpcPort*` from `@dxos/rpc/effect-rpc`
      if no consumers remain — not started.
- [ ] **Relocate or delete stray plan docs** — `plans/worker-package/*.md` landed on `main` via
      an unrelated PR #12516 squash artifact; per repo convention these belong under
      `agents/superpowers/{specs,plans}/` or this project's directory, not a root `plans/` folder.

## Phase 4: Protobuf-removal pass (this session) — see DESIGN.md §4 for the full spec

Finishes item 3 by deleting the now-dead protobuf `service {}` blocks for the 13 migrated
client services (message types stay; `BridgeService`/`AppService`/`ShellService` untouched).
One service at a time, build+test verified before the next:

- [x] **`ContactsService`, `EdgeAgentService`** — no inlining needed (both were already
      all-`protoMessage` per `service-rpc-schemas.md`'s table). Proto `service {}` blocks
      deleted from `dxos/client/services.proto`; `gen-service-rpcs.ts` SERVICES entries
      removed; `@dxos/client-protocol`'s `service.ts` `ClientServices` type fixed
      (`EdgeAgentServicePromise` hand-written to match the deleted proto interface exactly —
      the real unblocking work, since `client.services.services.EdgeAgentService` is actively
      used by `plugin-client`/`plugin-space`/`shell`/`devtools`/several e2e tests;
      `ContactsService` entry dropped, confirmed zero consumers via repo-wide grep).
- [x] **`DevicesService`, `NetworkService`, `InvitationsService`** — done. `NetworkService`
      needed one genuinely new inline schema (`SubscribeMessagesRequest`, replacing the
      `dxos.edge.signal.SubscribeMessagesRequest` it borrowed, now deleted from
      `edge/signal.proto` since nothing else referenced it). `plugin-calls` needed a new
      `@dxos/client-protocol` dependency to reach `ClientServices['NetworkService']`
      (`call-swarm-synchronizer.ts`).
- [x] **`IdentityService`, `SystemService`, `LoggingService`, `FeedService`** — done.
      `dxos/client/feed.proto` was fully orphaned and deleted outright;
      `dxos/client/logging.proto` had its `Metrics`/`ControlMetrics*`/`QueryMetrics*` messages
      and now-unused imports removed. `FeedProtocol.ts`'s re-export source moved from
      proto-gen to `FeedService.ts`. Two host implementations beyond `client-services` needed
      redirecting to `FeedService.`-namespaced types: `echo-host`'s `echo-host.ts` and
      `local-feed-service.ts` (a second, independent `FeedService.Handlers` implementation).
- [ ] **`SpacesService`, `DataService`** — large; `DataService` has substitution-typed fields
      (`SpaceSyncState` embeds `Timeframe`) that must stay `protoMessage`. Deferred.
- [ ] **`DevtoolsHost`** — largest, most `protoMessage`-retained; do last. Deferred.
- [x] **`QueryService`** — no schema inlining needed (spec's table: "— (all shared)"); only
      the `.proto` `service {}` block itself removed from `echo/query.proto`. All message
      types (`QueryRequest`, `QueryResult`, `QueryResponse`, `QueryReactivity`, `Heads`) kept —
      confirmed heavily used outside the RPC boundary (echo-client, echo-host, edge-client,
      functions-runtime-cloudflare).
- [x] **Every service above, once its proto block was gone**: checked whether
      `@dxos/client-protocol`'s `ClientServices` type still imported that service's
      Promise-shaped interface from proto, and replaced it — this was the recurring blocker.
      Remaining for `SpacesService`/`DataService`/`DevtoolsHost` when their turn comes.

### References

- PR #12127 — https://github.com/dxos/dxos/pull/12127 (merged, transport seam)
- PR #12214 — https://github.com/dxos/dxos/pull/12214 (merged, internal architecture fold)
- PR #12193 — https://github.com/dxos/dxos/pull/12193 (open, likely superseded)
- `packages/sdk/client-services/TASKS.md` — package-local ledger, stale Phase 4 notes
- `plans/worker-package/{rpc-effect,service-rpc-schemas,worker-framework}.md` — stalled-branch
  design notes, on `main` but out of place
- `origin/dm/worker-package` — the unmerged, unopened, now badly-diverged follow-up branch
