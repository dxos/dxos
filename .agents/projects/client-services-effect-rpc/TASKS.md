# client-services protobuf → effect-rpc conversion — Tasks

_Resume: Transport seam (PR #12127) and internal service architecture (PR #12214) audited
DONE against `main` source. Phase 4 (protobuf-removal pass) is now IMPLEMENTED for all 13
client services — `ContactsService`, `EdgeAgentService`, `DevicesService`, `NetworkService`,
`InvitationsService`, `IdentityService`, `SystemService`, `LoggingService`, `FeedService`,
`QueryService` (`service {}` block only, all message types shared), plus the final three
(`DataService`, `DevtoolsHost`, `SpacesService`) landed across PRs #12578/#12586/#12589 and a
follow-up round. Each service's proto `service {}` block and now-orphaned request/response
messages were deleted from `.proto`; `gen-service-rpcs.ts`'s SERVICES list is now fully empty
(every client service is hand-authored). `@dxos/client-protocol`'s deprecated `ClientServices`
type is entirely re-sourced off hand-written Promise/Stream interfaces (`EdgeAgentServicePromise`,
`DevicesServicePromise`, `FeedServicePromise`, `IdentityServicePromise`,
`InvitationsServicePromise`, `LoggingServicePromise`, `NetworkServicePromise`,
`SystemServicePromise`, `QueryServicePromise`, `DataServicePromise`, `DevtoolsHostPromise`,
`SpacesServicePromise`) sourced either from the still-live proto modules (types still shared
outside the RPC boundary) or from the effect-rpc namespaces in `@dxos/protocols/rpc`
(`ContactsService` entry dropped outright — zero consumers). Two entire files,
`dxos/client/feed.proto` and `dxos/echo/service.proto`, were deleted outright (fully orphaned);
`dxos/client/logging.proto`, `dxos/devtools/host.proto`, `dxos/client/services.proto` had their
now-dead messages/imports pruned to match (the latter two kept a handful of messages that stay
protobuf-encoded — see the per-service notes below).
VERIFIED: full-monorepo `moon exec :build` green; every directly touched package (`protocols`,
`client-protocol`, `client-services`, `client`, `echo-host`, `echo-client`, `devtools`,
`react-client`, `shell`, `plugin-client`, `plugin-space`, `plugin-calls`, `plugin-google`,
`plugin-onboarding`, `client-e2e`, `proto-guard`, `migrations`, `halo-adapter-client`,
`observability`, `blade-runner`, `stories-inbox`) builds, lints, and tests clean. Two flakes
confirmed pre-existing and unrelated (isolated re-runs pass): `client:test`'s
`dedicated-worker-client-services.test.ts` tight-timeout flake under full-suite parallelism, and
`echo-host:test`'s `automerge-repo-subduction.test.ts` "concurrent shutdown" timing flake.
Payload-schema inlining + native-MessagePort transport work from `dm/worker-package` (last touch
2026-07-10) remains stalled/unmerged, badly diverged from `main`, never opened as a PR —
separate from this pass, not attempted here (see item 3 below and DESIGN.md's scope note on why
item 4 deliberately excludes it)._

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
- [x] **`DataService`** — inlined `BatchedDocumentUpdates` and `SpaceSyncState` (the latter's
      `PeerState` nested type kept as a type-only `namespace` member, since a value-exporting
      namespace can't merge with an outer `const` of the same name). `dxos/echo/service.proto`
      was fully orphaned once these landed and was deleted outright; the dead
      `service DataService {}` block went with it. 10 consumer files across `echo-client`, `echo-host`,
      `functions-runtime-cloudflare`, and `client`/`client-protocol` redirected from the deleted
      proto module to `@dxos/protocols/rpc`'s `DataService` namespace.
- [x] **`DevtoolsHost`** — inlined 5 previously-`protoMessage` messages (`Event`, `StorageInfo`,
      `GetSnapshotsResponse`/`StoredSnapshotInfo`, `SubscribeToFeedsResponse`/`Feed`/`FeedOwner`,
      `SubscribeToSignalStatusResponse`/`SignalServer` — the latter's `state` field needed
      `Schema.Enum(SignalState)` importing the real `dxos.mesh.signal.SignalState` proto enum by
      value, matching the `IdentityRecovery.Kind` precedent, so assignment from
      `SignalManager.getStatus()` stays type-correct). `host.proto` kept only the 6 messages
      still embedding un-inlinable substitutions (`SubscribeToSpacesResponse`,
      `SubscribeToFeedBlocksResponse`, `SubscribeToMetadataResponse`, `GetSpaceSnapshotResponse`,
      `SaveSpaceSnapshotResponse`, `SignalResponse`); every other message body plus the dead
      `service DevtoolsHost {}` block and now-unused imports (`google/protobuf/empty.proto`,
      `dxos/halo/keyring.proto`, `dxos/halo/signed.proto`, `dxos/devtools/swarm.proto`,
      `dxos/rpc.proto`) were removed. 12 consumer files across `client-services`'s devtools/
      diagnostics packlets and `devtools` panels/hooks redirected.
- [x] **`SpacesService`** — no new inlining needed (all 15 request/response payloads were
      already hand-inlined by an earlier pass); the orphaned proto bodies and the dead
      `service SpacesService {}` block (plus several already-dead imports predating this pass:
      `google/protobuf/empty.proto`, `dxos/config.proto`, `dxos/edge/messenger.proto`,
      `dxos/edge/signal.proto`) were never cleaned up until now. `services.proto` kept only
      `Space`, `QuerySpacesResponse`, `JoinSpaceResponse`, `CreateEpochResponse`,
      `ContactAdmission` (still `protoMessage`-referenced). The widest fanout of this whole
      project: 20 consumer files (client, client-services, client-protocol,
      halo-adapter-client, migrations, devtools, plugin-space, plugin-google,
      plugin-onboarding, proto-guard, client-e2e) referenced the deleted `SpaceArchive`/
      `CreateEpochRequest.Migration`/etc. types, including several accessing enum _values_
      (`SpaceArchive.Format.BINARY`, `CreateEpochRequest.Migration.X`) — which don't carry over
      directly, since `Schema.Enum({...})`'s members live under `.enums.X`, not as direct
      properties (confirmed via the effect source: `Enum<A>` only exposes `{ enums: A }`, no
      per-key accessors). Every such call site was rewritten to
      `SpacesService.SpaceArchiveFormat.enums.X` / `SpacesService.Migration.enums.X`.
- [x] **`QueryService`** — no schema inlining needed (spec's table: "— (all shared)"); only
      the `.proto` `service {}` block itself removed from `echo/query.proto`. All message
      types (`QueryRequest`, `QueryResult`, `QueryResponse`, `QueryReactivity`, `Heads`) kept —
      confirmed heavily used outside the RPC boundary (echo-client, echo-host, edge-client,
      functions-runtime-cloudflare).
- [x] **Every service above, once its proto block was gone**: checked whether
      `@dxos/client-protocol`'s `ClientServices` type still imported that service's
      Promise-shaped interface from proto, and replaced it — this was the recurring blocker.
      Done for every service; `ClientServices` no longer imports any Promise-shaped interface
      from a generated proto `service {}` block.

### References

- PR #12127 — https://github.com/dxos/dxos/pull/12127 (merged, transport seam)
- PR #12214 — https://github.com/dxos/dxos/pull/12214 (merged, internal architecture fold)
- PR #12193 — https://github.com/dxos/dxos/pull/12193 (open, likely superseded)
- `packages/sdk/client-services/TASKS.md` — package-local ledger, stale Phase 4 notes
- `plans/worker-package/{rpc-effect,service-rpc-schemas,worker-framework}.md` — stalled-branch
  design notes, on `main` but out of place
- `origin/dm/worker-package` — the unmerged, unopened, now badly-diverged follow-up branch
