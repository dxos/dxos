# functions-runtime — Tasks

_Resume: Pick up the first pending TriggerDispatcher item. Uncommitted: pending. Last: manual trigger spec landed in `@dxos/compute`._

## Phase: TriggerDispatcher follow-ups

Improvements called out in `src/triggers/trigger-dispatcher.ts` — dispatcher state shape, shared monitoring, and per-trigger concurrency.

### Tasks

- [ ] **Rework dispatcher state to be grouped by trigger**
  - Replace flat `invocations: InvocationsState[]` with per-trigger entries keyed by trigger id.
  - Store `Ref`s to trigger objects instead of embedding full trigger copies.
  - Track per-trigger runtime state: feed cursor, last run time, rerun count, in-flight invocations, etc.
  - Source: `TriggerDispatcherState` TODO at `trigger-dispatcher.ts:111`.

- [ ] **Extract TriggerMonitor service to `@dxos/compute`**
  - Shared monitoring/state API for both local (`TriggerDispatcher`) and edge dispatchers.
  - Own the grouped-by-trigger state model from the task above.
  - Source: `trigger-dispatcher.ts:119`.

- [ ] **Respect concurrency limit in `invokeTrigger`**
  - Honor `trigger.concurrency` and dispatcher `maxConcurrency` when manually invoking triggers.
  - Align manual invocation with feed/subscription batching behavior where applicable.
  - Source: `invokeTrigger` TODO at `trigger-dispatcher.ts:308`.

### References

- `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts`
- `packages/core/compute/compute/src/Trigger.ts`
- `packages/core/compute/compute/src/TriggerEvent.ts`
