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

1. **Wake (cheap, in the Durable Object).** When facts are appended, the Durable Object evaluates
   each goal's compiled wake rules (below) over the fact index. Most facts wake no goal, and no
   model is called.
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

### Representation

The runtime needs to know only _when_ to wake a goal; that must be cheap and deterministic. What the
goal means and what to do is judgment, which belongs to the model. So a goal is represented in three
layers, each with one job:

1. **Drivers — the only part hardcoded in code.** `fact`, `time` and `action`, because each maps to
   one runtime mechanism: an index subscription, a Durable Object alarm, a hook before every action
   the agent takes. A goal may have several. "Outcome" and "condition" are not types in code — the
   model reads them from the text — so a new kind of goal never needs a code change.
2. **Goal patterns — a document the model reads.** A skill of goal patterns with worked examples (the
   table below) teaches the agent how to read a goal, propose its instructions, decide whether it is
   actionable and recognise achievement. It grows by adding examples, and the evals score against it.
3. **Wake rules — compiled, never written by users.** When a goal is created or edited, the agent
   compiles its text into rules over the fact tuples, which the Durable Object evaluates without a
   model. The compiled rules sit beside the text so they can be inspected. The text is the
   authority: when the rules and the text disagree, the agent recompiles; it never rewrites the text
   to fit the rules.

**v1 rule language: SPARQL `ASK`**, because pipeline-rdf already ships the engine. Time rules
(`elapsed`) and goal state (`not achieved`) are supplied by the Durable Object as bindings rather than
expressed in SPARQL. **Datalog** is the intended successor once SPARQL's limits bite (negation, time,
recursion, model-writability): it is the terminating, set-based subset of Prolog, fits
subject–predicate–object tuples, and can be evaluated incrementally as facts arrive.

Goal 3 below, compiled (Datalog notation, for readability):

```prolog
wake(reply)    :- fact(dima, P, O), force(commissive), about(O, "agent plugin").
wake(refusal)  :- fact(dima, P, O), force(commissive), polarity(negative), about(O, "agent plugin").
wake(followup) :- elapsed(goal, 2d), not achieved(goal).
```

### State

Goal state is split by who reads it:

- **On the goal object — what the runtime and UI read directly.** `status` (`active` | `paused` |
  `achieved` | `cancelled`), priority, drivers, the compiled wake rules, and a **situation**: one or two
  sentences the agent rewrites after each judgment ("Asked Dima Monday; he deferred Tuesday; following
  up Thursday"). The situation is what a user sees when they ask what the agent is doing for them, and
  what the model reads first at the next judgment.
- **In the goal's own fact feed — the history.** A goal is a source like any chat, so its actions and
  judgments are recorded as tuples: `(goal, relayed, <message>)`, `(goal, awaiting, dima)`,
  `(goal, declined-by, dima)`, `(goal, judged, "remind him it's the priority")`. The history is
  append-only and auditable, and other goals' wake rules can match it ("keep me informed" sees the
  relay).

Nothing on the goal is unjustified by its feed, and `not achieved(goal)` stays a field lookup.

Goal 3 over a week:

| When | Event                                                                                     | Status / situation                                   | Goal feed                            |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Mon  | Rich: "get Dima to help me with the agent plugin"; created, compiled, judged actionable   | active / "Asked Dima; waiting"                       | `relayed <msg>`, `awaiting dima`     |
| Tue  | Dima: "busy with the release this week"; `wake(refusal)`; instructions say press priority | active / "Dima deferred; told him it's the priority" | `declined-by dima`, `relayed <msg2>` |
| Thu  | `wake(followup)` alarm after 2 days                                                       | active / "Followed up with Dima"                     | `followed-up dima`                   |
| Thu  | Dima: "OK, I'll start on it"; `wake(reply)`; achieved; Rich's watch sees it               | achieved / "Dima committed Thursday"                 | `achieved`, `committed dima`         |

### Examples

| #   | Goal                                             | Kind                 | Drivers                      | What the agent does                                                    | Hard part                                                 |
| --- | ------------------------------------------------ | -------------------- | ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | "Keep me informed about what Dima is working on" | Condition            | fact                         | Writes an update from the conversation's context                       | Update vs noise; how often to send                        |
| 2   | "Let me know when the release ships"             | Outcome              | fact                         | Tells the user once, then closes the goal                              | Recognising "shipped" across wordings                     |
| 3   | "Get Dima to help me with the agent plugin"      | Outcome              | fact, time (2-day follow-up) | Relays the request; closes on "OK, I'll start"; escalates on a refusal | Acts now and also waits, with a timeout                   |
| 4   | "Keep my inbox empty"                            | Condition            | fact (each new email)        | Triages each email using the goal's instructions                       | Volume: cheap wake rules and batching                     |
| 5   | "Complete my taxes by April 15"                  | Outcome              | time (deadline), fact        | Breaks the goal into tasks, reminds, gathers documents                 | Goal → tasks, and tracking progress                       |
| 6   | "Learn French"                                   | Outcome (open-ended) | time (daily cadence)         | Starts a practice session on schedule                                  | Achievement is fuzzy; the user closes it                  |
| 7   | "Never book meetings on Fridays"                 | Constraint           | action                       | Blocks or rewrites the action                                          | Checked before every action, not on facts                 |
| 8   | "Help me draft this PR description"              | Outcome (session)    | fact (the conversation)      | Normal chat work                                                       | Whether a session goal is a goal or just the task at hand |

## Open questions

1. Whether wake rules can be compiled reliably from text, and how a miscompiled rule is noticed.
2. Where goal evaluation runs — in the Durable Object directly, or by waking an agent session.
3. How a goal relates to tasks (the agent's planned steps) and whether tasks are derived from goals.
4. Goal scope: one user, a group, or the agent itself ("keep the team's status page current").
5. Cost controls: limits on judgment calls per goal per window, and batching facts per evaluation.
