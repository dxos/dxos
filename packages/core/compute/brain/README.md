# @dxos/brain

The agent brain's rule layer: pipeline-rdf facts encoded as Datalog relations, a canonical predicate
vocabulary, the goal built-ins, and an incremental evaluator that decides when a goal wakes. Rules
run on [`@dxos/datalog`](../../../common/datalog), so the same code runs in plugin-agent and in the
EDGE Durable Object. Design: `packages/plugins/plugin-agent/docs/BRAIN.md`.

## Modules

- **`Encoding`** — encodes a pipeline-rdf `RDF.Fact` as `fact(F, S, P, O)` plus metadata relations keyed by `F` (`speaker`, `force`,
  `polarity`, `mood`, `factuality`, `saidAt`, `source`, `surface`, …) and the goal relations
  (`subgoal`, `status`, `action`, `actionArg`).
- **`Vocabulary`** — canonical predicates and their surface synonyms. Extraction stores the canonical
  predicate and keeps the original as `surface(F, …)`.
- **`Builtins`** — `about(F, Text)` and `concerns(F, Entity)` (both may bind `F`, behind `TextIndex` /
  `EntityIndex` so a semantic index can replace the keyword one), `elapsed`, `every`, `due`,
  `weekday` and `hour` against an injected clock.
- **`Compiler`** — parses goal rules, expands shorthand for canonical predicates
  (`helps_with(dima, X)` → `fact(_, dima, helps_with, X)`; `helps_with(F, dima, X)` exposes the id),
  rejects synonyms and misspellings, checks goal heads, then runs the engine's static checks.
- **`GoalRules`** — evaluates one goal over a fact stream and clock ticks. It wakes when a wake rule
  gains a new binding, when `achieved(goal)` first holds, and when a sub-goal changes status, and
  reports the fact ids behind each wake. `checkAction` evaluates `blocks` rules for a proposed action.

```ts
const rules = GoalRules.make({ source, createdAt: Date.now() });
const { wakes, achieved } = rules.update({ at: Date.now(), facts: [fact] });
```

## Testing

`@dxos/brain/testing` holds the eight BRAIN.md example scenarios, their reference compilations and
plausible wrong ones, and `simulate`, which replays a scenario against compiled rules — the replay gate
a compilation must pass before its goal goes active.
