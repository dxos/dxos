# client-services protobuf → effect-rpc conversion — design & status

## Scope

Three layered efforts, easy to conflate — keep them distinct:

1. **RPC transport seam** (`clientServiceBundle`): the protobuf `createProtoRpcPeer`/`RpcPeer`
   machinery that carries client ⇄ worker/host service calls → `@effect/rpc` over `RpcPort`.
2. **Internal service architecture**: `WorkerRuntime`/`WorkerSession`/`ServiceContext`/
   `ClientServicesHost` as imperative Promise-based classes → Effect `Context.Tag` + `Layer`
   services. Orthogonal to (1) — this is about _how the host is built_, not _what's on the wire_.
3. **RPC payload encoding**: request/response messages riding the effect-rpc envelope as
   protobuf-encoded `Uint8Array` (`protoMessage(fqn)`) → hand-authored Effect `Schema.Struct`,
   for the subset of messages that exist only at the service-RPC boundary.

## Status

### 1. Transport seam — DONE

Shipped in **PR #12127** — _"feat: Replace client-services with effect-rpc"_ (dm/effect-rpc →
main, merged 2026-07-09). All 13 client services now serve/consume via `@effect/rpc` `RpcGroup`
definitions generated from the proto descriptors (`scripts/gen-service-rpcs.ts`), riding custom
`RpcClient.Protocol`/`RpcServer.Protocol` implementations over `RpcPort` (msgpack framing +
Ping/Pong handshake) in `@dxos/rpc/effect-rpc.ts` — chosen over the native
`@effect/platform-browser` `BrowserWorker` protocol because the client-services seam is
deliberately `RpcPort`-based (transport-agnostic: shared worker, dedicated worker, iframe
tunnel, devtools window messaging, linked test ports all carry it unchanged).

Explicitly **out of scope** in #12127, and their status since:

| Surface                                                                                                   | Then     | Now                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dxos.iframe.WorkerService` (tab→worker control)                                                          | protobuf | **migrated** — deleted from proto, served via effect-rpc `WorkerService` in `@dxos/protocols/rpc` over the app `MessagePort` (changeset `962c8cd`) |
| `fromSocket`/`fromAgent` byte-transport providers                                                         | protobuf | **removed entirely** — `f15c632`; `createClientServices` throws on `remote_source` now                                                             |
| `dxos.mesh.bridge.BridgeService` (WebRTC transport bridge, worker↔tab)                                    | protobuf | **still protobuf** — retained deliberately, no migration started                                                                                   |
| `dxos.iframe.AppService`/`ShellService` (shell↔app iframe transport)                                      | protobuf | **still protobuf** — retained deliberately, no migration started                                                                                   |
| Teleport extensions (gossip/object-sync/replicator), signal client, `websocket-rpc` devtools remote proxy | protobuf | **untouched** — lower-level wire protocols, not part of this conversion's scope                                                                    |

### 2. Internal service architecture — DONE

Shipped in **PR #12214** — _"client-services: remove shared-worker path; convert worker
runtime & host to Effect services"_ (merged 2026-07-16), four phases:
kill shared-worker → `WorkerRuntime`/`WorkerSession` as Effect services → delete
`ServiceRegistry` → fold `ServiceContext` into `ClientServicesHost`. Verified directly against
current `main` source: `ServiceContext` is a `type` alias for `ClientServicesHost`
(`service-host.ts:162`), the host self-provides via `ClientServicesHostService`
(`service-host.ts:929`) to break the circular dependency between the RPC handler layers and
the orchestrator they resolve.

`packages/sdk/client-services/TASKS.md` (committed to `main`, oddly bundled into an unrelated
PR #12516 squash — a rebase artifact, not intentional) still shows Phase 4 checkboxes
**unchecked** with a "blocked on circular dependency, not yet built" note. That note predates
#12214's actual solution (self-providing host) and is **stale documentation, not real
remaining work** — treat the source as ground truth over that file. Worth a follow-up commit
to reconcile the checkboxes so a future session doesn't re-litigate a solved problem.

PR **#12193** — _"client-services: replace ServiceContext class with effect-native lifecycle"_
— is still **open** (dmaretskyi, dm/remove-service-context-refactor-khq87s → main, last
updated 2026-07-14) and proposed a different mechanism (a slim `ClientLifecycleService` tag)
for the same problem #12214 solved differently. It predates #12214 by one day and was never
updated after #12214 merged — almost certainly **superseded and safe to close**, but that's a
call for its author/reviewer, not something to force from here.

### 3. RPC payload encoding — PARTIAL, work-in-progress branch stalled and stale

Design spec: `plans/worker-package/service-rpc-schemas.md` (see "Where the plan docs came
from" below). Rule: a message inlines as an Effect `Schema.Struct` only when its _only_
consumers are the effect-rpc service definition and the host implementation (service-boundary
messages); anything shared outside the RPC boundary (client proxies, echo-client, plugins,
devtools UI) stays `protoMessage` **permanently, by design** — this is not migration debt, it's
the intended end state per the spec's own table.

Actual inlining work happened on branch `dm/worker-package` (commit `239ad1702a`,
2026-07-10, "inline service-only RPC payloads as Effect schemas") alongside a deeper transport
change: routing the **app-port** channel off the generic `RpcPort`/msgpack protocol onto the
native `@effect/platform-browser` `BrowserWorker`/`BrowserWorkerRunner` MessagePort-direct
platform (`plans/worker-package/rpc-effect.md`, commit `47c158cf7c`). That plan's own phase
table, as of its last update (2026-07-10):

- **Phase A** (app-port → native MessagePort platform): code landed, but suite 1 of
  `effect-rpc.test.ts` was 8/10 failing (`RpcClosedError`, suspected `MessagePort.start()` /
  lifecycle-ordering issue after the `MessageChannel` switch) — **not verified green**.
- **Phase B** (define `WorkerService`/`BridgeService` as generated effect-rpc groups): **not
  started** — explicitly flagged high-risk because running the full `gen-service-rpcs.ts`
  generator against the hand-edited inline-schema service files clobbers them.
- **Phase C** (system port → duplex effect-rpc, folding `WorkerService` into the app group and
  flipping `BridgeService` to a worker→tab runner): **not started**.
- **Phase D** (cleanup — retire `createWorkerPort`, drop unused `RpcPort` client helpers):
  **not started**.
- Devtools extension RPC bridge (`window.postMessage` ↔ content script) was **broken** by the
  Phase A `MessagePort` switch and never re-bridged.

**Branch health:** `origin/dm/worker-package` has not been touched since 2026-07-10 (last
commit `877a2a14b7`). It diverged before PR #12214 (the architecture fold) landed, so reviving
it means re-deriving the worker-framework/payload-schema commits against current `main`
rather than merging or rebasing directly — `git log`/`git diff` against `origin/main` show
essentially no shared recent history to fast-forward from. No PR was ever opened for it.

## Where the plan docs came from

`plans/worker-package/{rpc-effect.md,service-rpc-schemas.md,worker-framework.md}` exist on
`main` (added by commit `fc83abdf`, 2026-08-08) bundled into an unrelated PR #12516 ("react-ui:
overlay the ScrollArea scrollbar thumb on content") — almost certainly a stray-file artifact
from a rebase/squash, not an intentional commit. They are dated notes about work on
`dm/worker-package` as of 2026-07-10 and were never updated after. Per this repo's convention
(`CLAUDE.md` → "Where things live"), planning docs like this belong under
`agents/superpowers/{specs,plans}/` or a project folder, not a root `plans/` directory — worth
relocating (or deleting, if the branch is abandoned rather than resumed) in a follow-up.

## Open questions for whoever resumes

1. Is the Phase A/B/C/D transport-and-payload work on `dm/worker-package` still wanted, or
   was the protobuf transport removal (PR #12127) considered "done enough" and this deeper
   pass abandoned? Nothing since 2026-07-10 suggests active intent either way.
2. Should PR #12193 be closed as superseded by #12214?
3. Should `packages/sdk/client-services/TASKS.md`'s Phase 4 checkboxes be reconciled against
   the shipped #12214 solution?
4. Should the stray `plans/worker-package/*.md` docs move into this project's directory (they
   substantively duplicate/extend what's captured here) or be deleted if the branch is
   abandoned?
