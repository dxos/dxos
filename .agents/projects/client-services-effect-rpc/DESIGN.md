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

Explicitly **out of scope** in #12127, and their status since — the follow-up chain is
PR #12190 (mirror proto JSDoc onto the effect-rpc defs, no behavior change; documents why
deletion wasn't yet safe) → #12201 (drop the dead `descriptors` surface) → #12204 (delete the
`WorkerService` protobuf service) → #12191 (fix the shell↔app **client-services** connection,
broken by #12127, to run over effect-rpc) → #12206 (delete the `fromSocket`/`fromAgent`
providers):

| Surface                                                                                                       | Then             | Now                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dxos.iframe.WorkerService` (tab→worker control)                                                              | protobuf         | **migrated** — deleted from proto in #12204, served via effect-rpc `WorkerService` in `@dxos/protocols/rpc` over the app `MessagePort`                                       |
| `fromSocket`/`fromAgent` byte-transport providers                                                             | protobuf         | **removed entirely** in #12206; `createClientServices` throws on `remote_source` now                                                                                         |
| shell↔app **client-services** connection (the `ClientServicesProxy` consumer inside the shell iframe)         | broken by #12127 | **fixed onto effect-rpc** in #12191 — a different thing from the row below: this is the client-services RPC riding through the iframe, not the iframe's own control protocol |
| `dxos.mesh.bridge.BridgeService` (WebRTC transport bridge, worker↔tab)                                        | protobuf         | **still protobuf** — explicitly retained per #12204 ("still used by the WebRTC transport bridge"), no migration started                                                      |
| `dxos.iframe.AppService`/`ShellService` (shell↔app iframe **control** transport, distinct from the row above) | protobuf         | **still protobuf** — explicitly retained per #12204 ("still back the shell↔app iframe transport"), no migration started                                                      |
| Teleport extensions (gossip/object-sync/replicator), signal client, `websocket-rpc` devtools remote proxy     | protobuf         | **untouched** — lower-level wire protocols, not part of this conversion's scope                                                                                              |

The remaining protobuf surface **for the migrated client-service set** after #12206 is the 13
`.proto` `service {}` definitions themselves (`SystemService`, `SpacesService`, `QueryService`,
`DataService`, …) — per #12206's own follow-up note, deleting those blocks (message types stay)
is the next step, gated on re-sourcing the `ClientServices` Promise/`Stream` type off the
generated proto service interfaces. **This is the work item #4 below implements.** This is
scoped to that migrated set only: `BridgeService`, `AppService`/`ShellService`, and the
lower-level protobuf protocols in the table above are retained out-of-scope surfaces, not part
of what's being counted down here.

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
PR #12214's actual solution (self-providing host) and is **stale documentation, not real
remaining work** — treat the source as ground truth over that file. Worth a follow-up commit
to reconcile the checkboxes so a future session doesn't re-litigate a solved problem.

PR **#12193** — _"client-services: replace ServiceContext class with effect-native lifecycle"_
— is still **open** (dmaretskyi, dm/remove-service-context-refactor-khq87s → main, last
updated 2026-07-14) and proposed a different mechanism (a slim `ClientLifecycleService` tag)
for the same problem #12214 solved differently. It predates #12214 by one day and was never
updated after #12214 merged — appears **superseded**; confirm with its author/reviewer before
closing it, rather than closing it unilaterally from this doc.

### 3. RPC payload encoding — PARTIAL, work-in-progress branch stalled and stale

Design spec: `plans/worker-package/service-rpc-schemas.md` (see "Where the plan docs came
from" below). Rule: inline a message as an Effect `Schema.Struct` only when the effect-rpc
service definition and the host implementation are its sole consumers (service-boundary
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
overlay the ScrollArea scrollbar thumb on content") — likely a stray-file artifact from a
rebase/squash rather than an intentional commit, though that's inferred from the mismatch
between file content and PR subject, not confirmed with anyone; verify ownership before
relocating or deleting these files. They are dated notes about work on
`dm/worker-package` as of 2026-07-10 and were never updated after. Per this repo's convention
(`CLAUDE.md` → "Where things live"), planning docs like this belong under
`agents/superpowers/{specs,plans}/` or a project folder, not a root `plans/` directory — worth
relocating (or deleting, if the branch is abandoned rather than resumed) in a follow-up.

## 4. RPC payload encoding — spec for the protobuf-removal pass (this session, in progress)

Scope, precisely: finish item 3 (inline the remaining service-boundary payloads as Effect
`Schema.Struct`, per-service, per `service-rpc-schemas.md`'s inline-vs-`protoMessage` rule) and
go one step further than that spec originally called out-of-scope — **delete the now-dead
protobuf `service {}` blocks** for the 13 already-migrated client services, since #12206 already
confirmed nothing outside the effect-rpc surface consumes them (`clientServiceBundle` itself is
gone). **Explicitly NOT in scope for this pass:** the native-MessagePort transport migration
(item 3's Phase A–D above) — that changes the wire transport, not the payload encoding, is a
separate and riskier change with known unresolved test failures on `dm/worker-package`, and
isn't what "remove the original protobufs" asked for.

**Why this is safe to do now, where #12190/#12204/#12206 stopped short:** #12190 (2026-07-13)
listed two blockers to deleting the migrated proto definitions: (1) the `descriptors` surface
still resolved them via `schema.getService(...)`, and (2) host handler implementations still
imported request/response _types_ from `@dxos/protocols/proto/...` and used proto enum
accessors. Blocker (1) is gone since #12201/#12206 deleted `clientServiceBundle` and its
`descriptors` consumers entirely — confirmed by grep: no `schema.getService('dxos.<client
service>...')` call remains for any of the 13 services in `client-protocol`/`client`/
`client-services` (the surviving `schema.getService` calls are `AppService`/`ShellService` —
deliberately retained — and unrelated teleport/agent-manager services, out of scope). Blocker
(2) is what this pass now has to actually fix: handler files still need their proto-typed
request/response parameters re-pointed at the new inline schema types.

**What "removal of original protobufs" means concretely, and what it does NOT mean:**

- Deleted: the `service X { rpc ... }` block in the owning `.proto` file, for each of the 13
  services (`SystemService`, `IdentityService`, `DevicesService`, `ContactsService`,
  `SpacesService`, `InvitationsService`, `NetworkService`, `EdgeAgentService` in
  `dxos/client/services.proto`; `DataService` in `dxos/echo/service.proto`; `QueryService` in
  `dxos/echo/query.proto`; `FeedService` in `dxos/client/feed.proto`; `LoggingService` in
  `dxos/client/logging.proto`; `DevtoolsHost` in `dxos/devtools/host.proto`) — mirroring exactly
  how #12204 deleted `service WorkerService {}`.
- Deleted: message types that exist _only_ to back one of those RPC methods and have no
  consumer outside the RPC boundary (request/response envelopes) — these become the inline
  `Schema.Struct`s per `service-rpc-schemas.md`'s table.
- **Kept, on purpose:** message types consumed outside the RPC boundary (client proxies,
  echo-client, plugins, devtools UI, or as substitution-backed classes like `Timeframe`) stay in
  `.proto` and ride the wire as `protoMessage(fqn)` — per `service-rpc-schemas.md`'s own
  "Out of scope" section, which this pass does not revisit. `BridgeService` and
  `AppService`/`ShellService` are untouched (separate transports, item 1's table).

**JSDoc preservation:** #12190 already copied every `.proto` doc comment onto the effect-rpc
`Rpcs`/`Handlers` definitions in `packages/core/protocols/src/*.ts` as `/** */` JSDoc. That work
is _kept_ — this pass only needs to make sure any newly-inlined `Schema.Struct` field carries the
same per-field JSDoc from the `.proto` message it replaces (the pattern `service-rpc-schemas.md`
already prescribes and `239ad1702a` already demonstrated, e.g. `DataService.ts`'s
`SubscribeRequest`). Deleting a `.proto` message does not delete its doc comment — it moves onto
the struct field.

**Order of work, one service at a time, build+test verified before moving to the next** (small
services first to prove the pattern, then the larger ones):

1. `ContactsService`, `EdgeAgentService` — trivial, all-`protoMessage`-already or near-empty;
   confirms the removal mechanics (proto edit → regenerate → handler type fix → build/test)
   before tackling anything with real inlining work.
2. `DevicesService`, `NetworkService`, `InvitationsService` — small services, a handful of
   messages to inline per `service-rpc-schemas.md`'s table.
3. `IdentityService`, `SystemService`, `LoggingService`, `FeedService` — medium.
4. `SpacesService`, `DataService` — large, and `DataService` in particular has substitution-typed
   fields (`SpaceSyncState` embeds `Timeframe`) that must stay `protoMessage` per the spec.
5. `DevtoolsHost` — largest, most `protoMessage`-retained (heavy shared payloads); last, and the
   one most likely to need judgment calls about what's truly service-boundary-only vs. shared
   with the devtools UI.
6. `QueryService` — already 100% `protoMessage` by design (its own row in the spec's table says
   "— (all shared)") — no schema inlining needed; only the `.proto` `service {}` block itself is
   removable once the effect-rpc definition no longer needs the generated service stub.

Each step: edit the service's `.ts` file in `packages/core/protocols/src/` (inline schemas +
JSDoc), edit the owning `.proto` file (delete the `service {}` block and any now-orphaned
request/response messages), regenerate proto output, fix host handler implementations in
`@dxos/client-services` (and `echo-host`/`functions-runtime-cloudflare` where `DataService`/
`FeedService`/`QueryService` handlers live) to use the new inline types instead of the deleted
proto types, then `moon run protocols:build client-protocol:build client-services:build
client:build`, `moon run protocols:test client-services:test`, `pnpm format`.

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
