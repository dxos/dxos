# Mailbox sync cancellation → edge-executed triggers

Wire the mailbox-sync progress meter's cancel ("x") to actually stop an
**edge-executed** sync: cancel the current in-flight run *and* its
`runAgain` continuation chain, while leaving the recurring timer trigger
enabled so the next cron tick re-syncs.

Follow-up to
[`2026-07-11-progress-monitor-capability-design.md`](2026-07-11-progress-monitor-capability-design.md),
which shipped the progress registry/meter and explicitly deferred
"No cancellation/abort control surface" as a non-goal. This spec adds that
surface, scoped to edge-run sync triggers.

## Problem

The mailbox-sync meter has a cancel control, but for an **edge-executed** sync
it is a **silent no-op**. Two independent gaps:

1. **Client never reaches edge.** `ProgressStatusIndicator` → `registry.cancel(name)`
   → the progress trace sink's `terminateProcess(pid)`
   ([`plugin-progress/.../trace-progress-sink.ts`](../../../packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts))
   → `ProcessManager.attach(pid).terminate()`. But
   [`ProcessManagerImpl.attach`](../../../packages/core/compute/compute-runtime/src/ProcessManager.ts) only
   searches in-memory **local** handles; an edge `pid` is "not found" and the
   error is swallowed. The `pid` on the trace event is the edge process id
   (minted per invocation, `runtimeName: edge-intrinsic`).
   [`RemoteProcessManager`](../../../packages/core/compute/compute-runtime/src/RemoteProcessManager.ts) is
   read-only (`processTree` only) and
   [`EdgeProcessManager`](../../../packages/core/compute/edge-compute/src/EdgeProcessManager.ts) is a stub.
   There is a process **monitor** aggregate but **no remote control path**.

2. **Edge has no cancellation surface at all.** Operations run as blocking
   request/response RPCs (`COMPUTE_INTRINSICS_SERVICE.invokeOperation`) inside
   the stateless `compute-intrinsics` Worker; the `pid` is a throwaway trace
   tag, never stored. A backfill is a **chain of bounded runs** re-dispatched by
   the per-space `TriggersDispatcher` Durable Object via `runAgain`
   continuations. Nothing can stop a chain today except disabling the trigger,
   and nothing can interrupt an in-flight run.

## Goals

- The meter's "x" on an edge-run mailbox sync stops the **current run** and its
  **continuation chain** promptly; the meter shows `Cancelled` and clears.
- The recurring **timer/cron trigger stays enabled** — the next tick re-syncs.
- Cancellation is **addressed by trigger** (the stable key both sides share),
  routed through the **process-manager control path** (symmetric with the
  existing local-cancel path).
- Local (non-edge) sync cancellation keeps working unchanged.

## Non-goals

- No cancel for arbitrary/manual (non-trigger) edge invocations (`invokeFunction`
  with an ephemeral pid). Out of scope; noted under Future.
- No forced isolate kill on edge (impossible per-invocation on Workers without
  killing co-tenants) — cancellation is cooperative.
- No change to trigger enable/disable semantics or the cron schedule.
- No persistence/history of cancellations beyond what the DO needs.

## Locked decisions (from brainstorming)

1. **Cancel run + chain, keep cron.** "x" cancels the current job and its
   rerunning chain; the cron re-triggers later.
2. **Cancel the current execution too**, not only the chain (user request) —
   cooperative in-flight abort is a first-class requirement, not an add-on.
3. **Route through the process manager.** Client entry stays symmetric: the
   progress sink dispatches local-vs-remote by `meta.runtimeName`; the remote
   branch is the edge "process manager" control.
4. **Sync is already edge-native** — no work to make it remote. (The story may
   need `remote: true` + a local edge to *exercise* it — see Testing.)
5. **Approach A**: the `TriggersDispatcher` DO is the edge cancellation
   authority (it owns the continuation queue + dispatched the run), rather than
   building a standalone edge ProcessManager/pid registry (Approach B, deferred
   as premature — pid is ephemeral and the chain spans pids).
6. **Cancel lives on `RemoteProcessManager` (control-only).** Keep the
   "process manager" mental model: add a `cancel` *control* method to
   `RemoteProcessManager`; its read view (`processTree`) stays empty/stubbed —
   this does **not** build the deferred edge process-tree endpoint (Decision D3).
   The client tracks edge *triggers* + *trace*, not edge *processes*, so
   `EdgeProcessManager.cancel` addresses by `triggerId` and delegates to the edge
   trigger dispatcher. Note: `EdgeProcessManager` is currently unwired
   (`RemoteProcessManager.layerNoop` everywhere) — this design must wire it (④).

## Run/chain identity model

The addressing key across the client↔edge boundary is the **triggerId**
(from trace `meta.trigger`, a `Ref<Trigger>`; also carried as the `trigger:<dxn>`
envelope tag). The unit cancelled is a **run**:

- When a trigger **fires** (cron / subscription / force-run), the DO assigns a
  fresh **`runId`** to that activation.
- Every `runAgain` **continuation** of that activation carries the same `runId`.
- The DO tracks `currentRunId[triggerId]`.
- **Cancel(triggerId)** marks `currentRunId` cancelled.
- The **next cron fire** starts a *new* `runId`, unaffected by a prior
  cancellation. ✅ "cron should still retrigger it."

`runId` is edge-internal; the client never needs it — it cancels "the current
run of trigger T in space S", and the DO resolves which run that is.
(`pid` may be passed for telemetry/correlation but is not the key.)

## Target data flow

```
"x"  ──▶ ProgressMeter.onCancel ──▶ registry.cancel(name)
     ──▶ progress trace sink: read monitor's meta.runtimeName
            local ─▶ ProcessManager.attach(pid).terminate()            (UNCHANGED)
            edge  ─▶ RemoteProcessManager.cancel({ space, trigger })   (NEW: control)
                  ─▶ EdgeProcessManager → edgeClient.cancelTriggerRun(space, triggerId)   (NEW)
                  ─▶ POST /functions/:spaceId/triggers/crons/:triggerId/cancel            (NEW route)
                  ─▶ TriggersDispatcher DO.cancelTriggerRun(triggerId)  (NEW)
                        1. mark currentRunId[triggerId] cancelled (durable)
                        2. fire the live cancel handle for the in-flight invocation
                        3. drop / skip queued continuation(s) for that runId
        in-flight run (compute-intrinsics):
             invokeOperation received a cancellation channel ──▶ AbortSignal
             ──▶ mail-sync: Pipeline.abortWith(signal) halts at next boundary
             ──▶ provider fetch(url, { signal }) aborts in-flight network I/O
             ──▶ emits status.update { message: 'Cancelled' } ──▶ meter clears
```

## Components & interfaces

Six units. Each is independently testable; interfaces are sketches, not final.

### Client (dxos)

**① Progress trace sink captures routing metadata.**
[`app-toolkit/.../progress-trace-sink.ts`](../../../packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.ts)
today stores only `{ handle, pid }` per monitor and reads `message.meta.pid`.
Extend `MonitorEntry` to capture what routing needs, from `message.meta`:

```ts
type MonitorEntry = {
  handle: ProgressMonitor;
  pid?: string;
  space?: string;                 // meta.space
  trigger?: string;               // triggerId from meta.trigger (Ref) / `trigger:` tag
  runtimeName?: string;           // meta.runtimeName
};
```

Replace the single `terminateProcess?: (pid) => void` option with a cancel
dispatcher that receives the entry, so plugin-progress can route:

```ts
export type ProgressTraceSinkOptions = {
  cancelProcess?: (entry: {
    pid?: string; space?: string; trigger?: string; runtimeName?: string;
  }) => void;
};
```

`makeOnCancel` calls `cancelProcess(entry)` (still also does the local
`cancelMonitor(key)` for immediate UI feedback, unchanged).

**② Local-vs-edge routing + remote control wiring.**
[`plugin-progress/.../trace-progress-sink.ts`](../../../packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts)
builds `cancelProcess`:

```ts
const cancelProcess = (entry) => {
  if (entry.runtimeName && Trace.isEdgeRuntime(entry.runtimeName) && entry.trigger && entry.space) {
    // Remote branch — the edge "process manager".
    remoteProcessManager.cancel({ space: entry.space, trigger: entry.trigger, pid: entry.pid });
  } else if (entry.pid) {
    // Local branch — unchanged.
    processManagerRuntime … attach(pid).terminate();
  }
};
```

**③ `RemoteProcessManager` gains a control method.**
[`compute-runtime/.../RemoteProcessManager.ts`](../../../packages/core/compute/compute-runtime/src/RemoteProcessManager.ts)
is read-only; add optional control (so `layerNoop` and app-framework stay
valid — control is a no-op where unimplemented):

```ts
export interface Manager {
  readonly processTree: Effect.Effect<readonly Process.Info[]>;
  readonly processTreeAtom: Atom.Atom<readonly Process.Info[]>;
  // NEW — cancel the current run of a remote trigger. No-op in layerNoop.
  readonly cancel?: (target: { space: string; trigger: string; pid?: string }) => Effect.Effect<void>;
}
```

The read view (`processTree`/`processTreeAtom`) is untouched — this adds a
control method only; the edge process tree stays empty (Decision 6). `layerNoop`
leaves `cancel` undefined, so the routing in ② guards on its presence.

**④ `EdgeProcessManager.cancel` + edge-client method.**
[`edge-compute/.../EdgeProcessManager.ts`](../../../packages/core/compute/edge-compute/src/EdgeProcessManager.ts)
implements `cancel` via the edge client, mirroring how
[`EdgeTriggerManager`](../../../packages/core/compute/edge-compute/src/EdgeTriggerManager.ts) does
`forceRunCronTrigger`:

```ts
cancel: ({ space, trigger }) =>
  Effect.promise(() => getEdgeClient().cancelTriggerRun(DxosContext.default(), space, trigger)).pipe(Effect.orDie),
```

Add `cancelTriggerRun(ctx, spaceId, triggerId): Promise<void>` to
`@dxos/edge-client` (the sibling of `forceRunCronTrigger`) + the request type in
`@dxos/edge-protocol`.

**Wire `EdgeProcessManager`.** Today every host installs
`RemoteProcessManager.layerNoop` and `EdgeProcessManager` is unwired, so `cancel`
would never reach edge. Add a `RemoteProcessManagerSpec` in plugin-routine's
[`layer-specs.ts`](../../../packages/plugins/plugin-routine/src/capabilities/layer-specs.ts)
that provides `EdgeProcessManager.fromClient(client)` when `edge.url` is
configured (else `layerNoop`) — mirroring the existing `RemoteTriggerManagerSpec`
gate — and have `process-manager-capability.ts` consume the contributed
`RemoteProcessManager.Service` instead of hardcoding `layerNoop`.
`EdgeProcessManager.processTree` stays the empty stub; only `cancel` is added.

### Edge

**⑤ HTTP route + DO method + durable chain-cancel.**
New Hono route mirroring the force-run path
(`POST /functions/:spaceId/triggers/crons/:triggerId/run`):

```
POST /functions/:spaceId/triggers/crons/:triggerId/cancel
```

resolves the per-space `TriggersDispatcher` DO
(`env.TRIGGERS_DISPATCHER.get(idFromName(spaceId))`) and calls a new DO method
(added to the `durable-objects.ts` RPC allowlist):

```ts
cancelTriggerRun(triggerId: string): Promise<void>
// 1. read currentRunId[triggerId]; if none, no-op.
// 2. persist cancelledRunIds += currentRunId (DO storage) — survives eviction.
// 3. fire the in-memory live cancel handle for the in-flight invocation (if any).
// 4. remove queued continuation(s) for currentRunId from the continuation queue.
```

The continuation dispatcher (`_processContinuationQueue` / `run-again.ts` in the
edge repo) checks `cancelledRunIds` before dispatching a continuation and
**skips** a cancelled run. Cron scheduling is untouched.

**⑥ In-flight abort: cancellation channel → `AbortSignal` → mail-sync.**
Thread a cancellation channel from the DO into the invocation and expose it to
the operation as an `AbortSignal`:

- Extend `InvokeIntrinsicRequest` (`@dxos/edge-protocol`) with a cancellation
  capability. **Recommended:** a JSRPC awaitable the DO controls
  (`cancellation.waitForCancel(): Promise<void>`), valid for the invoke's
  lifetime (the DO holds the RPC open; the per-space DO is a singleton so a
  concurrent cancel request lands on the same instance and resolves it).
- In `compute-intrinsics` (`main.ts` `invokeOperation`), build an
  `AbortController`; `waitForCancel().then(() => controller.abort())`; provide a
  `Cancellation`/`AbortSignal` service into the operation's context.
- [`mail-sync.ts`](../../../packages/plugins/plugin-inbox/src/operations/mail/mail-sync.ts): drive
  `Pipeline.abortWith` (already wired) from the injected signal **when present**,
  so on edge the pipeline halts at the next page/commit boundary and reports
  `Cancelled`; also pass the signal into the provider's `fetch(url, { signal })`
  calls so in-flight network I/O to Gmail/JMAP aborts immediately. The
  cancellation service is **optional** — absent on the local runtime, where
  cancellation stays exactly as today (`handle.terminate()` closes the process
  scope → Effect interruption → `abortWith`'s `onInterrupt`). This also retires
  the local `AbortController` that is currently created but never aborted.

**Robustness / fallback.** The durable `cancelledRunIds` marker is the
authoritative chain-stop and covers the race where cancel arrives with no
in-flight run (or after an isolate restart). If the JSRPC live channel proves
impractical, the fallback is per-boundary polling of a durable marker the op can
read (e.g. a run-state object in the space); higher latency but no new RPC
plumbing. **This edge in-flight mechanism is the top implementation risk — spike
it first (see Phasing).**

## Cancellation semantics & lifecycle

- **Idempotent / racy-safe.** Cancel after the run already finished → no-op
  (no `currentRunId`, or it is terminal). Cancel twice → second is a no-op.
- **Status.** On abort the op emits `status.update { message: PROGRESS_STATUS_CANCELLED }`;
  the client meter also notes `Cancelled` immediately on click (existing
  `cancelMonitor`), so the UI is responsive even before the edge round-trips.
- **Cron re-fire.** Next tick → new `runId`; a stale `cancelledRunId` never
  blocks it. Bound `cancelledRunIds` (e.g. keep last N / TTL) so it doesn't grow.

## Error handling / edge cases

- Edge route unreachable / endpoint absent (old deploy): client `cancel` fails
  soft (the existing edge-client calls already `catchAll`/`orDie` at the layer);
  the meter still clears locally. Surface a warn log, never throw to UI.
- Partial commit: cancelling mid-run leaves already-committed messages +
  advanced cursor/extent intact (mail-sync commits per page and folds the extent
  on the non-cancel path only); a later cron run resumes forward — acceptable,
  same as a crash mid-run today.
- Wrong-space / unknown trigger id at the DO → no-op + warn.

## Testing strategy

- **Unit (client):** extend
  [`progress-trace-sink.test.ts`](../../../packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts):
  an edge-runtime `status.update` (meta `{ pid, space, trigger, runtimeName: 'edge-intrinsic' }`)
  registers a cancellable monitor whose cancel calls `cancelProcess` with
  `{ space, trigger, … }`; a `local` one still calls the local terminate path.
- **Unit (routing):** plugin-progress `cancelProcess` picks remote vs local by
  `isEdgeRuntime`.
- **Unit (edge DO):** `cancelTriggerRun` marks `currentRunId`, drops the queued
  continuation, and the continuation dispatcher skips it; a subsequent fresh
  fire is unaffected.
- **Unit (edge op):** `invokeOperation` aborts the operation when the
  cancellation channel fires; mail-sync stops and emits `Cancelled`.
- **E2E (story):** in
  [`MailboxSync.stories.tsx`](../../../packages/stories/stories-inbox/src/stories/MailboxSync.stories.tsx),
  run the sync trigger as `remote: true` against the local edge
  (`configPreset({ edge: 'local' })`), start a large backfill, click "x", assert
  the meter clears, no further continuations dispatch, and the trigger remains
  enabled (next tick re-syncs). This is also the manual verification.

## Phasing

1. **Spike the edge in-flight mechanism** (JSRPC live channel vs durable-marker
   poll) — de-risk ⑥ before building around it.
2. **Client plumbing (①–④)** — capture meta, route local/edge, `RemoteProcessManager.cancel`,
   `EdgeProcessManager` + edge-client/protocol. Verifiable with a stub edge.
3. **Edge chain-stop (⑤)** — route + DO `cancelTriggerRun` + continuation skip.
   Delivers "cancel the chain" end-to-end.
4. **Edge in-flight abort (⑥)** — cancellation channel → AbortSignal → mail-sync
   `Pipeline.abortWith` + fetch signal. Delivers "cancel the current execution".
5. **Story e2e + polish.**

## Cross-repo coordination

- **dxos PR:** ①–④ (incl. wiring `EdgeProcessManager` via a `RemoteProcessManagerSpec`,
  replacing `layerNoop` where `edge.url` is set) + mail-sync signal wiring +
  `@dxos/edge-client` / `@dxos/edge-protocol` method/type additions.
- **edge PR:** ⑤–⑥ (route, DO method + allowlist, continuation skip,
  `invokeOperation` cancellation channel, compute-intrinsics `AbortSignal`
  service). `compute-intrinsics` bundles `InboxPlugin` at build time, so the
  mail-sync signal-consuming change ships to edge only after a
  `compute-intrinsics` redeploy (cf. the "remote-sync edge op missing" incident
  where a stale deploy silently lacked the op).
- **Protocol:** add the cancellation field/method to `@dxos/edge-protocol`
  first; both sides tolerate its absence (old client / old edge) — cancel
  degrades to local-only UI clear.

## Open questions

1. **Edge in-flight channel** — is a long-lived JSRPC awaitable across the
   `COMPUTE_INTRINSICS_SERVICE` binding sound, or do we take the durable-marker
   poll? (Phase 1 spike decides.)
2. **Route/DO naming** — `cancelTriggerRun` vs `cancelCronTrigger`; confirm it
   reads as "cancel the current run", not "delete the trigger".
3. **`cancelledRunIds` retention** — bound size / TTL policy in the DO.
4. **Manual (non-trigger) edge syncs** — if a `ConnectorOperation.SyncConnection`
   ever invokes mail-sync directly on edge (no trigger), it has no triggerId to
   address; left out of scope here (would need Approach B). Confirm sync is
   always trigger-initiated on edge.
