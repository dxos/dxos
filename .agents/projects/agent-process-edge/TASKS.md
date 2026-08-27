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
- [ ] `agent-process.node.test.ts` — see Phase 5, which lays the requirement out in full.
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
- [ ] Add `AGENT_PROCESS_KEY -> { make: AgentProcess, input: … }` to the edge process registry
      (`compute-service/src/processes/registry.ts`), keeping the registry closed.
- [ ] Assemble `AgentProcess`'s eight services inside `ProcessObject`, using the now-exported
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
- [ ] `AgentProcess` requires `spawn` options `target` (a queue DXN) and optionally
      `Process.InstructionsAnnotation`; both arrive as annotations, so the spawn route already
      carries them — cover a missing `target` (the definition dies) in the test.
- [ ] The agent needs a model. The harness memoizes Anthropic conversations
      (`MEMOIZED_AI_INFERENCE_SERVICE`); the e2e must use that, not a live model, or it cannot run in
      CI. See the `regenerate-model-fixture` skill for the cache.

### 5b — client half (dxos + edge). Needs #12765 published.

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
      `RemoteProcessManagerAdapter` and `EdgeProcessControl`.
- [ ] `agent-process.node.test.ts`: build `AgentService.layer` over
      `processManagerFromEdgeClient(client, spaceId)` and assert, against the real worker — 1. spawn: `AgentService` starts an agent on EDGE, and the space process index lists it under
      `AGENT_PROCESS_KEY`; 2. control: a submitted prompt reaches the hosted agent and its reply reaches the client as
      outputs read by cursor (proving D7's cursor reads across a reconnect: read once, drop the
      handle, re-attach by pid, resume from the cursor); 3. rpc: the `HarnessControl` surface answers over the remote transport; 4. lifecycle: `runUntilSettled` returns on the agent's own idle, and `terminate` ends it and
      drops it from the index.

### 5c — verification bar

- [ ] Both suites green locally and in edge CI; no raised teardown budgets (the suite terminates
      what it spawns); `pnpm format`, lint clean in both repos.

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
