---
'@dxos/compute-runtime': patch
---

`TriggerDispatcher` no longer runs its fixed-interval timer while no triggers are defined.

The natural-time loop used to be forked unconditionally by `start()` and repeat forever, so a client with an empty trigger set still woke every `livePollInterval` to invoke nothing. The loop is now forked when the trigger working set becomes non-empty and interrupted when it empties again, driven by the live trigger query that already backs `refreshTriggers`. The interval itself is unchanged while the loop runs.

`TriggerDispatcher` gains a `timerScheduled` getter reporting whether the loop is currently forked, which is how the behaviour is asserted.
