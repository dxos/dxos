# Agent Brain — design

Status: draft 1 (2026-10-06), in discussion. Builds on plugin-agent's
[ONTOLOGY.md](../../../packages/plugins/plugin-agent/docs/ONTOLOGY.md) (draft 3) and
[DESIGN.md](../../../packages/plugins/plugin-agent/docs/DESIGN.md), which describe the agent as built in
PR #13590.

The brain is what an agent knows (facts) and what it is trying to achieve (goals), and the machinery
that re-evaluates the second whenever the first changes.

## Decisions

### 1. One brain per agent, authoritative on EDGE

Each agent has one brain, hosted on EDGE as a Durable Object. Every runtime that runs the agent's
sessions — the browser, EDGE workers, a CLI — is a client of it. This closes the gap in the current
build, where watches live in one runtime's memory: a watch set from a chat in the browser cannot see
turns of a chat served on EDGE, and every watch is lost on restart. The Durable Object's alarms give
time-driven evaluation a durable home.

A local stand-in with the same interface runs in-process for tests, stories and offline work.

### 2. Facts live in feeds; the brain's index is derived

ECHO feeds are the record of what the agent believes. The Durable Object follows them and keeps a
derived index it can rebuild from scratch at any time. People can read, correct and delete facts in
Composer, and any runtime can append them, including offline. The cost is that evaluation lags an
append by roughly one sync round.

### 3. One feed item per fact, one feed per source

Each source the agent reads (a chat, a thread, a document, a web page) has its own fact feed, keyed by
the source as today (`org.dxos.agent.annotations` foreign key). Each feed item is a single RDF tuple
rather than a batch:

```ts
FactTuple {
  subject: Term;              // entity IRI resolving to an ECHO object, or a label
  predicate: string;          // open vocabulary
  object: Term;               // entity, label or literal
  validFrom?: string;
  validTo?: string;           // a status's horizon; expired facts are filtered, never deleted
  polarity: 'positive' | 'negative';
  confidence: number;
  force?: 'assertive' | 'directive' | 'commissive' | 'expressive';
  quote?: string;
  speaker?: string;           // DXN of the speaker
  source: string;             // DXN of the message (or URL)
  saidAt: string;             // when it was said
  recordedAt: string;         // when it was extracted
  pass: string;               // extraction pass id, so a pass's facts can be grouped or replayed
  supersedes?: string;        // the tuple a correction replaces
}
```

Corrections and retractions are further tuples (`supersedes`, negative polarity); the feed is
append-only. The tuple keeps pipeline-rdf's fields so its extraction stages and SPARQL engine still
apply.

## Goals

Goals are the centre of the design. The concept is distinct from ECHO's existing `Trigger` (a
scheduled or event-bound function invocation): a goal is not wired to an event, it is re-evaluated
against everything the agent knows.

### What a goal is

- **Plain text.** A user states a goal in natural language and it evolves through discussion with the
  agent. A DSL for more precise goals may come later; v1 assumes text.
- **Owned by actors.** A goal belongs to a user and an agent. The agent can enumerate a user's goals
  ("what are you doing for me?"), and the user can inspect, reprioritize, edit and cancel them.
- **Long-running.** A goal holds until it is achieved or cancelled. Some last only the session
  ("help me draft this reply"); others last months ("learn French").
- **Prioritized.** A goal may carry a priority, which orders the agent's attention when goals compete.
- **Like a system prompt, but structured.** Goals act as standing instructions, but as separate,
  addressable objects with an owner, status and history rather than one block of text.
- **Outcome or condition.**
  - An **outcome** is a future state: "complete my taxes", "learn French", "get Dima to help with the
    agent plugin". It is achieved once and then closes.
  - A **condition** holds continuously: "keep my inbox empty", "keep me informed about X". It is
    never achieved; it is maintained.
- **Carries instructions.** A goal may include instructions — a prompt — for how to act on it
  ("archive newsletters, flag anything from investors"). The user may write them, or the agent may
  propose them in discussion and the user confirms.
- **The agent decides actionability.** Whether a goal calls for action now, given the current
  circumstances, is the agent's judgment, not a compiled rule.

### Evaluation

Goals are evaluated whenever the facts change. Evaluating every goal with a model call on every fact
does not scale, so evaluation is two-stage:

1. **Relevance (cheap, in the Durable Object).** When facts are appended, find the goals they could
   bear on. The agent derives each goal's _interests_ when the goal is created or edited — the
   entities, predicates and topics it depends on — and stores them with the goal. A new fact is
   matched against interests by entity overlap and text/embedding similarity. Most facts touch no
   goal.
2. **Judgment (model call).** For each relevant goal, the agent is given the goal, its instructions,
   the new facts, the related facts and the source context, and decides: nothing to do; act (and
   how); the goal is achieved; or the goal needs the user (ambiguous, blocked, conflicting).

Not every goal is driven by facts:

- **Time-driven** goals have deadlines or a cadence ("taxes by April 15", "practise French daily"),
  scheduled with Durable Object alarms.
- **Action-driven** goals are constraints ("never book meetings on Fridays", "don't DM me after
  6pm"). They are checked when the agent is about to act, not when facts arrive.

An action the agent takes is itself recorded as facts, so goals can depend on each other ("keep me
informed" sees the relay that "get Dima to help" sent).

## Open questions

1. What a goal's interests are concretely (entities, predicates, embeddings), and when they are
   re-derived.
2. How achievement and progress are recorded: a status on the goal, facts about the goal, or both.
3. Where goal evaluation runs — in the Durable Object directly, or by waking an agent session.
4. How a goal relates to tasks (the agent's planned steps) and whether tasks are derived from goals.
5. Goal scope: one user, a group, or the agent itself ("keep the team's status page current").
6. Cost controls: limits on judgment calls per goal per window, and batching facts per evaluation.
