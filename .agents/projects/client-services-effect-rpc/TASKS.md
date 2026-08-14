# client-services protobuf → effect-rpc conversion — Tasks

_Resume: All three sub-efforts audited from git/GitHub history + current source, no code
changed this session. Transport seam (PR #12127) and internal service architecture
(PR #12214) are DONE and verified against `main` source. Payload-schema inlining +
native-MessagePort transport work stalled uncommitted-to-main on `dm/worker-package`
(last touch 2026-07-10) — that branch is now badly diverged from `main` and was never
opened as a PR. Next action: decide with the user whether to (a) resume the
`dm/worker-package` line by re-deriving its commits against current `main`, (b) call the
conversion done at the transport-seam level and close this out, or (c) just do the low-risk
doc cleanup (reconcile client-services/TASKS.md, close-or-update PR #12193, relocate the
stray `plans/worker-package/` docs) and park the rest. See DESIGN.md "Open questions"._

## Phase 1: RPC transport seam (protobuf peer → effect-rpc)

- [x] **Replace `createProtoRpcPeer`/`RpcPeer` on the client-services seam with `@effect/rpc`**
      — PR #12127, merged 2026-07-09. 13 client services, generated `RpcGroup` definitions
      (`scripts/gen-service-rpcs.ts`), custom `RpcClient.Protocol`/`RpcServer.Protocol` over
      `RpcPort` in `@dxos/rpc/effect-rpc.ts`.
- [x] **Migrate `dxos.iframe.WorkerService` (tab→worker control) off protobuf** — changeset
      `962c8cd`; served via effect-rpc `WorkerService` in `@dxos/protocols/rpc` over the app
      `MessagePort`.
- [x] **Remove legacy protobuf byte-transport providers** (`fromSocket`, `fromAgent`,
      `AgentClientServiceProvider`) — changeset `f15c632`.
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

### References

- PR #12127 — https://github.com/dxos/dxos/pull/12127 (merged, transport seam)
- PR #12214 — https://github.com/dxos/dxos/pull/12214 (merged, internal architecture fold)
- PR #12193 — https://github.com/dxos/dxos/pull/12193 (open, likely superseded)
- `packages/sdk/client-services/TASKS.md` — package-local ledger, stale Phase 4 notes
- `plans/worker-package/{rpc-effect,service-rpc-schemas,worker-framework}.md` — stalled-branch
  design notes, on `main` but out of place
- `origin/dm/worker-package` — the unmerged, unopened, now badly-diverged follow-up branch
