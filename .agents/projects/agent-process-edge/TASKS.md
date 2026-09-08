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
- [x] `RemoteProcessManagerAdapter.layer` (which provided `ProcessManagerService`) deleted; later the
      whole module went with it (D1b below).
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
- [x] **Composer can ask for an edge agent** (dmaretskyi's answer: "have a single EdgeProcessManager
      for all spaces -- parametrize space id on process creation"). Every `RemoteProcessManager.Control`
      verb now takes the space it addresses, so nothing is space-scoped: `plugin-routine` keeps one
      application-affinity manager and it carries `control`. `AgentService` builds a space-bound
      `RemoteProcessManagerAdapter` per space (memoized, over the manager's own tree atom) from the
      space on the session's feed (superseded by D1b: the verbs moved onto the remote manager and take
      the space per call). `RemoteProcessHandle` takes its space as an option rather than
      reading `info.environment.space`, which is optional — and the host now always records the space
      that routed a spawn, so `ProcessInfo` is self-describing either way.
      One limitation, documented in code: `hydrate()` has no space list, so its edge half covers only
      spaces already opened this run. Not a gap in practice — `getSession` reattaches to a process
      still running for its feed, which is the path opening a chat takes.

## Boot budget (do not re-investigate)

`composer-app:check-boot-budget` is red on this branch and **on `main`** — dxos/dxos#12759, an
unrelated PR, fails it identically with everything else green. Measured locally: the eager boot graph
is 4,457,401 bytes against a 4,456,448 ceiling (953 over), and this branch contributes **zero** of
them — none of its modules or modified files appear in any of the 22 boot chunks' sourcemaps. Its
original 1,095-byte contribution was the seven process routes on `EdgeHttpClient`, fixed in 65f3227a
by moving them to a subclass behind `@dxos/edge-client/process`.

Consequences for the rest of this project:

- The remaining subpath exports (`@dxos/compute-runtime/remote-process`,
  `@dxos/edge-compute/process-control`) exist to keep this feature off Composer's eager boot graph.
  Do not "simplify" them back into the package barrels.
- `@dxos/edge-client/process` is **gone**: on review the routes went back onto `EdgeHttpClient`
  itself (dmaretskyi, "no, put it on the original class"), which is where a client's own routes
  belong. `Check / boot-budget` is the arbiter of whether that costs too much — it had margin again
  by then, main's earlier shortfall having been resolved.
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

## Phase 7 — D1b: no `ProcessManager.Manager` façade over the remote surface

dmaretskyi, review of dxos/dxos#12765: "kill this module -- consuming code should be aware of remote
vs local process manager" / "unifying remote vs local is done a layer above -- for example in
AgentService, or Operation.Service".

- [x] `RemoteProcessManagerAdapter` deleted; its verbs are `RemoteProcessManager.Manager`'s own
      (`spawn`, `list`, `attach`, `refreshProcessTree`), each taking the `spaceId` it addresses.
- [x] `RemoteProcessManager.makeControlVerbs(control, registry, atom)` implements them once for every
      transport; `EdgeProcessManager` spreads it beside `control`, so a manager without a control
      lacks all of them.
- [x] `AgentService` picks the verbs for the requested location itself and no longer holds a manager
      per space — just the set of spaces an edge session was opened on, for `hydrate`.
- [x] `AgentService.layer` no longer requires `AtomRegistry` (the atom belongs to the remote manager).
- [x] `RemoteProcessManagerAdapter.test.ts` -> `RemoteProcessManagerVerbs.test.ts`, driving the remote
      manager rather than a `ProcessManager.Service` injection. 12/12.
- [ ] `Operation.Service` is the other place the review names as a unifying layer; nothing there
      dispatches on local vs remote yet, so it is untouched.

## Phase 8 — the model round trip (session of 2026-09-08)

The one remaining item from Phase 5's `resume` ("the agent model round trip needs the memoized
Anthropic fixture") turned out to sit behind FIVE defects, each hiding the next. Diagnosed against a
new round-trip test rather than by reading: every hypothesis reached from source alone was wrong.

### Runtime defects fixed (dxos, commit c78bea1b12 + working tree)

- [x] **`RemoteProcessManager` is a required dependency of `AgentService.layer`**, not an optional
      read. A `LayerSpec` stack never has a tag its spec does not require in context, so
      `Effect.serviceOption` always came back empty and every `location: 'edge'` session failed with
      "no RemoteProcessManager is available" while the app had materialised one all along. Hosts
      without EDGE satisfy it with `RemoteProcessManager.layerNoop`.
- [x] **`EdgeProcessManager.fromClient` supplies the process-control surface.** It was cancel-only,
      deferring to a `forSpace` that exists nowhere in the repo, so the manager an app builds lacked
      `spawn`/`list` entirely ("offers no process control").
- [x] **A `Process` definition declares the schemas its data model needs** (`Process.types`), and the
      host registers them with the process's database. `FunctionContext._open` does the registering;
      passing `types` to the constructor alone was inert, which cost a full cycle to notice.
      `SessionStore` reads the conversation with a TYPED query, so on a host that registered nothing
      the agent appended a prompt and read the queue back empty — a lost write, in appearance.
- [x] **A fresh agent no longer completes on its first empty-queue wake** (`turnRan`). `onSpawn`
      discards what it inherits, so a new process always starts empty; treating that as "work
      drained" ended the agent ~50ms after spawn, and the prompt it was spawned for then landed on a
      finished handle and was dropped with a warning.
- [x] **Read-your-writes over an eventually-consistent queue read.** A hosted process's feed read is
      served by the space INDEX: the agent appends a prompt and its own read, 11ms later, returns
      empty; the index catches up ~3ms after that, but the agent has already gone idle and nothing
      looks again. `onAlarm` now re-arms a short alarm while a write it made is unread (bounded by
      `MAX_UNSEEN_WRITE_WAKES`), instead of concluding the queue is drained. Locally this never
      reproduces — the same read is served from the resident feed handle.

### Harness defect (edge, working tree) — the actual blocker for fixtures

- [x] **`pruneAbsentTargets` silently pruned every function-valued service binding.** It derives a
      target worker from `binding.name`, and a FUNCTION has a `.name`, so
      `createMemoizedAnthropicHandler()`, `stubFetch('HUB_SERVICE')` and friends resolved to a
      target that is not hosted and were dropped from the worker's env. Miniflare 4 accepts
      `(request, miniflare) => Response` as a binding value, so the declarations were always valid —
      they just never arrived. This is why `MEMOIZED_AI_INFERENCE_SERVICE` was absent from
      compute-service's env (verified by dumping `this.env` inside the DO).

**Consequence beyond this project: the memoized-AI path was broken for ROUTINES too**, not just
hosted agents. `ai.node.test.ts` is tagged `manual`, so nothing exercised it. Worth checking whether
any other harness behaviour depended on a pruned stub.

### Test infrastructure added (edge)

- [x] `POST /compute/processes/:spaceId/:pid/drain` behind `testEndpoint()`, plus
      `harness.drainProcess()`: runs a hosted process until it stops recording events, the same
      shape as the `/db/test/…/drain` barrier for replication and indexing. A process advances on
      wall-clock alarms, so a test that waits turns a lost wake-up into a timeout instead of a
      failure — which is exactly how the read-your-writes bug read for several rounds.
- [x] `ProcessManager.Handle.requestAlarm` (optional — a handle for a process in another runtime
      cannot arm that runtime's timer, so `RemoteProcessHandle` does not implement it).
- [x] `agent-process.node.test.ts` grew from lifecycle-only to five tests: reply, context across two
      turns, a tool call through a bound skill, and a self-wake on a due alarm (deliberately NOT
      drained, so a broken alarm mirror still fails).
- [x] Every test that reads the conversation first asserts it can SEE a message written through
      EDGE's own queue route. Three earlier revisions read the feed via `exec-query`/`Scope.feed`
      and via the peer, and both reported an empty feed for messages that demonstrably existed. A
      silent probe turns a working agent into a phantom bug; it produced three confident, wrong
      diagnoses this session before the control existed.
- [x] Assertions match only ASSISTANT-role messages. Matching the conversation at large passed on
      the prompt itself (`/paris/i` is in the question) and on an alarm record carrying its own
      reminder text — two false positives that briefly showed green.

### Where it stands

- `answers a prompt` gets as far as a real model call: prompt enqueued, retry wakes the agent,
  message dequeued, turn begins, `AnthropicClient.createMessageStream` reached. It then fails
  because the fixture store is unreachable — the `pruneAbsentTargets` fix above is written but was
  never run against the suite.
- `_mirrorAlarm` also treats a past-due recorded alarm as not-pending (a stale due-time made every
  later `setAlarm` a no-op). Kept on its own merits; it was NOT the bug it was written for.
- Debugging channel that finally worked: `packages/services/edge/edge-test.log` (JSONL, file sink
  defaults to `debug`; set `DX_TEST_FILE`). The agent's own `log()` lines were on disk the whole
  time — `agent onInput enqueued to feed` / `agent onAlarm empty queue` answered in one look what
  four rounds of source-reading got wrong. Read it FIRST.

### Next

- [ ] Run the suite with the `pruneAbsentTargets` fix; record the memoized fixtures
      (`ALLOW_LLM_GENERATION=1`), then confirm the suite is green with generation OFF.
- [ ] The tool/skill test needs the real operation handler set on the host — the standing
      `handlerSet: OperationHandlerSet.empty` TODO in `ProcessObject`. Expect it to fail until then.
- [ ] Strip the remaining scaffolding: the `DO env probe` log in `ProcessObject`.
- [ ] Revert edge's `package.json` / `pnpm-lock.yaml` (`pnpm link-packages` `file:` overrides) before
      landing, per the existing blocker note.

## Phase 9 — the fixture path, and what it uncovered (session of 2026-09-08b)

Phase 8 ended with the `pruneAbsentTargets` fix "written but never run". Running it took two more
harness defects, and then the agent got far enough to expose a real runtime bug.

### Confirmed from Phase 8

- [x] **`pruneAbsentTargets` works.** `MEMOIZED_AI_INFERENCE_SERVICE` reaches compute-service; the
      prompt is enqueued, the agent wakes, dequeues, and begins a turn. Everything Phase 8 fixed in
      dxos (`c78bea1b`, `c99c328f`) holds up under a real run.

### Harness defects found and fixed (edge)

- [x] **`AI_SERVICE` was bound to the real `ai-service` worker** (`test-worker.ts`), so a hosted
      agent's model call demanded a live `ANTHROPIC_API_KEY` — the invariant every one of these
      tests died on. The comment above the binding already described the opposite, and
      `stripAnthropicProxyPrefix` sat 50 lines up referenced by nothing: the binding was the one
      part of that fix never applied. Now `memoizedAnthropicHandler` through the strip helper.
- [x] **`drain` was missing from `ProcessObject`'s `rpcMethods`**, so `lazyDurableObject` never
      forwarded it and the barrier answered 500 in ~2ms — before doing any work. Verbatim the
      pitfall `edge/CLAUDE.md` marks CRITICAL. This is why two tests sat at the 120s timeout: they
      were waiting on wall-clock alarms with no barrier at all, which is the exact scenario the
      barrier was added to remove. Now 200.

### Tool operations now dispatch to operation-service (edge)

- [x] `ProcessObject` ran on `OperationHandlerSet.empty`, so an agent's tool call had no handler.
      `makeOperationServiceHandlerSet` dispatches each handler body over the existing
      `OPERATION_SERVICE` binding, under the same invocation timeout as the function-invoker path.
      Only `getHandlerFor` is served: `Process.fromOperation` already holds the caller's definition
      and uses the resolved entry solely to invoke its handler, and tools resolve from the space's
      `PersistentOperation` records (`makeToolResolverFromOperations`) rather than from the set — so
      the synchronous `definitions()`, which a remote registry an RPC away cannot answer, is unused.
      Resolution is optimistic; an unhosted key fails with operation-service's own message.

### THE OPEN BUG: a handled message is never acked

A hosted agent now answers a real prompt through EDGE — the context test returns `reply: 'Paris'`.
But the agent's own log shows **the same message id handled over and over**:

```
14:38:22.223 agent onAlarm handling {"tag":"message","id":"01M20Q9AQ2ASCTPA9N56TZKDNM"}
14:38:25.657 agent onAlarm handling {"tag":"message","id":"01M20Q9AQ2ASCTPA9N56TZKDNM"}
14:38:29.126 agent onAlarm handling {"tag":"message","id":"01M20Q9AQ2ASCTPA9N56TZKDNM"}   (×5)
```

The dequeue does not consume the entry, so the agent re-runs the same turn indefinitely. This is
what burns the fixture store (one prompt → a dozen recorded conversations, each a longer history)
and what keeps `answers a prompt` at the timeout. It is very likely the same ground the
`agent-feed-messages` project covers (atomic dequeue by echoing the item with an `AckAnnotation` and
removing the original) — check there before writing a fix.

- [x] **Root cause: the ack is a feed APPEND, read back through the same eventually-consistent
      index.** `SessionStore.ack` marks the item `ConsumedAnnotation` and re-appends it; the hosted
      process's next `loadPending` is served by the space INDEX, which has not caught up, so the
      wake re-reads the un-acked original and redelivers it. This is the SAME read-your-writes
      hazard Phase 8 fixed for the enqueue side (`onAlarm empty queue with an unread write`) — that
      fix covers "my write is not visible yet", not "the entry I just acked is still visible". The
      ~3.5s spacing between repeated handlings matches the re-arm cadence, each wake re-reading a
      stale index. Never reproduces locally: the same read is served from the resident feed handle.
- [ ] Fix it. Shape that matches the existing remedy: have the process remember the ids it acked in
      its own durable KV and hold them out of `loadPending` until the index catches up, mirroring
      `MAX_UNSEEN_WRITE_WAKES`. Confirm against `agent-feed-messages` first — its whole subject is
      making this dequeue atomic (echo the item with an `AckAnnotation`, remove the original), which
      would replace this mechanism rather than extend it.
- [ ] `agent work complete, succeeding` fires after a single turn in one run — re-check `turnRan`
      against the non-acking queue, since "drained" is being decided from a queue that never shrinks.

### Also open

- [ ] **Second prompt on one conversation produces no reply.** The context test's turn 1 answers
      `Paris`; turn 2 ("what country did I just ask about") adds nothing — `replies()` stays `Paris`.
      Probably a consequence of the ack bug, but confirm rather than assume.
- [ ] **The alarm wake produces no reply.** The `Alarm` record is in the queue with a `wakeAt`, and
      no assistant message follows it.
- [ ] **`session.waitForCompletion()` looks like it never resolves for a hosted session** — the one
      test that calls it (`answers a prompt`) times out where the same prompt succeeds under
      `drainProcess` in the context test. Verify before chasing anything else in that test.
- [ ] **A passing test for the `DatabaseSkill` tool, asserted on its SIDE EFFECT — the object the
      tool created, never the reply text.** A reply claiming success is only the model's word, and a
      text match also passes on the prompt echoed back. The tool test is already written this way
      (it waits for a `Person` whose `fullName` contains "Ada"), so what is missing is not the test
      but the test PASSING: it times out at 150s, and the run log shows zero dispatches through
      `makeOperationServiceHandlerSet` and zero `invokeOperation` RPCs, so no tool has ever executed
      on a hosted agent. This is the acceptance criterion for remote tool execution — do not call
      that feature done on a green reply test.
- [ ] `Failed to get handler to worker` (workerd RPC) alongside a failing `accountLookupViaHubService`
      that fails open — the `HUB_SERVICE` stub is not resolving an entrypoint. Breaks nothing today,
      but it is the same class as `pruneAbsentTargets`.

### Fixture store

Left UNCOMMITTED on purpose. Every recording so far ran with the agent looping, so the ~95 entries
under `.store/conversations/` encode repeated turns. Re-record from a clean `git clean -f
.store/conversations/` once the ack bug is fixed, then confirm green with generation OFF.

### Environment notes (cloud sandbox)

- `DX_ANTHROPIC_API_KEY` is present; the memo server already falls back to it, so recording needs
  only `ALLOW_LLM_GENERATION=1` (no `.secrets/` handoff).
- `git push` in dxos needs `git-lfs` installed (`apt-get install -y git-lfs`) or the pre-push hook
  fails on the missing binary.
- Full bootstrap is ~30 min: `.config/claude-code-setup.sh` in both repos, `moon exec :build` in
  dxos, then `pnpm link-packages` in edge.

## Phase 10 — what the hosted agent still cannot do (session of 2026-09-08b, continued)

Six runtime defects fixed this session, each found by driving the real hosted agent rather than by
reading (the edge suite went 1/5 to 3/5):

- [x] A handled queue entry is never retired — the ack is a feed append read back through the
      eventually-consistent index, so the same turn re-ran forever. Durable `AckedEntriesCell`.
- [x] A tool result reported inside its turn kept `pendingWork` true with nothing left to arm a
      wake, so `waitForCompletion` hung on any tool-using agent.
- [x] `unseenWrites` was a count, so a resumed process dequeuing an older entry zeroed the budget
      while its own prompt was unread. Held by id now.
- [x] A second prompt on one session was dropped ("input dropped (already finished)"). `submitPrompt`
      re-enters `getSession`, and asks the MANAGER whether the process is alive — the handle's own
      status is a client-side snapshot that still read RUNNING 175ms after the host had succeeded.
- [x] The retry budget being spent fell through to completion, discarding a prompt the index had not
      caught up to. Stays resident instead.
- [x] Tests this branch broke: `Chat.test` field list, `delegate-task-to-chat` and the
      `ProjectArticle` stories missing `RoutinePlugin` (which provides the now-required
      `RemoteProcessManager`), and the `queue-scripted` hang above.

### THE OPEN BLOCKER: a hosted agent has no tools

`a hosted agent calls a tool from a bound skill` still fails, and the operation dispatch path has
never executed — `dispatching operation to operation-service` is 0 in every run. The agent's own log
says why:

```
run query results {"resolver":"SpaceQuerySource","count":0, ... Filter.type(contextBinding) ...}
sync complete {"skills":0,"skillKeys":"[]"}
toolkit {"tools":"[]"}
```

The `AiContext.Binding` the client appends to the feed is NOT visible to the hosted process, so no
skill resolves and every turn runs with an empty toolkit. In the whole edge log, every mention of
`contextBinding` is a QUERY — the record itself never appears on the host side.

**A wrong turn worth recording:** this looked like the Phase-8 defect one layer over (a typed query
on a host that registered nothing), so `AiContext.Binding` and `Skill` were added to the process's
declared `types`. That did NOT fix it — with the types registered the query still returns 0. The
change is defensible on its own (the process does query those types) but it is not the cause, and
`f14e477a`'s message overstates it. Do not treat that commit as the fix.

- [x] **Established: the binding does NOT reach EDGE — and neither does anything else the client
      writes to that feed.** A control added to the tool test reads the conversation through EDGE's
      own queue route right after `syncToEdge`, and gets `[]`:
      `AssertionError: expected '[]' to contain 'contextBinding'`. The feed is EMPTY, not merely
      missing the binding. So this is a replication/seeding problem at the point the test binds the
      skill, NOT a type-registration or tool-resolution one.
- [x] **Seeding fixed (edge `a277eab`): the binding is now on EDGE and the skill RESOLVES.**
      `IndexQuerySource count: 1`, then
      `sync complete {skills: 1, skillKeys: ["org.dxos.skill.database"]}`. The test seeds through
      EDGE's queue route instead of a client `Feed.append`, and carries the control permanently.
- [ ] **What remains: a RESOLVED skill still yields `toolkit: []`.** The chain is now fully mapped,
      and the last link is the tool INDEX, not the binding. `makeToolResolverFromOperations` builds
      its index from `Operation.PersistentOperation` records read through `Registry.Service` — and
      the hosted run logs ZERO mentions of that type. `DatabaseSkill`'s operations live in
      operation-service's PLUGIN registry (which is what `makeOperationServiceHandlerSet` dispatches
      to), not in the space's ECHO registry that the resolver reads. So the skill names tools the
      host cannot turn into tool definitions. Decide which side moves: publish the operations into
      the space registry when a skill is bound, or give the hosted resolver a view of the worker's
      registry. Only then can the operation-dispatch path this project added actually run.

Two leads were tried BEFORE the seeding fix and both failed; do not repeat them: declaring
      `AiContext.Binding`/`Skill` in the process's `types` (f14e477a), and registering
      `AiContext.Binding` on the test peer (edge 3631bad). Neither changes the empty read, because
      the record is not on EDGE to be typed or queried in the first place. Start from why
      `Feed.append` + `db.flush` + `syncToEdge` leaves EDGE's queue empty here, while the same
      helpers make a message visible in the tests that DO pass (`assertConversationReadable`) — the
      difference between those paths is the whole lead.
- [ ] The alarm self-wake test also still fails; not investigated since the ack work.
