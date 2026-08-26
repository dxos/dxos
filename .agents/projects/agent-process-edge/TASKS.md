# Agent processes on EDGE — tasks

Design: [DESIGN.md](./DESIGN.md). Branch (both repos): `claude/agent-process-edge-g21cil`.

## Phase 0 — design

- [x] Survey `Process`/`ProcessManager`/`RemoteProcessManager`/`AgentService` and the edge
      `compute-service` + `TriggersDispatcher`, and decide how remote process control fits the
      existing interfaces (D1–D8).

## Phase 1 — protocol (dxos)

- [ ] `RemoteProcessManager.RemoteManager`: extend the read-only manager with the control verbs
      (`spawn`, `list`, `status`, `submitInput`, `rpc`, `terminate`, cursor `events`), keeping the
      existing monitor `Manager` intact for `ProcessMonitor.layer`.
- [ ] Wire schemas for the routes in §3 (spawn request/response, info, event page) — placed where
      both client and edge can import them.
- [ ] `EdgeHttpClient` methods for the seven routes.

## Phase 2 — process host (edge)

- [ ] `DurableObjectKeyValueStore`: `effect` `KeyValueStore` over `ctx.storage`.
- [ ] `TestProcess` in the edge source tree — inputs→outputs, one RPC, one alarm, explicit
      succeed/fail. No AI, no db, no network.
- [ ] Built-in process registry keyed by `Process.key` (`TestProcess` + `AgentProcess`).
- [ ] `ProcessObject` DO: memoized `_init`, hosts one process via `ProcessManagerImpl`, DO alarm
      mirrors persisted `alarmDueAt`, bounded output/trace ring with a monotonic cursor.
      Register every public method in `durable-objects.ts` `rpcMethods`.
- [ ] `TriggersDispatcher`: own the per-space process index (spawn/list/terminate/reap) and expose
      it over RPC; add the new methods to `rpcMethods`.
- [ ] compute-service HTTP routes per §3, with the same `edgeAuth` posture as the trigger routes.
- [ ] `@dxos/agent-runtime` dependency on compute-service (catalog entry already exists).

## Phase 3 — client implementation (dxos)

- [ ] `EdgeProcessManager`: implement the control verbs over `EdgeHttpClient`; keep the existing
      monitor/`cancel` behaviour, and populate `processTree` from the new list endpoint (closes the
      D3 TODO that left it empty).
- [ ] Remote `ProcessManager.Handle`: outputs/ephemeral as cursor-polled streams,
      `runToCompletion`/`runUntilSettled` derived client-side (D8), `rpc` as an `RpcClient` over the
      rpc route.
- [ ] `EdgeProcessManager.processManagerLayer` providing `ProcessManager.Service`, so
      `AgentService.layer` runs unchanged against edge.

## Phase 4 — verification (edge)

- [ ] `processes.node.test.ts` — full process surface on `TestProcess` (spawn, query, inputs,
      outputs, rpc, alarm, terminate, status).
- [ ] `agent-process.node.test.ts` — `AgentService` spawns and controls a remote agent on edge.
- [ ] `pnpm format`, lint, and the touched test suites green in both repos; PRs opened.

## Tracked follow-ups

- [ ] WS push for outputs/trace instead of cursor polling (D7).
- [ ] `Process`/`ProcessHandle`: an explicit `onAlarmScheduled` hook so the DO need not read
      `alarmDueAt` out of the store (D5).
- [ ] Rename the `TriggersDispatcher` DO class to match its process-manager role (D4) — a binding
      migration, not a refactor.
