# Handoff: unified trigger runtime state + RunAgainError retry queue

Date: 2026-07-14
Worktree: `/Users/dmaretskyi/Code/dxos/dxos`
Branch: `dm/try-again-error`

## Goal

Rework the local `TriggerDispatcher` runtime so that:

1. **One runtime-state map for all triggers.** Combine the two per-trigger maps
   (`_scheduledTriggers`, cron-only, and `_cooldownUntil`, all kinds) into a single
   `Map<triggerId, RuntimeTriggerState>` covering **every** trigger kind, not just cron/timer.
   The entry must capture *when/whether the trigger should run again* — next cron execution,
   failure cooldown, and a pending **retry** (from `RunAgainError`).
2. **`RunAgainError` retry queue.** When an operation calls `Operation.runAgain()`, the trigger
   must be re-invoked. Retried triggers go to the **end of the invocation queue** (fair ordering)
   and are drained **respecting the concurrency limit**.
3. **Implement the concurrency TODO** at `trigger-dispatcher.ts:308` (currently
   `// TODO(dmaretskyi): Respect concurrency limit.` above `invokeTrigger`). Enforce the global
   `_maxConcurrency` (default 5) across invocations, alongside existing per-trigger `concurrency`.
4. **Expose the runtime trigger state** on the atom-backed `TriggerDispatcherState`
   (`trigger-dispatcher.ts:109`) so the UI can observe per-trigger status (cursor, next run,
   cooldown, pending retries, last result).

Original request (verbatim):

> update trigger dispatcher to support this functionality
>
> combine _scheduledTriggers + _cooldownUntil into one map for the runtime trigger state for all
> triggers, not only cron. it should include where the trigger should be retried. the retried
> triggers should be placed at the end of the queue of incocations (respecting concurency) also
> impl this todo trigger-dispatcher.ts:308
>
> also expose the runtime trigger state here trigger-dispatcher.ts:109

## The driving test (currently `it.effect.only`, failing)

`packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts` ~905–923:

```ts
describe('Retry', () => {
  it.effect.only('should if trigger returns RunAgainError', Effect.fnUntraced(function* ({ expect }) {
    const dispatcher = yield* TriggerDispatcher;
    const op = yield* registerOperation(RetryOp);
    const trigger = Trigger.make({ runnable: Ref.make(op), enabled: true, spec: Trigger.specDirect() });
    yield* Database.add(trigger);
    const result = yield* dispatcher.invokeTrigger({ trigger, event: {} });

    yield* dispatcher.invokeScheduledTriggers({ untilExhausted: true });
    const counter = yield* Database.query(Filter.type(RetryCounter)).first.pipe(Effect.flatten);
    expect(counter.count).toBe(3);
  }, Effect.provide(TestLayer())));
});
```

`RetryOp` / `RetryCounter` / `TestHanlers` are defined at test lines ~81–121. The handler
increments a persisted `RetryCounter` and calls `Operation.runAgain()` while `count < 3`,
otherwise returns success. Expected run sequence:

| Run | entry point | count before | action |
|-----|-------------|--------------|--------|
| 1 | `invokeTrigger` | 0 | ++ → 1, `runAgain()` |
| 2 | retry drain | 1 | ++ → 2, `runAgain()` |
| 3 | retry drain | 2 | ++ → 3, `runAgain()` |
| 4 | retry drain | 3 | `count >= 3` → success, no re-enqueue |

Final `counter.count === 3` (4 runs, last succeeds).

**Before finishing, remove `.only`** (`it.effect.only` → `it.effect`) so the full suite runs.

Note the trigger uses `Trigger.specDirect()`. Direct triggers are normally skipped by
`invokeScheduledTriggers` (`trigger-dispatcher.ts:587`). The retry drain must re-invoke the
trigger **regardless of kind** — the re-run queue is keyed on the pending-retry state, not on the
trigger spec kind.

## Current state (verified)

`packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts`:

- `_triggers: Trigger.Trigger[]` (line 195) — all fetched (non-`remote`) triggers, refreshed by
  `refreshTriggers` (621) via `_fetchTriggers` (674).
- `_scheduledTriggers = new Map<string, ScheduledTrigger>()` (196). `ScheduledTrigger` =
  `{ trigger, cron: Cron.Cron, nextExecution: Date }` (interface at 93–97). Populated **only** for
  `spec.kind === 'timer'` in `refreshTriggers` (635–667).
- `_cooldownUntil = new Map<string, Date>()` (208). Set on failure in `invokeTrigger`
  (392–394), cleared on success (390). Read via `_isInCooldown` (219–229) in every
  `invokeScheduledTriggers` branch.
- `_maxConcurrency` (206, default `DEFAULT_MAX_CONCURRENCY = 5` at 184). Currently only used to
  cap **feed** per-trigger concurrency (471). Timer runs `{ concurrency: 1 }` (448);
  subscription runs sequentially. **Global max is not enforced** — that's the 308 TODO.
- `_failureCooldown` (207, default 30s at 185).
- `invokeTrigger` (309–411): builds an `InvocationsState`, pushes to atom state, runs the op in a
  sandboxed `Effect.gen(...).pipe(Effect.exit)`, then sets/clears cooldown and records the result.
- `invokeScheduledTriggers` (413–596): calls `refreshTriggers`, then per `kind` (`timer`, `feed`,
  `subscription`, `direct`) collects and invokes due triggers.
- `TriggerDispatcherState` (109–114): `{ enabled, invocations: InvocationsState[], errors: Error[] }`,
  exposed as `state: Atom.Atom<...>` (125, 235). There is already a TODO at 111 to rework this
  grouped-by-trigger. `InvocationsState` (101–107): `{ invocationId, trigger, function, event, result }`.
- `stop` (280–306) clears both maps (302–303) — keep clearing whatever replaces them.

**RunAgainError plumbing is already fixed** (do not redo):

- `Operation.runAgain()` dies with `RunAgainError` — `packages/core/compute/compute/src/Operation.ts:659`.
- `RunAgainError` — `packages/core/compute/compute/src/errors.ts:13` (`BaseError.extend`,
  exported from `@dxos/compute`; `RunAgainError.is(x)` guard, `_tag === 'RunAgainError'`).
- `ProcessHandle.#runAndExitInterruptEffect` now uses `Deferred.failCause` (not `Deferred.die`)
  on `FAILED`, so the process cause propagates intact —
  `packages/core/compute/compute-runtime/src/ProcessHandle.ts:467-472`. As a result,
  `handle.runAndExit(...)` failure surfaces as `Exit.die(RunAgainError)` (defect is the real error
  object; `Cause.squash(cause)` returns the `RunAgainError`). A lock-in test exists:
  `ProcessManager.test.ts` → "runAndExit propagates the process failure cause without stringifying
  or nesting".

So inside `invokeTrigger`, the sandboxed `result` (an `Exit`) can be inspected: on failure,
`Cause.squash(result.cause)` (or walking `Cause.defects`) yields the defect; `RunAgainError.is(defect)`
distinguishes a retry request from a genuine failure.

## Design guidance

### Unified runtime state

Replace `_scheduledTriggers` + `_cooldownUntil` with one map, e.g.:

```ts
type RuntimeTriggerState = {
  trigger: Trigger.Trigger;
  // Timer only:
  cron?: Cron.Cron;
  nextExecution?: Date;
  // All kinds:
  cooldownUntil?: Date;
  retryPending?: boolean;   // set when the last run returned RunAgainError
  enqueuedAt?: number;      // for FIFO ordering of retries at the tail of the queue
  lastResult?: Exit.Exit<unknown> | null;
  // feed cursor already lives in Obj meta (KEY_FEED_CURSOR) — reference or mirror as needed.
};
private _runtimeState = new Map<string, RuntimeTriggerState>();
```

- `refreshTriggers` populates/prunes entries for **all** triggers (currently it only handles timer;
  keep the cron parsing + `nextExecution` carry-over logic at 640–658, but create an entry for
  every trigger so cooldown/retry can be tracked uniformly).
- `_isInCooldown` reads `entry.cooldownUntil`.
- Keep `stop()` clearing `_runtimeState`.

### Retry queue

- In `invokeTrigger`, after `result` is computed: if it's a failure whose squashed defect is a
  `RunAgainError`, **do not** set failure cooldown. Instead mark the trigger's runtime entry as
  `retryPending` (record `enqueuedAt`) so it is re-invoked at the **tail** of the queue. Genuine
  failures keep the existing cooldown behavior.
- `invokeScheduledTriggers` should, after processing the normal per-kind work, **drain pending
  retries** in FIFO order. When `untilExhausted`, keep draining until no `retryPending` entries
  remain (a run that succeeds clears `retryPending`; a run that returns `RunAgainError` re-sets it,
  landing again at the tail). Without `untilExhausted`, process one pass.
- Decide how retries appear in the returned `TriggerExecutionResult[]` (they are invocations, so
  likely appended in order).

### Concurrency (the 308 TODO)

- Introduce a global limiter (e.g. `Effect.Semaphore` sized to `_maxConcurrency`) that wraps each
  actual op invocation, so total concurrent invocations across all triggers/kinds never exceeds
  `_maxConcurrency`, while still honoring per-trigger `concurrency` (Trigger schema field, see
  `packages/core/compute/compute/src/Trigger.ts:201`). The feed path already computes
  `Math.min(trigger.concurrency ?? 1, this._maxConcurrency)` (471) — unify this so timer,
  subscription, and retry-drain paths all respect the global cap.
- Retry draining must go through the same limiter so retries "respect concurrency".

### Expose runtime state

- Extend `TriggerDispatcherState` (109) to surface per-trigger runtime status derived from
  `_runtimeState` — e.g. add a `triggers: Array<{ triggerId, nextExecution?, cooldownUntil?,
  retryPending?, lastResult? }>` field (resolve the existing rework TODO at 111). Update the
  `registry.update(this._state, Struct.evolve({...}))` sites (247, 288, 324, 347, 401) to keep the
  new field in sync, and initialize it in the `Atom.make` default (201–205).
- Keep `MAX_TRACKED_INVOCATIONS` / `MAX_TRACKED_ERRORS` semantics.

## Files to touch

- `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts` — all of the above.
- `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts` — remove
  `.only` (line 906); the `Retry` test is the acceptance test. Add focused tests for: cooldown vs
  retry distinction, retry ordering at tail, global concurrency cap, and runtime-state exposure.
- Possibly `trigger-state-store.ts` if retry/cursor state should persist across restarts — **out of
  scope unless required**; the current retry test is in-memory and single-process.

## Acceptance criteria

- `Retry > should if trigger returns RunAgainError` passes with `.only` removed.
- One map holds runtime state for all trigger kinds; `_scheduledTriggers` and `_cooldownUntil` are
  gone.
- `RunAgainError` re-invokes at the tail of the queue; genuine failures still cooldown.
- Global `_maxConcurrency` is enforced across all invocation paths (308 TODO removed).
- `TriggerDispatcherState.state` exposes per-trigger runtime status.
- Full file suite green (not just the retry test).

## Run / verify

- Single test: `moon run functions-runtime:test -- src/triggers/trigger-dispatcher.test.ts -t "RunAgainError"`
- Whole file: `moon run functions-runtime:test -- src/triggers/trigger-dispatcher.test.ts`
- Also run `moon run compute-runtime:test -- src/ProcessManager.test.ts` (RunAgain lock-in test).
- Lint: `moon run functions-runtime:lint -- --fix`.
- Ignore the `Auth token DEPOT_TOKEN does not exist` remote-cache warning.

## Open questions to resolve before/while coding

1. **`invokeTrigger` return on RunAgainError:** should the first `invokeTrigger` call report the
   `RunAgainError` exit as its `result`, or a "pending retry" success? The test no longer asserts
   on the first `result`, so either is acceptable — pick and document.
2. **Retry backoff/limits:** is there a max retry count or delay between retries, or unbounded
   until success (current test expects unbounded until the handler stops calling `runAgain`)?
   Confirm before adding guards.
3. **Persistence:** should `retryPending` survive dispatcher restart (persist via
   `TriggerStateStore`) or stay in-memory? Current scope is in-memory.
4. **Natural-time loop:** `_startNaturalTimeProcessing` (683) polls `invokeScheduledTriggers()`
   without `untilExhausted`. Confirm retries should drain across poll ticks (one retry per tick)
   vs within a tick.
