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

A goal is a **directive** — an order given to the agent. It defines a future outcome or state; it may
or may not say how to achieve it, and it may define conditions. It is distinct from a `@dxos/types`
`Task`, which is a concrete action with a history (see "Goals, sub-goals and tasks").

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
3. **Compiled rules — never written by users.** When a goal is created or edited, the agent compiles
   its text into a separate rule DSL over the fact tuples (Datalog-style): the outcome or state the
   goal wants (`achieved` / `holds`), its conditions, and the wake rules that decide when to judge it.
   The Durable Object evaluates them without a model. The compiled rules sit beside the text so they can be inspected. The text is the
   authority: when the rules and the text disagree, the agent recompiles; it never rewrites the text
   to fit the rules.

**Rule language: Datalog for goals, SPARQL for retrieval.** Goals compile to Datalog from M1: rules
build on each other (`wake`, `achieved` and `holds` reference one another), stratified negation gives
`not achieved(goal)` a clear meaning, recursion covers relations like "part of" and "blocked by", and
semi-naive evaluation re-derives only what a new fact affects, which suits a Durable Object following
feeds. The fact tuples map directly to predicates (`fact(Id, S, P, O)`, `speaker(Id, dima)`,
`force(Id, commissive)`). Built-ins supply what plain Datalog lacks: time (`elapsed`), text and
semantic matching (`about`), and counting. SPARQL — already shipped in pipeline-rdf — stays the tool
for judgment-time retrieval ("everything Dima said about the plugin this week"), where it is strong.
The cost is owning a dialect and an engine; the engine can stay small because rules come from the
compiler, not from people.

Goal 3 below, compiled (Datalog notation, for readability):

```prolog
wake(reply)    :- fact(dima, P, O), force(commissive), about(O, "agent plugin").
wake(refusal)  :- fact(dima, P, O), force(commissive), polarity(negative), about(O, "agent plugin").
wake(followup) :- elapsed(goal, 2d), not achieved(goal).
achieved(goal) :- fact(dima, works_on, "agent plugin"), force(commissive), polarity(positive).
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

### Where judgment runs

The Durable Object never acts on its own; acting needs the agent's skills, channel backends,
`composeUpdate` and the pre-action constraint check, which live in agent sessions. Where a goal is
judged depends on how long it lives:

- **Session goals are judged in a private thread within the current session's feed.** The thread is
  a side channel of the session's feed that the conversation view does not show, so background
  reasoning never interleaves with what the user is doing, yet it has the session's full context. It
  ends with the session.
- **Durable goals are judged in the brain's own background sessions,** which the Durable Object
  maintains and which represent its background thinking. A durable goal outlives the session that
  created it, may be relevant to parallel or later sessions, and assimilates what they learn: their
  facts reach it through the feeds whatever session produced them. When it acts, the agent service
  routes the result to the right place — the user's current session, or their channel.
- **One background session per user, with one private thread per durable goal** — provided private
  threads can be implemented effectively (see open questions). A user's goals see each other's threads,
  so their conflicts and priorities are weighed together ("taxes" outranks "learn French" this week),
  while different users' goals are separated by construction rather than by an audience rule. Goals
  that belong to no single user — the agent's own, or a team's — run in the agent's own background
  session, under the same audience rule as any shared conversation.
- **A session goal can be promoted to a durable one** ("keep watching this after we're done"); its
  private thread's history moves with it into the goal's feed.

### Goals, sub-goals and tasks

**Goals are directives, and hierarchical.** A goal's steps are sub-goals, parented to it in the ECHO
parent tree, each with its own text, compiled rules, status, situation and feed. "Complete my taxes"
is judged into "gather the W-2s", "find last year's return" and "book the accountant". The machinery
is optional per goal, so a sub-goal costs nothing until judgment gives it drivers ("book the
accountant" gains a follow-up rule when the accountant does not reply). A sub-goal's change of status
is a fact its parent's rules can match; closing a goal closes its open sub-goals.

**Tasks are concrete, and a record of work.** A `@dxos/types` `Task` is a detailed action with a
history, assignee and status, and once done it is the record that the work happened. It is not
conditional and has none of a goal's kinds. Earlier drafts conflated the two; they are separate:

- A goal (or sub-goal) **creates a `Task`** only when the step is substantive enough to warrant one:
  long-lived, assignable to a person, or worth keeping as a record of work. "Book the accountant" may
  become a `Task` assigned to the user; "check Dima's reply" never does.
- The `Task` links back to the goal that created it, and its completion is a fact the goal's rules
  match. The task carries the work; the goal carries the intent.
- plugin-agent's current `Goal` type becomes this directive; tasks stay as they are.

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

## Implementation

Milestones, each ending in a demo that can be watched.

| #   | Milestone                   | Delivers                                                                                                                                                                                                                                                                                | Demo                                                                                                                                        |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Private threads             | A session feed carries threads the conversation view hides; agent-runtime runs a turn inside a thread with the session's context. Decides per-user vs per-agent background sessions.                                                                                                    | A chat with a hidden thread the agent reasons in; the thread shows only in a debug view.                                                    |
| M1  | Facts and goals, in-process | `readSource` writes one tuple per feed item; hierarchical `Goal` objects (status, priority, situation, drivers, wake rules) with their own feeds; the in-process brain: a Datalog engine (adopted or written) evaluating compiled goal rules, judgment in the session's private thread. | AgentPlayground: "keep me informed" and "get Dima to help" (refusal, then commitment) in one runtime; goals and sub-goals in the Goals tab. |
| M2  | Brain on EDGE               | A Durable Object per agent follows the fact feeds, rebuilds its index, evaluates wake rules, schedules time drivers with alarms and runs per-user background sessions; the agent service routes results to sessions and channels.                                                       | Josiah sets a watch on Discord; Dima's update in Composer reaches him; a follow-up fires after a restart (shortened timeout).               |
| M3  | Planning and constraints    | Judgment decomposes goals into sub-goals; action drivers (a hook before every action) enforce constraints; a session goal can be promoted to a durable one.                                                                                                                             | "Complete my taxes" grows sub-goals and reminders; "never book meetings on Fridays" rewrites a proposed Friday meeting.                     |
| M4  | Pattern library and evals   | The goal-pattern skill with worked examples; eval personas scoring the eight example goals; cost controls (batching, judgment limits).                                                                                                                                                  | An eval report across the example goals, with judgment-call counts.                                                                         |

## Open questions

1. Private threads: whether a session feed can carry threads the conversation view hides, cheaply enough for one per goal; this decides per-user background sessions (otherwise one per agent).
2. Whether wake rules can be compiled reliably from text, and how a miscompiled rule is noticed.
3. Goal scope: one user, a group, or the agent itself ("keep the team's status page current").
4. Cost controls: limits on judgment calls per goal per window, and batching facts per evaluation.
