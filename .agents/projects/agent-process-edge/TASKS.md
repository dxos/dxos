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

## Phase 2 — process host (edge) — IN PROGRESS

**Blocked on publication, which needs #12765 MERGED.** The edge repo consumes `@dxos/*` from pinned
`pkg.pr.new` builds, and `.github/workflows/pkg-pr-new.yml` in dxos/dxos triggers only on push to
`main` (plus `workflow_dispatch`) — a green PR publishes nothing. So nothing here compiles until
#12765 lands and this repo's `dxos` catalog is bumped to that commit. Write-ahead is fine;
verification is not.

The one way to unblock earlier: a maintainer dispatches the `pkg.pr.new` workflow manually against
`claude/agent-process-edge-g21cil`, which publishes commit-pinned packages without merging.

- [x] `DurableObjectKeyValueStore`: `effect` `KeyValueStore` over `ctx.storage` — this is what lets
      `ProcessManagerImpl` run inside a DO unchanged (D5).
- [x] `TestProcess` in the edge source tree — inputs→outputs, one RPC that reads state accumulated
      from previous inputs (so a pass proves the call reached _that_ instance), one alarm, explicit
      succeed/fail. Declares no services, so a test on it can only fail on the protocol or the host.
- [ ] Bump the `dxos` catalog to PR #12765's published commit.
- [ ] Built-in process registry keyed by `Process.key` (`TestProcess` + `AgentProcess`).
- [ ] `ProcessObject` DO: memoized `_init`, hosts one process via `ProcessManagerImpl`, DO alarm
      mirrors `Handle.alarmDueAt`, bounded output/trace ring with a monotonic cursor (outputs
      captured by wrapping the definition's `create` to intercept `submitOutput`; trace via the
      manager's `traceSink`). Register every public method in `durable-objects.ts` `rpcMethods`.
- [ ] Service assembly for `AgentProcess` inside the DO — database/AI/credentials/operation services
      from the EDGE bindings. `FunctionContext` in `@dxos/compute-runtime`'s `protocol.ts` already
      assembles exactly this set for invoked functions but does not export it; either export it or
      lift the layer builder. This is the largest remaining unknown.
- [ ] `ProcessObject` class in `compute-service/wrangler.jsonc`: a sqlite-storage entry in the
      `exports` map and a binding in the top-level plus all four env blocks, per
      `scripts/check-wrangler-bindings.mjs`.
- [ ] `TriggersDispatcher`: own the per-space process index (spawn/list/terminate/reap) and expose
      it over RPC; add the new methods to `rpcMethods`.
- [ ] compute-service HTTP routes per §3, with the same `edgeAuth` posture as the trigger routes.
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
- [ ] Populate the space-agnostic monitor `processTree` from the list endpoint (still the pre-existing
      D3 TODO; the control path does not need it).

## Phase 4 — verification (edge)

- [ ] `processes.node.test.ts` — full process surface on `TestProcess` (spawn, query, inputs,
      outputs, rpc, alarm, terminate, status).
- [ ] `agent-process.node.test.ts` — `AgentService` spawns and controls a remote agent on edge.
- [ ] `pnpm format`, lint, and the touched test suites green in both repos; PRs opened.

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

- [ ] WS push for outputs/trace instead of cursor polling (D7).
- [ ] `Process`/`ProcessHandle`: an explicit `onAlarmScheduled` hook so the DO need not read
      `alarmDueAt` out of the store (D5).
- [ ] Rename the `TriggersDispatcher` DO class to match its process-manager role (D4) — a binding
      migration, not a refactor.
