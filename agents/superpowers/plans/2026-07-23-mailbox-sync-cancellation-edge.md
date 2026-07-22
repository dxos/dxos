# Edge implementation — mailbox sync cancellation (⑤ + ⑥-edge)

Companion to
[`../specs/2026-07-22-mailbox-sync-cancellation-design.md`](../specs/2026-07-22-mailbox-sync-cancellation-design.md).
The **dxos** side (①–④c, ⑥-client) is implemented on this branch. The **edge**
side below could **not** be applied in-session: the edge repo
(`/Users/mykola/dev/edge`) was on `main` and the edit guard (correctly) refuses
edits on `main`, and branch creation is disallowed. Apply these on an edge
feature branch. Line numbers are from the state the exploration agent read —
confirm against current source before editing.

The dxos client calls `POST /functions/:spaceId/triggers/crons/:triggerId/cancel`
(added to `@dxos/edge-client` as `EdgeHttpClient.cancelTriggerRun`, already on
this branch). Everything below is what services that route.

## Run/chain identity (recap)

A trigger firing = a **run** with a `runId`; every `runAgain` continuation carries
it. The DO tracks `currentRunId[triggerId]`. Cancel marks that runId cancelled:
the continuation dispatcher skips it (chain stops) and the in-flight invocation is
signalled to abort. The cron schedule is untouched — the next fire is a new runId.

---

## ⑤ Chain-stop

### 1. HTTP route — `packages/services/functions-service/src/api.ts`

Beside the force-run route (`POST /functions/:spaceId/triggers/crons/:triggerId/run`, ~line 354):

```ts
app.post('/functions/:spaceId/triggers/crons/:triggerId/cancel', async (c) => {
  const spaceId = c.req.param('spaceId');
  const triggerId = c.req.param('triggerId');
  const dispatcher = initTriggerDispatcher(c.env, spaceId); // utils/init-stubs.ts
  await dispatcher.cancelTriggerRun(triggerId);
  return c.json({ ok: true });
});
```

### 2. DO RPC allowlist — `packages/services/functions-service/src/durable-objects.ts`

Add `cancelTriggerRun` to the `TriggersDispatcher` method allowlist (lines 13–34),
alongside `forceRunCronTrigger`.

### 3. `TriggersDispatcher` DO — `packages/services/functions-service/src/triggers/trigger-dispatcher-object.ts`

Add durable run-tracking + the cancel method. Persist in DO storage so it
survives eviction.

```ts
// Durable: the current run per trigger, and cancelled runs (bounded).
#currentRunId = new Map<string, string>();               // triggerId -> runId (also persisted)
#cancelledRunIds = new Set<string>();                    // runId (also persisted; cap ~256, FIFO)
// In-memory only: fire handles for invocations in flight in THIS DO turn (⑥).
#inflightCancels = new Map<string, () => void>();        // runId -> abort the in-flight invoke

// Assign at the start of every trigger activation (cron _runCronTasks ~196,
// subscription _processSubscriptionQueue ~317, forceRunCronTrigger ~289) and
// thread `runId` into the invocation options + any runAgain continuation.
#beginRun(triggerId: string): string {
  const runId = EntityId.random();
  this.#currentRunId.set(triggerId, runId);
  void this.state.storage.put(`run/${triggerId}`, runId);
  return runId;
}

async cancelTriggerRun(triggerId: string): Promise<void> {
  const runId = this.#currentRunId.get(triggerId) ?? (await this.state.storage.get(`run/${triggerId}`));
  if (!runId) return;                                    // nothing running — no-op
  this.#cancelledRunIds.add(runId);
  await this.state.storage.put(`cancelled/${runId}`, true);
  this.#inflightCancels.get(runId)?.();                  // ⑥ prompt in-flight abort
}

#isCancelled(runId: string): boolean {
  return this.#cancelledRunIds.has(runId);               // hydrate from storage on boot
}
```

### 4. Continuation skip — `_processContinuationQueue` (~425) + `run-again.ts`

`runAgain` continuations must carry the originating `runId` (add it to the
continuation payload in `run-again.ts`). Before dispatching a dequeued
continuation, skip when cancelled:

```ts
if (this.#isCancelled(continuation.runId)) {
  log.info('skipping continuation of cancelled run', { runId: continuation.runId });
  continue; // drop; do not re-enqueue
}
```

Cron scheduling (`cron-scheduler.ts`) is not touched — the trigger stays enabled.

---

## ⑥-edge In-flight abort

Goal: the currently-running bounded invocation stops promptly (not just the next
continuation). Cooperative — Workers can't force-kill one invocation's isolate.

### 5. Protocol — `packages/sdk/edge-protocol/src/services/compute-intrinsics-service.ts`

Extend `InvokeIntrinsicRequest` (~10–66) with an optional cancellation channel.
**Recommended:** a JSRPC awaitable the caller (DO) controls — valid for the
invoke's lifetime because the DO holds the RPC open, and the per-space DO is a
singleton so a concurrent cancel lands on the same instance:

```ts
export interface CancellationChannel {
  /** Resolves when the run is cancelled. compute-intrinsics races the handler against this. */
  waitForCancel(): Promise<void>;
}
// InvokeIntrinsicRequest: add `cancellation?: CancellationChannel;`
```

Both sides must tolerate its absence (older client/edge → no in-flight abort,
chain-stop still works). **This JSRPC-stub-across-service-binding mechanism is
the top risk — spike it first (spec Phase 1).** Fallback: a durable per-run
cancel marker the operation polls at pipeline boundaries (higher latency, no new
RPC plumbing).

### 6. compute-intrinsics — `packages/services/compute-intrinsics/src/main.ts`

In `invokeOperation` (~62), build an `AbortController` from the channel and
provide the `@dxos/compute` `Cancellation` service into the operation's context,
then run the handler as an interruptible fiber (so `Pipeline.abortWith` and the
signal both fire). The dxos side already consumes `Cancellation` in mail-sync.

```ts
import { Cancellation } from '@dxos/compute';

const controller = new AbortController();
if (request.cancellation) {
  void request.cancellation.waitForCancel().then(() => controller.abort()).catch(() => {});
}
// Provide into the operation Context alongside Trace etc.:
//   Context.add(Cancellation.Cancellation, { signal: controller.signal })
// Run the handler in a fiber and interrupt on abort:
controller.signal.addEventListener('abort', () => { /* interrupt the handler fiber */ }, { once: true });
```

Because `Cancellation` is optional (`Effect.serviceOption`), providing it is
purely additive — operations that ignore it are unaffected.

### 7. Thread the channel — `packages/services/functions-service/src/invocation/function-invoker.ts`

The intrinsic path (~384–393) calls
`COMPUTE_INTRINSICS_SERVICE.invokeOperation(ctx, { … })`. Pass a
`CancellationChannel` whose `waitForCancel()` the DO resolves via the
`#inflightCancels[runId]` handle registered in ⑤(3). Register the handle before
the await, delete it in a `finally`.

---

## Tests (edge)

- **DO unit:** `cancelTriggerRun` marks `currentRunId` cancelled; a queued
  continuation for that runId is skipped by `_processContinuationQueue`; a fresh
  trigger fire (new runId) is unaffected. Model on the existing dispatcher tests.
- **compute-intrinsics unit:** an invocation whose `cancellation.waitForCancel()`
  resolves aborts the operation; assert the run stops. See
  `packages/services/edge/test/trace-progress.node.test.ts` and
  `compute-intrinsics/src/test-operations.ts` for the harness + a status-emitting
  test op.
- **Rebuild the worker bundle** after edits (`pnpm -s bundle`) or node tests run
  stale code.

## Deploy

`compute-intrinsics` bundles `InboxPlugin` (mail-sync) at build time, so the
`Cancellation`-consuming mail-sync ships to edge only after redeploying
`compute-intrinsics` (and the `edge` worker for the new route). Cf. the
"remote-sync edge op missing" incident where a stale deploy silently lacked an op.

## Cross-repo version note

`@dxos/edge-client` (dxos) gained `cancelTriggerRun` on this branch; the edge
route it targets is added here. Until the edge route is deployed, the client
cancel fails soft (logged, meter already cleared locally). No protocol bump is
required for the HTTP route; the `InvokeIntrinsicRequest.cancellation` field is
edge-internal (worker↔worker) and optional.
