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

## In-memory store

An amorphous fact store, its own Datalog reasoning engine and outbox-backed event subscriptions — the
deterministic, non-persistent local stand-in for plugin-agent's `BrainService`.

### Modules

| Namespace | What it holds                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `Fact`    | The fact tuple (a flattening of pipeline-rdf's `Fact`), push input, `Pattern` and its matcher.         |
| `Rule`    | The Datalog AST, `parse` / `parseQuery`, `format`, and the rule errors.                                  |
| `Event`   | Events (`asserted`, `retracted`, `derived`, `underived`, `violated`, `resolved`), selectors, deliveries. |
| `Brain`   | The `Brain` service (`Context.Service`), `make`, `layer`, `Proof`, `supportingFacts`, and its errors.   |

### Service

```ts
const brain = yield* Brain.Brain; // provided by Brain.layer({ maxDepth })

// Knowledge base.
yield* brain.push(facts, { origin, cause }); // idempotent by id; ConflictError on a changed re-push
yield* brain.retract(ids);
yield* brain.query({ speaker: 'dima', about: 'agent plugin' });
yield* brain.ask('wake(G, R), not achieved(G)');
yield* brain.explain({ predicate: 'achieved', args: ['g3'] }); // Option<Proof>

// Rules.
yield* brain.addRules({ id: 'goal3', rules: '...', onViolation: 'reject' });
yield* brain.removeRules('goal3');
yield* brain.tick(); // re-reads Clock: expires facts, re-evaluates rules that read time

// Event base: one outbox per registration.
yield* brain.register('judge');
const subscription = yield* brain.subscribe('judge', { selector: { _tag: 'atoms', predicate: 'wake' } });
const deliveries = yield* brain.take('judge', { max: 25 }); // at-least-once; redelivered until acked
yield* brain.ack('judge', deliveries.map(({ id }) => id));
yield* brain.unsubscribe('judge', subscription); // or unsubscribe('judge') to drop the outbox
```

### Rules

```prolog
% Rules, ground facts, and constraints (`! name :- body.` or `:- body.`).
goal(g3).
wake(G, reply, F) :- goal(G), fact(F, _, _, _), speaker(F, dima), force(F, commissive), about(F, "agent plugin").
wake(G, followup, T) :- awaiting_since(G, T), elapsed(T, 2d), not achieved(G).
replies(X, count(F)) :- fact(F, X, replied, _).
! contradiction :- fact(A, S, P, O), polarity(A, "+"), fact(B, S, P, O), polarity(B, "-").
```

- Every active fact projects into `fact(Id, S, P, O)`, `polarity/2`, `force/2`, `speaker/2`, `source/2`,
  `said_at/2` (epoch ms), `confidence/2` and `factuality/2`, keyed by the fact id as BRAIN.md describes.
- Built-ins filter bound values: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `about(F, Words)` and
  `elapsed(Time, Duration)`. Durations read as `2d`, `90m`, `-14d`.
- Negation and `count` are stratified; a program that recurses through either is refused.
- Pure additions that no negation, aggregate or clock reading can see are evaluated semi-naively from the new
  tuples only; anything that can withdraw a conclusion re-derives the model, and the diff becomes the events.
- Each derived tuple keeps its first derivation (rule and premises), so `explain` returns a proof down to facts.
- A `reject` constraint refuses the push that would violate it; a `flag` constraint emits `violated`/`resolved`.

### Loop guards

- A registration's own pushes (`origin`) are not delivered back to it unless a subscription sets `includeOwn`.
- A push that names its `cause` events has their depth plus one; past `maxDepth` it fails with `LoopError`.
- A re-push of known content changes nothing and emits nothing, so an echo ends.
- An outbox holds at most `maxOutbox` deliveries; overflow is dropped and counted in `status(registration)`.

### Backing plugin-agent's BrainService

`BrainService` (plugin-agent `src/types/BrainService.ts`) maps onto this service without loss:

| BrainService                      | @dxos/brain                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `addFacts(agent, facts)`          | `push(facts.map(toInput))` on that agent's brain; pipeline-rdf `Fact` flattens to `Fact.Input` |
| `queryFacts(agent, FactQuery)`    | `query(pattern)`; `Fact.Pattern` is a superset of `FactQuery`                                |
| `putTrigger` / `removeTrigger`    | `register(trigger.id)` + `subscribe` with a `facts` selector built from the `FactPattern`   |
| one-time vs `ongoing` trigger     | `unsubscribe(id)` after the first delivery, or keep the registration                         |
| `wake(chat, prompt)`              | the consumer: `take` a registration's deliveries, wake the chat, then `ack`                  |
| BRAIN.md goals                    | a ruleset per goal compiled from its text, subscribed by `atoms` on `wake`/`achieved`         |

One `Brain` instance per agent keeps BrainService's per-agent keying; the EDGE Durable Object would hold the same
state in SQLite and drive `tick` from alarms.
