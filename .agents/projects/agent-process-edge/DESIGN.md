# Agent processes on EDGE

Run `Process` instances — first `AgentProcess`, plus a trivial test process — inside Cloudflare
Durable Objects, so Composer can start an agent chat that lives in the cloud and keeps running
while the client is closed.

Two repos:

- `dxos/dxos` — the control-plane interfaces (`@dxos/compute`, `@dxos/compute-runtime`) and the
  client-side remote implementation (`@dxos/edge-compute`).
- `dxos/edge` — `compute-service`: the dispatcher/process-manager and the process host DO.

## 1. Where this fits the existing surface

`@dxos/compute` already owns the process model (`Process.Process`, `Process.State`,
`Process.Monitor`) and `@dxos/compute-runtime` owns two managers:

| Interface                      | Shape today                                                                        | Backed by                                        |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| `ProcessManager.Manager`       | full control: `spawn`, `attach`, `list`, handles with inputs/outputs/RPC/terminate | `ProcessManagerImpl` (in-process, KV-persisted)  |
| `RemoteProcessManager.Manager` | read-only `processTree` + `cancel(trigger)`                                        | `EdgeProcessManager` (HTTP, no process tree yet) |
| `RemoteTriggerManager.Manager` | `triggers` atom + `invokeTrigger`                                                  | `EdgeTriggerManager` (HTTP poll)                 |

So the remote surface exists but is a _monitor_, not a _controller_: it can cancel a trigger run and
(in principle) read a tree. Nothing can spawn a process on EDGE or talk to one.

**Decision D1 — the remote surface grows into `ProcessManager.Manager`, it does not get a parallel
API.** `AgentService.layer` (in `@dxos/agent-runtime`) is written against
`ProcessManager.Manager` and nothing else: it spawns `AgentProcess`, `list`s by key/target,
`hydrate`s, and drives `submitInput` / `runUntilSettled` / `subscribeEphemeral` / `terminate`
through a `ProcessManager.Handle`. If EDGE is exposed as _another implementation of that same
interface_, "AgentService can spawn and control remote agents on edge" is satisfied by providing a
different layer — no second agent API, no fork in the assistant stack.

Concretely:

- `ProcessManager.Manager` and `ProcessManager.Handle` stay the contract.
- A new `RemoteProcessManager.RemoteManager` **extends** the existing read-only `Manager` with the
  control verbs, and the existing `Manager` (`processTree`, `processTreeAtom`, `cancel`) is kept as
  the monitor projection consumed by `ProcessMonitor.layer` — no breakage for existing callers.
- `EdgeProcessManager` implements the control verbs over HTTP against compute-service and exposes
  itself as **both** `RemoteProcessManager.Service` (monitor, as today) and, via
  `EdgeProcessManager.processManagerLayer`, `ProcessManager.Service` — which is what
  `AgentService.layer` is then provided with.

**Decision D2 — triggers keep their own interface.** `RemoteTriggerManager` stays as-is on the
client. What changes is the server: the DO that dispatches triggers _is also_ the process manager
(see D4), so a trigger firing an agent and a client spawning an agent go through one component.

## 2. Server topology (edge repo, `compute-service`)

```
                    HTTP /compute/processes/:spaceId/...
                                  |
                    TriggersDispatcher  (renamed role: ProcessManager)
                    - one DO per space
                    - existing: cron/subscription/webhook trigger dispatch
                    - new: owns the set of ProcessObject DOs for the space
                           (spawn, index, list, terminate, reap)
                                  |
                    +-------------+-------------+
                    |                           |
              ProcessObject               ProcessObject      one DO per PROCESS
              (pid = DO name)             ...
              - hosts exactly one Process from the built-in registry
              - ProcessManagerImpl + DO-storage KeyValueStore
              - DO alarm mirrors the process's persisted alarmDueAt
              - buffers outputs + ephemeral trace for cursor reads
```

**Decision D3 — one DO per process, named by pid.** A process is a unit of isolated durable state
with its own alarm; that is exactly a DO. Sharing one DO across a space's processes would serialize
every agent turn in the space behind one single-threaded isolate and make one runaway agent's CPU
budget everyone's problem. The dispatcher keeps only the _index_ (pid → key, target, state,
environment), which is what `list()` needs, and the process's own state lives in its own DO.

**Decision D4 — the dispatcher is the process manager.** `TriggersDispatcher` already is the
per-space compute control point (it holds the space id, the trigger loader, the invoker, the
inactivity timeout). Making it own process lifecycle keeps one DO per space as the single writer of
"what compute exists for this space", which is what makes `list()` cheap and reaping correct. Its
class name stays `TriggersDispatcher` for this phase (renaming a DO class is a migration, not a
refactor — the binding name and every `rpcMethods` entry move with it); the _role_ rename is
documented and a follow-up task.

**Decision D5 — reuse `ProcessManagerImpl` verbatim inside the DO; do not write a second runtime.**
`ProcessManagerImpl` already takes a `KeyValueStore`, persists every process record and event, and
supports `shutdown`/`startup`/`Handle.hydrate` for exactly the suspend-resume shape a DO needs. So
the DO supplies:

1. a `KeyValueStore` over `ctx.storage` (new: `DurableObjectKeyValueStore`);
2. a memoized `_init` (per the repo's DO rule) that constructs the manager and re-hydrates the one
   process from storage with its definition from the built-in registry;
3. a DO alarm mirroring the process's persisted `alarmDueAt`, so a hibernated process still wakes.
   `ProcessHandle` schedules alarms with an in-memory `Effect.sleep` (dies with the isolate) but
   persists `alarmDueAt` and exposes `rearmAlarm` — the DO reads the persisted due-time after every
   turn and calls `ctx.storage.setAlarm`, and on alarm re-hydrates then `rearmAlarm`s in the past so
   it fires at once. (Upstream nicety, tracked: an explicit `onAlarmScheduled` hook instead of
   reading the store.)

**Decision D6 — a closed registry of process definitions, keyed by `Process.key`.** A DO cannot be
handed a closure over the wire. Phase 1 ships two entries: `AgentProcess`
(`AGENT_PROCESS_KEY`) and a new `TestProcess` added to the edge source tree, whose whole purpose is
to exercise the process surface (inputs → outputs, an RPC that reads its own state, an alarm, an
explicit succeed/fail) with no AI, no database and no network. User-authored processes are out of
scope here — that is the existing uploaded-function path.

## 3. Wire protocol

New routes on compute-service, mirroring the existing `/compute/functions/:spaceId/...` shape and
carried by new `EdgeHttpClient` methods:

| Route                                     | Verb   | Maps to                                                             |
| ----------------------------------------- | ------ | ------------------------------------------------------------------- |
| `/compute/processes/:spaceId`             | POST   | `spawn` (body: process key, params, environment, annotations) → pid |
| `/compute/processes/:spaceId`             | GET    | `list` (query: key, target, state) → `Process.Info[]`               |
| `/compute/processes/:spaceId/:pid`        | GET    | `status` → `Process.Info`                                           |
| `/compute/processes/:spaceId/:pid`        | DELETE | `terminate`                                                         |
| `/compute/processes/:spaceId/:pid/input`  | POST   | `submitInput`                                                       |
| `/compute/processes/:spaceId/:pid/rpc`    | POST   | one RPC request/response against the process's `RpcGroup`           |
| `/compute/processes/:spaceId/:pid/events` | GET    | cursor read of buffered outputs + ephemeral trace                   |

**Decision D7 — outputs and trace are read by cursor, not pushed.** A stream needs a socket; edge
already has one (the router WS) but wiring process fan-out into it is a larger change than this
project needs, and a cursor read is what makes the _client_ handle resumable across a reload — the
property that matters for a cloud-hosted agent. `Handle.subscribeOutputs` / `subscribeEphemeral` on
the remote handle are therefore `Stream`s over a poll with a monotonic sequence cursor; the DO
retains a bounded ring of events. Pushing over the WS is a follow-up that changes only the transport
behind those two streams.

**Decision D9 — the RPC route is effect-rpc-over-HTTP, not a hand-rolled envelope.** The host mounts
an `RpcServer` for the process's declared group and the client drives it with `RpcClient` over
`RpcClient.makeProtocolHttp` (ndjson). So request and response schemas are encoded by the group
itself, and neither side re-implements correlation or serialization. The Hono route forwards the raw
request into the process's DO, which serves the app.

**Decision D8 — `runToCompletion` / `runUntilSettled` are derived client-side** from polled state
(`IDLE`/`SUCCEEDED` etc. per the local semantics), not new endpoints, so the two settle predicates
cannot drift from `ProcessHandle`'s definitions. Telling them apart remotely needs one extra wire
field — `ProcessInfo.alarmPending` — since hybernation with a pending alarm means more queued turn
work while hybernation without one means only background children remain.

## 4. Verification (edge test harness, e2e)

Both are `*.node.test.ts` under `packages/services/edge/test`, against the miniflare harness.

1. `processes.node.test.ts` — the **full process surface on `TestProcess`**: spawn; query
   (`list`/`status`); submit inputs; observe outputs; call an RPC; observe an alarm turn; terminate;
   assert terminal state and that storage is cleared. This is the test that proves the protocol, and
   it is deliberately AI-free so it is fast and deterministic.
2. `agent-process.node.test.ts` — **`AgentService` driving a remote agent**: build the client-side
   `AgentService.layer` over `EdgeProcessManager`'s `ProcessManager.Service`, `getSession(feed)`,
   `submitPrompt`, `waitForCompletion`, assert the reply lands in the feed, then `terminate`. Uses
   the harness's existing AI stubbing so no live model call is needed.

## 5. Out of scope

- User-authored (uploaded) processes — the closed registry only.
- WS push for outputs/trace (D7).
- Renaming the `TriggersDispatcher` DO class (D4).
- Migrating existing trigger-invoked operations onto the process host; triggers keep invoking
  functions as they do today.
