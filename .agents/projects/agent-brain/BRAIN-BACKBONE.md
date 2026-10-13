# `@dxos/brain` as the brain service's backbone — plan

Status: implemented (2026-10-07) in dxos#13786 and its EDGE counterpart; see DECISIONS.md for what changed on the way. Builds on `packages/plugins/plugin-agent/docs/BRAIN.md` (draft 2) and the
push + subscribe `BrainService` (dxos#13777, edge#1245).

## Goal

Both brain services — the in-process `BrainMemory` and EDGE's `BrainObject` — evaluate subscriptions with
`@dxos/brain`'s `GoalRules` instead of `Trigger.matchesPattern`, so one rule engine decides when an agent
wakes, wherever the agent runs. Behaviour is unchanged until goals are compiled from text (phase 5).

## Where things stand

| Piece                   | Today                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `BrainService` contract | `push` (store facts, queue an event per matching subscription), `query`, `subscribe`, `take`, `ack`, `wake`    |
| Matching                | `Trigger.matchesPattern` over a `FactPattern`; in plugin-agent locally, in operation-service on EDGE           |
| Outboxes                | One per subscription; `BrainMemory` in memory, `BrainObject` in SQLite with acked rows kept as tombstones      |
| `@dxos/datalog`         | Incremental stratified Datalog with provenance; synchronous, no dependencies, tested in workerd                |
| `@dxos/brain`           | `Encoding`, `Vocabulary`, `Builtins`, `Compiler`, `CompilePrompt`, `GoalRules`; used only by `stories-brain`   |
| Identity in facts       | Speakers and entities are name slugs (`normalizeEntityId("Dima")` → `dima`), though messages carry sender DIDs |

The fit is direct: a subscription is a goal's rules, an event is a `GoalRules` wake (label, cause, the facts
behind it), and the outbox, `take`/`ack` and tombstones stay as they are. `@dxos/brain` depends only on
`@dxos/datalog`, `@dxos/pipeline-rdf`, `@dxos/errors` and `@dxos/util`, so compute-service can depend on it
directly and `BrainObject` can do its own matching — which removes the operation-service matching and two
of the three RPCs a push makes today.

## Decisions

1. **Entities are identified by id; in Composer a person's id is their identity DID.** A fact's speaker
   (`attribution.agent`) is the sender's `identityDid` (a private chat's owner DID when the message has no
   sender; the agent's own DID for its replies), and a subject or object that names a known person is
   `{ kind: 'entity', entity: 'did:…', label: 'Dima' }`. Names resolve to DIDs in code after extraction,
   against the space's members, contacts and chat participants; an unresolved name keeps its slug.
   Subscriptions resolve names the same way when they are set, so rules match exactly
   (`speaker(F, "did:…")`) and no fuzzy name matching is needed in the engine. `concerns(F, Entity)`
   already works over entity ids.
2. **The evaluator is shared and synchronous, storage stays with each host.** `@dxos/brain` gains an
   `Evaluator` holding one `GoalRules` per subscription; hosts keep their own fact store and outbox.
3. **Subscriptions carry compiled rules.** A `Trigger` gains `rules` (a Datalog program, checked by
   `Compiler.compile` on `subscribe`). Until goals are compiled from text, `Trigger.toRules` translates a
   `FactPattern` deterministically.
4. **Rebuild by replay, wakes suppressed.** A host that restarts (a hibernated Durable Object) loads its
   subscriptions and recent facts into the evaluator without emitting events, then evaluates the present.
   Event ids are stable, so anything re-derived is absorbed by the tombstones.
5. **Existing slug-keyed facts are re-extracted, not migrated.** The index is derived; clearing a chat's
   pass markers re-reads it, as the `FactEntry` 0.2.0 change already did.

## Phases

Each phase is one PR and leaves `main` working. Phases 1–3 keep behaviour except phase 2's intended `text` change: a stemmed keyword match (`about`) replaces the substring match, which the equivalence table records.

### 1. Identity: DIDs for speakers and entities (dxos, plugin-agent)

- `readSource` attributes each fact to its sender's DID, and maps subject and object labels that match a
  known person to that person's DID (a roster built from space members, contacts and chat participants).
- `watch-facts` resolves a named person to a DID when it subscribes.
- The agent's quiet speaker is its DID.
- Tests: `read-source.test.ts` (sender DID, owner DID in a private chat, unresolved name keeps its slug),
  `triggers.test.ts`, `brain.test.ts` (E2E 1 still wakes Alice when Bob speaks).

### 2. The evaluator (dxos, `@dxos/brain` + plugin-agent)

- `@dxos/brain` `Evaluator`: `add(subscription)`, `remove(id)`, `push(facts, { at, quiet })` → events,
  `tick(at)` → events, `hydrate(subscriptions, facts, at)` (no events).
  - Event id: subscription + wake label + sorted fact ids; a time-driven wake (no facts) uses the
    evaluation time.
  - Quiet speakers stay outside the rules: their facts are stored and evaluated, but a wake resting only
    on quiet facts is dropped.
  - Tests: the eight `@dxos/brain/testing` scenarios through the evaluator; hydrate-then-push emits only
    new events.
- plugin-agent: `Trigger.rules` and `Trigger.toRules(pattern)`:

  | `FactPattern` field                     | Datalog                                 |
  | --------------------------------------- | --------------------------------------- |
  | `speaker`                               | `speaker(F, "did:…")`                   |
  | `subject`                               | `fact(F, "did:…", _, _)`                |
  | `about`, `text`                         | `about(F, "…")` (stemmed keyword match) |
  | `force`, `polarity`                     | `force(F, …)`, `polarity(F, …)`         |
  | `after`, `before`, subscription created | `saidAt(F, T), T >= "…"` / `T < "…"`    |

- `BrainMemory` evaluates with the `Evaluator`; `BrainService.matchEvent` and `Trigger.matchesPattern` go.
- Tests: an equivalence table (old matcher vs translated rules over the same facts, differences listed:
  `text` becomes a keyword match); `BrainMemory.test.ts`, `triggers.test.ts`, `brain.test.ts` unchanged.

### 3. EDGE on the evaluator (dxos pin bump + edge)

- compute-service depends on `@dxos/brain` and `@dxos/datalog` (dxos catalog).
- `BrainObject` hydrates its evaluator once, behind a memoized init promise (edge's DO rule), from SQLite:
  subscriptions plus at most `GoalRules.MAX_FACTS` recent facts.
- `push` is one RPC: store facts, evaluate, enqueue — one transaction. The `enqueue` RPC and
  operation-service's matching are removed; `rpcMethods` updated.
- `BrainObject` stores each subscription's `rules`; `subscribe` rejects rules that do not compile.
- Tests: compute-service brain tests (hydrate after a fresh instance; re-pushed facts queue nothing),
  `brain.edge.test.ts` 3/3 against `wrangler dev`, edge agent replay tests.

### 4. Time drivers (dxos + edge)

- `@dxos/brain`: `GoalRules.nextDueAt()` from the time built-ins (`elapsed`, `every`, `due`), so a host can
  schedule exactly; until then, the compiled `drivers` (`time`) set a coarse cadence.
- EDGE: a Durable Object alarm calls `tick`. The Durable Object never acts, so the alarm invokes a drain
  operation in operation-service that runs the same take → compose → send → ack loop as `pushFacts`.
- Local: an Effect schedule ticks `BrainMemory` and drains the same way.
- Tests: scenario 3's two-day follow-up and scenario 6's daily cadence on a test clock, local and EDGE.

### 5. Goals compiled from text (dxos, plugin-agent)

- `WatchFacts` (and a goal-setting operation) compiles the goal text with `CompilePrompt` on a
  Sonnet-class model, checks it with `Compiler`, and replays test facts from an independent oracle call
  (never shown the rules) before the subscription goes active — BRAIN.md's replay gate.
- `FactPattern` remains only as the phase-2 translation for existing subscriptions.
- Tests: memoized compile + oracle conversations for the eight scenarios; the `WRONG` compilations are
  rejected by replay.

## Risks

1. **Memory and cold start.** Each goal keeps its own engine and up to 10,000 facts; a rebuild costs about
   0.02 ms per fact per goal (20 goals × 10,000 facts ≈ 4 s on a cold Durable Object). Acceptable at
   current scale; the follow-up is a shared engine across goals or a persisted evaluator snapshot (BRAIN.md
   open question 4).
2. **Roster quality.** DID resolution is only as good as the roster; a person mentioned by a nickname
   keeps a slug and is missed by a DID-keyed rule. Entity aliases (ONTOLOGY.md) are the fix.
3. **Re-extraction cost.** Re-reading chats for DID attribution spends one extraction call per pass.
4. **Ownership.** Phases 2 and 4 add API to `@dxos/brain` and `@dxos/datalog`; the `Evaluator` and
   `nextDueAt` shapes need Rich's agreement before they are built.

## Open questions

1. Should the `Evaluator` live in `@dxos/brain` (proposed) or in plugin-agent?
2. Is a goal's history (judgments, relays) part of this work, or does it wait for M2's goal feeds?
3. Should facts already extracted with slugs be re-extracted eagerly (on upgrade) or lazily (on next read)?
