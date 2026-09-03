# Agent processes on EDGE — tasks

Design: [DESIGN.md](./DESIGN.md). Branch (both repos): `claude/agent-process-edge-g21cil`.

## Phase 0 — design

- [x] Survey `Process`/`ProcessManager`/`RemoteProcessManager`/`AgentService` and the edge
      `compute-service` + `TriggersDispatcher`, and decide how remote process control fits the
      existing interfaces (D1–D8).

## Phase 1 — protocol (dxos) — DONE, PR #12765

- [x] `RemoteProcessManager.Control`: the control verbs (`spawn`, `list`, `status`, `submitInput`,
      `makeRpcClient`, `terminate`, cursor `readEvents`) alongside the untouched monitor `Manager`.
- [x] `ProcessProtocol` in `@dxos/protocols` — wire types shared by client and edge.
- [x] `EdgeHttpClient` methods for the routes (RPC is a URL helper: the route is
      effect-rpc-over-HTTP, D9).
- [x] `Process.Process` exposes its `input`/`output` codecs; `Handle.alarmDueAt` added (a DO must
      mirror the alarm onto the platform scheduler, and it is the wire signal that separates
      `runToCompletion` from `runUntilSettled`).

## Phase 2 — process host (edge) — DONE except `AgentProcess`, PR dxos/edge#971

**Only the `AgentProcess` half is blocked on publication.** The pinned `dxos` catalog already carries
`ProcessManagerImpl`, `Process`, `StorageService` and `Trace`, so the host, the registry, the routes
and the whole `TestProcess` surface build and run against it today — the earlier claim that nothing
here compiled was wrong. What is genuinely missing from the pinned packages is `@dxos/agent-runtime`
(hence `AgentProcess`) and `Handle.alarmDueAt`; the latter is worked around by intercepting
`ctx.setAlarm` in the host and mirroring the due-time onto the platform alarm.

Unblocking `AgentProcess` needs #12765 merged, or a maintainer dispatching `pkg.pr.new` against
`claude/agent-process-edge-g21cil`, which publishes commit-pinned packages without merging.

- [x] `DurableObjectKeyValueStore`: `effect` `KeyValueStore` over `ctx.storage` — this is what lets
      `ProcessManagerImpl` run inside a DO unchanged (D5).
- [x] `TestProcess` in the edge source tree — inputs→outputs, one RPC that reads state accumulated
      from previous inputs (so a pass proves the call reached _that_ instance), one alarm, explicit
      succeed/fail. Declares no services, so a test on it can only fail on the protocol or the host.
- [ ] Bump the `dxos` catalog to PR #12765's published commit (needed only for `AgentProcess`).
- [x] Built-in process registry keyed by `Process.key` (`TestProcess`; `AgentProcess` pending the
      catalog bump).
- [x] `ProcessObject` DO: memoized `_init`, hosts one process via `ProcessManagerImpl`, DO alarm
      mirrors `Handle.alarmDueAt`, bounded output/trace ring with a monotonic cursor (outputs
      captured by wrapping the definition's `create` to intercept `submitOutput`; trace via the
      manager's `traceSink`). Register every public method in `durable-objects.ts` `rpcMethods`.
- [ ] Service assembly for `AgentProcess` inside the DO — database/AI/credentials/operation services
      from the EDGE bindings. `FunctionContext` in `@dxos/compute-runtime`'s `protocol.ts` already
      assembles exactly this set for invoked functions but does not export it; either export it or
      lift the layer builder. This is the largest remaining unknown.
- [x] `ProcessObject` class in `compute-service/wrangler.jsonc`: a sqlite-storage entry in the
      `exports` map and a binding in the top-level plus all four env blocks, per
      `scripts/check-wrangler-bindings.mjs`.
- [x] `TriggersDispatcher`: owns the per-space process index (`registerProcess` /
      `unregisterProcess` / `listProcesses`), all three in `rpcMethods`. A DO namespace cannot be
      enumerated, so membership is recorded as processes are spawned.
- [x] compute-service HTTP routes per §3 (spawn, list, status, input, events, rpc, terminate),
      requiring a verifiable presentation outside dev-like environments (verified: 401 without the
      `functions.noAuth` flag, 200 with it). RPC is served by `ProcessObject.rpcFetch` via
      `RpcServer.toHttpEffect` over the handlers captured while instrumenting `create`.
- [ ] `@dxos/agent-runtime` dependency on compute-service (catalog entry already exists).

## Phase 3 — client implementation (dxos) — DONE, PR #12765

- [x] `RemoteProcessManagerAdapter` — presents a `Control` as a `ProcessManager.Manager`
      (transport-agnostic, so it lives in compute-runtime, not edge-compute).
- [x] `RemoteProcessHandle` — cursor-polled output/ephemeral streams, client-derived settle
      predicates (D8), lazily-built `RpcClient`. A handle without a local definition is a metadata
      view: inputs/outputs/RPC throw rather than guessing at encoding.
- [x] `EdgeProcessControl` + `EdgeProcessManager.processManagerFrom{Client,EdgeClient}` — the EDGE
      transport and the layer that swaps an agent stack onto it.
- [x] `RemoteProcessManagerAdapter.test.ts` — spawn/list/status, input encoding + output streaming,
      terminate, `runUntilSettled` against an in-memory stand-in host.
- [x] Populate the monitor `processTree` (the pre-existing D3 TODO). Done for the path that matters:
      the adapter refreshes its tree atom on spawn, so `Process.ProcessMonitorService` — the official
      read API — reports remote processes. A monitor-only `RemoteProcessManager.Service` backed by
      `Control.list` (for a stack that keeps a local manager alongside a remote monitor) is still
      open; nothing needs it yet.

## Phase 4 — verification (edge)

- [x] `processes.node.test.ts` — full process surface on `TestProcess` (spawn, list, query, inputs,
      outputs, rpc, alarm, terminate, status, unknown-key rejection). 9 tests, green.
      Found and fixed a real self-deadlock in the host: `_initFromStorage` installed its own promise
      in the `_initPromise` memo and then awaited `_init`, which handed the same promise back — every
      request to a DO with nothing spawned hung. Both wrappers now memoize around a shared
      `_initImpl`.
- [x] `agent-process.node.test.ts` — see Phase 5; written and green (edge `54e5fba`).
- [x] `pnpm format`, lint, and the touched test suites green in both repos; PRs opened (#12765,
      dxos/edge#971). Edge CI green; the edge trigger-dispatcher suite (17 tests) still passes with
      the dispatcher's new process index.

## Phase 5 — `AgentProcess` on EDGE and its e2e suite

The requirement, stated in full: **`dxos/compute`'s `AgentService` must be able to spawn and control
a remote agent hosted on EDGE**, verified by the edge harness rather than by unit stand-ins. That
splits into a host half and a client half, and only the client half needs anything published.

**Correction to an earlier note in this ledger:** `@dxos/agent-runtime` _is_ in edge's catalog,
pinned at `8db69c61` (`pnpm-workspace.yaml:125`) — the claim that it was in no pinned build was
wrong. What actually blocked the host half is narrower: the package exported `AGENT_PROCESS_KEY` but
not `AgentProcess`, so the edge registry could not name the definition. #12765 now exports
`AgentProcess` and `AgentProcessOptions`; a pinned-catalog bump to a commit carrying that export is
all the host half needs.

### 5a — host half (edge). Needs only the `AgentProcess` export.

- [ ] Bump edge's catalog for `@dxos/agent-runtime` to a commit that exports `AgentProcess`.
      Not needed to iterate: `pnpm link-packages` carries the unpublished export, which is how the
      host half was built and tested. Still required before landing.
- [x] Add `AGENT_PROCESS_KEY -> { make: AgentProcess, input: … }` to the edge process registry
      (`compute-service/src/processes/registry.ts`), keeping the registry closed.
- [x] Assemble `AgentProcess`'s eight services inside `ProcessObject`, using the now-exported
      `FunctionContext` (`@dxos/compute-runtime`). It declares `Database.Service`,
      `OpaqueToolkit.OpaqueToolkitProvider`, `Operation.Service`, `Registry.Service`,
      `StorageService.StorageService`, `ProcessManager.ProcessOperationInvoker.Service`,
      `AiService.AiService` and `Credential.CredentialsService`; `FunctionContext.createLayer()`
      supplies six of them plus the trace writer, and `ProcessManagerImpl` already provides
      `StorageService` and `ProcessOperationInvoker` — so nothing has to be rebuilt. #12765 exports
      the class and widens `EdgeFunctionServices` to declare `OpaqueToolkitProvider`, which
      `createLayer` provided but did not name (a consumer requiring it could not otherwise be
      satisfied). What remains is supplying the `FunctionProtocol.Context`, and it should not be
      hand-rolled: `operation-service` already builds one per invocation
      (`operation-service/src/entrypoint.ts`, `_buildFunctionContext`) via `createFunctionContext` +
      `ServiceContainer` from `@dxos/functions-runtime-cloudflare` over the
      `DataServiceFetcher`/`QueueServiceFetcher`/`AiServiceFetcher` bindings, then overlays a local
      `functionsService` and the forwarded `accessTokenService`. The process host wants that same
      shape against compute-service's own bindings — read that method first.
      Done in `ProcessObject._resolveServices`, exactly that shape. One thing the plan had wrong:
      `ProcessManagerImpl` provides `ProcessOperationInvoker.Service` **only when constructed with a
      handler set**, and it filters that tag out of external services, so the resolver can never
      supply it — the host now passes `OperationHandlerSet.empty`. Hosting the real handler set (so an
      agent's tool operations execute on EDGE rather than only dispatching to the functions service)
      is a follow-up.
- [ ] `AgentProcess` requires `spawn` options `target` (a queue DXN) and optionally
      `Process.InstructionsAnnotation`; both arrive as annotations, so the spawn route already
      carries them — cover a missing `target` (the definition dies) in the test.
- [ ] The agent needs a model. The harness memoizes Anthropic conversations
      (`MEMOIZED_AI_INFERENCE_SERVICE`); the e2e must use that, not a live model, or it cannot run in
      CI. See the `regenerate-model-fixture` skill for the cache.

### 5b — client half (dxos + edge). Written and green against a linked dxos workspace.

**Requirement (from the PR author): the edge e2e suites drive the official `@dxos/compute` APIs —
`AgentService` and `Process.ProcessMonitorService` — not HTTP routes and not the transport.** The
HTTP-level `processes.node.test.ts` is the interim host-surface test (it also covers the
status/rejection codes an official-API test cannot reach); once the packages are published it should
be joined by, and where it overlaps replaced with, official-API coverage.

The layer stack, verified in `RemoteProcessManagerAdapter.test.ts` ("ProcessMonitor reports the
remote processes through the official API") so the e2e can assemble it directly: one
`RemoteProcessManagerAdapter.layer(control)` instance shared by `ProcessManager.Service` **and** by
`ProcessMonitor.layer` (with `RemoteProcessManager.layerNoop` + `RemoteTraceMonitor.layerNoop` in the
remote slots, one `Registry.AtomRegistry` throughout). Two adapter instances, or two registries, give
the monitor a different atom from the manager and it reports an empty tree.

Closes the old D3 TODO the wrong way round: the aggregate monitor reads the tree _atom_ rather than
calling the manager, so the adapter now refreshes that atom on spawn. Without it,
`monitor.processTree` was empty however many processes were running — which is what the new test
would have caught.

- [ ] Bump edge's catalog for `@dxos/compute-runtime` + `@dxos/edge-compute` to a commit carrying
      `RemoteProcessManagerAdapter` and `EdgeProcessControl`, and drop the `file:` link overrides.
- [x] `agent-process.node.test.ts`: build `AgentService.layer` over
      `processManagerFromEdgeClient(client, spaceId)` and assert, against the real worker — 1. spawn: `AgentService` starts an agent on EDGE, and the space process index lists it under
      `AGENT_PROCESS_KEY`; 2. control: a submitted prompt reaches the hosted agent and its reply reaches the client as
      outputs read by cursor (proving D7's cursor reads across a reconnect: read once, drop the
      handle, re-attach by pid, resume from the cursor); 3. rpc: the `HarnessControl` surface answers over the remote transport; 4. lifecycle: `runUntilSettled` returns on the agent's own idle, and `terminate` ends it and
      drops it from the index.

**What the suite asserts today** (`packages/services/edge/test/agent-process.node.test.ts`, 1 test,
green): `AgentService.getSession(feed)` spawns `AgentProcess` on EDGE; `ProcessManager.list` reports
it under `AGENT_PROCESS_KEY`; `Process.ProcessMonitorService.processTree` contains it (the aggregate
monitor, which is what Composer renders); the handle's `terminate` ends it and drops it from the
space index. Prompt/reply (2) and the `HarnessControl` rpc (3) still need the memoized Anthropic
fixture — the model round trip is the remaining gap, not the lifecycle.

One host requirement the run surfaced: the agent's target `Feed` must have replicated to EDGE before
the spawn, because `Database.resolve` runs on the host. The test creates it client-side, flushes,
`syncToEdge`s and waits on a query before asking for a session.

### 5d — the compute-API e2e is written and passing; it lands with the catalog bump

`packages/services/edge/test/process-api.node.test.ts` — 6/6 against the real worker, driving
`ProcessManager`, `Process.Handle` and `Process.ProcessMonitorService` only. Verified by linking the
dxos workspace into edge (`pnpm link-packages`), not by publishing.

It is now **on the edge branch** (the user authorised pushing link-dependent code, to be resolved
before landing). It imports `@dxos/compute-runtime/remote-process`,
`@dxos/edge-compute/process-control` and `@dxos/edge-client/process`, which the pinned catalog build
does not carry, so **edge CI will fail to resolve them until the pin moves**.

- [ ] After #12765 lands and publishes, bump edge's catalog and drop the link overrides.

Three client defects it found, all fixed in #12765 and none reachable from the route-level suite:

1. `hydrate(definition)` discarded its argument, so a handle from `attach`/`list` could never acquire
   codecs — a reattached client could not submit input or read output at all.
2. `GET /processes/:spaceId` answered the dispatcher's index entries rather than `ProcessInfo`, which
   `ProcessManager.list` and the monitor tree decode.
3. A root process reported `parentPid: undefined`; JSON drops the key, so the client decoded an absent
   parent as a pid.

### 5c — verification bar

- [x] All three suites green locally (9 + 6 + 1); edge CI blocked on the catalog bump above.
- [ ] Both suites green in edge CI; no raised teardown budgets (the suite terminates
      what it spawns); `pnpm format`, lint clean in both repos.

## Phase 6 — D1a: local and remote tags mean what they say (review correction)

The PR author's correction: "process manager is local execution, remote process manager talks to
edge" — the stacks had EDGE bound to `ProcessManager.Service` with `RemoteProcessManager.layerNoop`
in the remote slot, which is exactly inverted. Recorded as D1a in DESIGN.md.

- [x] `GetSessionOptions.location?: 'local' | 'edge'` (`@dxos/compute/AgentService`).
- [x] `AgentService.layer` requires `ProcessManager.Service` + `RemoteProcessManager.Service` +
      `AtomRegistry` and routes on `location`; `hydrate` now covers both runtimes, since an
      edge-hosted agent that kept running while the client was closed is the whole point.
- [x] `RemoteProcessManagerAdapter.layer` (which provided `ProcessManagerService`) deleted; the class
      stays, and takes the tree atom to publish into so the aggregate monitor sees remote spawns.
- [x] `RemoteProcessManager.Manager.processTreeAtom` is `Atom.Writable` for that reason.
- [x] `EdgeProcessManager` gained a real `processTree` (from `Control.list`) and `control`; the D3
      "no process tree endpoint yet" TODO is gone. New builders: `fromEdgeProcessClient(client,
  spaceId)` and `forSpace(client, spaceId)`; `EdgeProcessControl.processManagerFrom*` deleted in
      favour of `EdgeProcessControl.fromClient` returning a `Control`.
- [x] `AssistantTestLayer` reordered so its noop remote manager sits below `AgentService` in the
      provideMerge chain.
- [x] All three edge suites rewired: a genuine local `ProcessManager.layer()` over
      `KeyValueStore.layerMemory` in the local slot, EDGE in the remote slot, nothing noop'd; the
      agent suite asks for `location: 'edge'`.
- [ ] **Rename `TriggersDispatcher` -> `Scheduler`** (dmaretskyi, review of dxos/edge#971; his second
      comment supersedes the first, which said `ProcessManager`). Intent recorded as a TODO on the
      class; the rename itself is a DO migration, not a refactor. Under this repo's declarative
      `exports` map it needs a `renamed` export state in every wrangler config provisioning the
      namespace — `identity-service/wrangler.jsonc:21` declined exactly this rename for that reason —
      and the live namespace holds every space's trigger and process state. 77 references.
- [ ] **Composer cannot yet ask for an edge agent.** `plugin-routine`'s `RemoteProcessManagerSpec` is
      application-affinity and builds `EdgeProcessManager.fromClient(client)` with no space, so it
      carries no `control` — processes are per-space. `AgentServiceSpec` is application-affinity too,
      while `getSession` derives the space from the feed. Resolving it means either a space-affinity
      remote manager (and an `AgentService` that can reach it), or making `control` space-parameterised
      (`control?: (spaceId) => Control`). Not guessed at here — it changes plugin layer affinity.

## Boot budget (do not re-investigate)

`composer-app:check-boot-budget` is red on this branch and **on `main`** — dxos/dxos#12759, an
unrelated PR, fails it identically with everything else green. Measured locally: the eager boot graph
is 4,457,401 bytes against a 4,456,448 ceiling (953 over), and this branch contributes **zero** of
them — none of its modules or modified files appear in any of the 22 boot chunks' sourcemaps. Its
original 1,095-byte contribution was the seven process routes on `EdgeHttpClient`, fixed in 65f3227a
by moving them to a subclass behind `@dxos/edge-client/process`.

Consequences for the rest of this project:

- The three subpath exports (`@dxos/edge-client/process`, `@dxos/compute-runtime/remote-process`,
  `@dxos/edge-compute/process-control`) exist to keep this feature off Composer's eager boot graph.
  Do not "simplify" them back into the package barrels.
- Anything added to `EdgeHttpClient` itself, or to a boot-reachable barrel, costs boot bytes against
  a budget with no margin left. Put new client surface on the subclass.
- Resolving the red check needs either a `MAX_PRELOAD_BYTES` bump (accepted growth, which the
  script's docstring invites) or finding what recently landed on `main` — a decision for the repo
  owner, raised in a comment on the PR.

## Tracked follow-ups

- [ ] **Space-membership authorization on the EDGE process routes.** The routes now require a
      verifiable presentation outside dev-like environments (`functions.noAuth`, thunked so the
      binding is read per request), but nothing checks that the presenter belongs to the space whose
      processes it addresses — any authenticated identity can drive any space's agents. Needs a
      member check the host does not have; the function-deploy route's `ownerUri === presenterDid`
      comparison is the nearest precedent.
- [ ] WS push for outputs/trace instead of cursor polling (D7).
- [ ] `Process`/`ProcessHandle`: an explicit `onAlarmScheduled` hook so the DO need not read
      `alarmDueAt` out of the store (D5).
- [ ] Rename the `TriggersDispatcher` DO class to match its process-manager role (D4) — a binding
      migration, not a refactor.
