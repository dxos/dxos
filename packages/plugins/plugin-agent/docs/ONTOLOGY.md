# Agent — memory ontology

Status: draft 3 (2026-10-03), for review. Decides what an agent remembers, how it relates, and what
context each item carries. [MEMORY.md](./MEMORY.md) covers how memories are made and recalled; this
doc covers what they are.

## Principle

The agent's knowledge has five layers, from raw to curated:

| Layer                  | Holds                                                      | Form                                                      |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| 1. Transcripts         | Every thread and chat, verbatim — the full-fidelity record | The chat's feed; never edited                             |
| 2. Annotations         | RDF facts read from each source                            | A fact feed per source (§2)                               |
| 3. Curated entities    | Profiles of people, organizations and projects             | Objects in the home space, ref'ing canonical objects (§3) |
| 4. Per-user directives | Each user's instructions and preferences                   | Objects in the home space, keyed by user (§4)             |
| 5. Intent              | Goals shared with users, tasks the agent owes, triggers    | Goal/Task objects; triggers in process memory (§5)        |

Per-transcript state — the current mode — is an annotation on the chat (§6).

Everything persistent lives in the agent's **home space** (DESIGN.md goal 1), so people can see,
correct and delete it; it references objects in other spaces rather than copying them.

## 1. Entities

| Type           | Status | Notes                                                                                                                         |
| -------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `Person`       | exists | One per human; `identities` carries every handle (Discord id, DID, email) so one person is recognised everywhere.             |
| `Organization` | exists | A team, community or company. Membership: `memberOf` (`Person → Organization`, with a role).                                  |
| `Project`      | exists | Canonical in its workspace; the agent references it.                                                                          |
| `Concept`      | new    | A topic, product or idea the agent keeps meeting (`name`, `aliases`, `description`); promoted to a real type when one exists. |
| Any object     | exists | Documents, sketches, tasks: facts and notes point at them by space-qualified ref, wherever they live.                         |

Fact subjects and objects are entity IRIs that resolve to these objects (pipeline-rdf `Entity.ref`), so
the RDF graph and ECHO share identity.

## 2. Annotations — facts per source

**Decision:** facts are not ECHO objects. A fact is one low-level proposition and an agent records
hundreds a day; an object per fact costs a document each and buries the objects people read. Each
**source** the agent reads — a chat transcript, a document, or a web page — instead gets an
**annotation feed** (the mailbox-enrichment pattern: derived data on a second feed, never on the
immutable source). The source remains the full-fidelity record.

**`readSource` is the one operation that writes annotations** (`org.dxos.operation.agent.readSource`,
input `{ agent, source?, url?, text? }`). It reads the source's text — a chat renders as
`[time] speaker: text` lines, a markdown transcript keeps its `**Speaker:**` paragraphs — runs
pipeline-rdf's extraction (chunked) as a direct model call with no chat or session, attributes each
fact to the utterance its quote comes from (speaker, message DXN, time), and appends one entry to the
source's feed. The feed is a `Feed` parented to the agent in its home space, keyed by the foreign key
`{ source: 'org.dxos.agent.annotations', id: <source object id or URL> }` (also its `kind`), so EDGE
finds it with `Filter.foreignKeys`/`Filter.childOf` and no hierarchy traversal. The conversation skill
calls it when asked to read a document or link; the playground calls it on its seed transcript.

An entry is one extraction pass and carries a batch of facts in the `@dxos/pipeline-rdf` `Fact` shape,
so its extraction stages and SPARQL engine are reused:

```ts
FactEntry {                     // org.dxos.type.agent.factEntry 0.1.0; one feed item per extraction pass
  source?: Ref<Obj>;            // the document or chat read (absent for a web page)
  url?: string;                 // the web page read
  name?: string;                // the source's display name
  recordedAt: string;           // when the agent extracted it
  extractor: { id: string; model: string; version: string };
  facts: Fact[];                // subject/object stored as one { entity?, label?, literal? } struct:
}                               // ECHO only stores discriminated unions, and pipeline-rdf's Term is not

Fact {                          // pipeline-rdf
  assertion: { subject, predicate, object, validFrom?, validTo?, quote? };
  factuality: { value, polarity, confidence, nature? };     // FactBank: CT+/PR+/PS+/…
  illocution?: { force, mood?, addressee? };                 // assertive | directive | commissive | expressive
  attribution: {
    source: string;             // DXN of the message (required)
    generatedAtTime: string;    // when it was said (required)
    agent?: string;             // the speaker's DXN
    span?: { start, end };      // where in the message text
  };
}
```

- **Every fact records timestamp, speaker and source.** pipeline-rdf requires `source` and
  `generatedAtTime`; `readSource` sets `agent` (the speaker, as a pipeline-rdf entity id such as
  `dima`) whenever the fact's quote locates the utterance. Sources are DXN strings (or a URL) in RDF;
  the UI resolves them to ECHO refs to jump to the message. Later: the speaker's DXN once the sender
  is a resolved `Person`.
- **Append-only.** A correction is a new fact that supersedes (`wasDerivedFrom`); a retraction is a
  fact with negative polarity. The feed is an audit trail of what the agent believed and when.
- **Expiry is a query concern.** `validTo` bounds a status ("on the Discord bot this week"); expired
  facts are filtered at recall, never deleted.
- **Predicates are open.** "commits", "owns", "is blocked by" — the RDF vocabulary grows freely.
  Anything that must behave reliably (triggers, rules) matches on `illocution.force` and
  `factuality.polarity`, which the extractor always fills, not on the predicate string.
- **Recall** (v1, as built) reads every annotation feed in the space and filters in JS: by subject
  (the entity's names as pipeline-rdf entity ids, matched against subject, object and speaker), by
  text, and dropping facts past `validTo`; facts come back beside memories with their source and time.
  Later: load the feeds in scope into pipeline-rdf's in-memory store and query with SPARQL; EDGE's FTS5
  index over feed items serves text search. Scope follows the audience rule (same space / Discord
  server by default).

`Memory` (`org.dxos.type.agent.memory`) is retired once the feeds land: `recordMemory` writes facts,
`retrieveMemories` queries them, notes become documents (§3), directives become §4 objects.

## 3. Curated entities

Objects the agent keeps because people read them:

- **Profile** — a markdown document per person, team or project (`ProfileOf` → the canonical object,
  which may live in another space), regenerated from the facts about it.
- **Note** — free-form markdown attached to any object (`HasSubject`); a note is a document, not facts.

The agent never copies a canonical `Person`/`Organization`/`Project` into its home space; when none
exists it creates one there, and links it to a canonical one found later.

## 4. Per-user directives

How the agent must behave, per user (later per group). Typed objects, because tools check them and
users edit them.

```ts
Instruction {                   // "Don't page me after 6pm", "Always cc Priya on hiring"
  user: Ref<Person>;            // whose instruction (later Ref<Organization> for groups)
  statement: string;
  setBy: Ref<Person>;           // only they (or an admin) retract it
  action?: string;              // checkable capability: 'relay' | 'share-status' | 'dm'
  effect?: 'allow' | 'deny' | 'require';
  source?: string;              // DXN of the message that set it
}

Preference {                    // "Keep it short with me", "Prefer DMs"
  user: Ref<Person>;
  statement: string;
  key?: string;                 // when a tool can act on it: 'channel' | 'verbosity' | 'quiet-hours'
  value?: string;
}
```

Checkable instructions (`action` set) are enforced by tools — relay and status sharing consult them;
free-text ones are pinned into the prompt whenever that user is in the conversation. Users can set
their own preferences directly.

## 5. Intent — goals, tasks and triggers

**Goals** are shared context between the agent and a user: the user can inspect, prioritize and
change them. A goal is created **only when the requester wants an outcome**, not for plain delivery.
**Tasks** are what the agent owes — relays, follow-ups, research — in its own `TaskSet`, each under
the goal it serves when there is one.

"Tell Dima to come and work on this" (Rich wants him to commit):

- `Goal` (owner Rich): Dima commits to working on X.
- `Task` (Kai, under the goal): relay Rich's message to Dima.

"Tell Josiah the fix landed" (delivery only): just the relay `Task`.

**Triggers** connect facts to intent: `{ when, then, for }`.

- `when` — a structured fact pattern (speaker, illocution force, polarity, subject, `about`, time
  window), a deadline, or both; compiled to a SPARQL `ASK` over the annotation facts.
- `then` — an operation and its input (send a message, mark a goal achieved, report back).
- `for` — the goal or task it serves; a trigger is dropped when its goal or task closes.

For Rich's request the agent registers:

| `when`                                               | `then`                                   |
| ---------------------------------------------------- | ---------------------------------------- |
| Dima, commissive, positive, about X                  | Mark the goal achieved; report to Rich   |
| Dima, commissive, negative (declines or defers) on X | Send "this is the priority"; report back |
| 2 days elapsed, goal not achieved                    | Follow up with Dima                      |

This is what makes conditional instructions ("if he doesn't agree, tell him it's the priority")
wait for their condition instead of being sent at once.

**v1: triggers are not ECHO objects.** The agent process keeps them in memory and evaluates them **at
the end of each turn, after that turn's facts have been written**. Consequence: triggers do not
survive a process restart (an EDGE agent eviction); deadline triggers in particular need a durable
home before they can be relied on. Promote them to objects once the shape settles.

## 6. Per-transcript state — modes

How the agent is working in one conversation — conversation, note-taker, interviewer, relay; later
transcriber, designer, fact-checker, researcher. A `Mode` names a reusable bundle of skills.

**As built (2026-10-03):** `Mode` (`org.dxos.type.agent.mode` 0.1.0) is `{ name, description?, skills,
records? }`. Every agent owns four built-in modes (parented to it): **Conversation** (default),
**Note-taker** (`org.dxos.skill.agentNotes`), **Interviewer** and **Relay**. Every chat keeps the
base skills bound — conversation, modes (`listModes`, `switchMode`) and relay — so "tell Dima" works in
any mode. `switchMode {chat, mode}` rebinds the mode's skills and records the mode on the chat as the
`org.dxos.agent.chatMode` annotation; the knowledge panel shows it per conversation.

## Classification

| Utterance                                | Becomes                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| "This week I'm on the Discord bot"       | Fact (speaker, assertive, `validTo` +7 days)           |
| "Josiah will redeploy once it lands"     | Fact (commissive by Josiah)                            |
| "Our priority this quarter is the demo"  | `Goal` (quarter) owned by the team                     |
| "Tell Josiah the fix landed"             | Relay `Task`                                           |
| "Tell Dima to come and work on this"     | `Goal` (Dima commits) + relay `Task` + triggers        |
| "If he doesn't agree, say it's priority" | A trigger on the open goal                             |
| "Don't page me after 6pm"                | `Instruction` (deny, `dm` after 18:00) for the speaker |
| "Keep it short with me"                  | `Preference` of the speaker                            |
| "Take notes"                             | Switch this transcript to Note-taker                   |

The classification is measurable: the eval gets personas whose utterances have known outcomes.

## Open questions

1. Profile regeneration: on every fact about the subject (rate-limited), or on a schedule?
2. Is `Preference` worth its own type, or an `Instruction` whose `setBy` equals its `user`?
3. Which `Instruction.action`s are checkable in v1 — `relay`, `share-status`, `dm` — and who may set
   instructions about the agent itself (any member, or only its owner)?
4. Where `Concept` lives long term — plugin-agent, or `@dxos/types` beside `Person`.
5. The trigger pattern's exact fields, and the smallest vocabulary of `then` actions.
6. Durable triggers: when deadlines must survive restarts, do triggers become objects, or are they
   re-derived at startup from open goals and tasks?
