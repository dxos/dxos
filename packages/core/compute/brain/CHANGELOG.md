# @dxos/brain

## 0.15.0

### Patch Changes

- @dxos/pipeline-rdf@0.15.0
  - @dxos/datalog@0.15.0
  - @dxos/errors@0.15.0
  - @dxos/util@0.15.0

## 0.14.0

### Minor Changes

- 62abfd7: An agent gains a "Brain store" companion: a read-only debug view of its brain as held, showing the raw facts with full attribution, each watch's rules, the facts encoded as the Datalog relations those rules match, and each watch's pending events with when the clock next matters. It reads the brain through the new `TriggerOperation.InspectBrain`, and `@dxos/brain` adds `Encoding.format` and `Encoding.formatEntry` to print encoded facts in the rules dialect.
- 37b0196: `@dxos/brain` gains `Evaluator`, which evaluates every subscription of one brain with `GoalRules` over a shared fact stream (`push`, `tick`, `hydrate`, `nextDueAt`), and `Oracle`, the replay gate a compiled goal must pass. `GoalRules.nextDueAt` reports when the clock next matters, `every` fires once per period even when every evaluation falls on a boundary, and `about` also matches an entity's label. plugin-agent's in-memory brain now evaluates subscriptions with the `Evaluator`: a `Trigger` carries `rules`, compiled from the goal's text by `WatchFacts` (gated by the oracle, naming the space's members by DID) or translated from its `FactPattern` by `Trigger.toRules`, replacing `Trigger.matchesPattern` and `BrainService.matchEvent`. `BrainService` events carry the wake's label and facts, and the service gains `tick` and `nextDueAt`; `TriggerOperation.RunDue` runs due watches.

### Patch Changes

- @dxos/pipeline-rdf@0.14.0
  - @dxos/datalog@0.14.0
  - @dxos/errors@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [cb1e218]
- Updated dependencies [fc34fb8]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
  - @dxos/util@0.13.0
  - @dxos/datalog@0.13.0
  - @dxos/pipeline-rdf@0.13.0
  - @dxos/errors@0.13.0
