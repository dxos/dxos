---
'@dxos/brain': minor
'@dxos/plugin-agent': minor
---

`@dxos/brain` gains `Evaluator`, which evaluates every subscription of one brain with `GoalRules` over a shared fact stream (`push`, `tick`, `hydrate`, `nextDueAt`), and `Oracle`, the replay gate a compiled goal must pass. `GoalRules.nextDueAt` reports when the clock next matters, `every` fires once per period even when every evaluation falls on a boundary, and `about` also matches an entity's label. plugin-agent's in-memory brain now evaluates subscriptions with the `Evaluator`: a `Trigger` carries `rules`, compiled from the goal's text by `WatchFacts` (and gated by the oracle) or translated from its `FactPattern` by `Trigger.toRules`, replacing `Trigger.matchesPattern` and `BrainService.matchEvent`. `BrainService` events carry the wake's label and facts, and the service gains `tick` and `nextDueAt`; `TriggerOperation.RunDue` runs due watches. Facts name people by their identity DID — the speaker, and a known person as subject or object — so rules match a person exactly.
