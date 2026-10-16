# Interlocutor — facts and profiles

Companion to [DESIGN.md](./DESIGN.md). [ONTOLOGY.md](./ONTOLOGY.md) specifies the fact itself; this doc
covers how facts are made, read back and summarised.

## Principle

People, teams and goals are ordinary ECHO objects, so they replicate, show up in Composer and can be
corrected by the people they describe. What the agent has learned about them lives in its **brain**:
RDF facts in named graphs (pipeline-rdf), whose subjects and objects name those ECHO objects by their
URIs. A fact the agent read in a conversation and a fact it recorded itself are the same kind of
record, so there is one store to read and nothing to keep in sync.

## The graph

| Node             | Type                                  | Notes                                                                                                                                                     |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Person           | `Person` (@dxos/types)                | One per human. `identities` carries every handle the agent has seen: `discord:<id>`, `did:halo:…`, email. Resolution merges on any shared handle.         |
| Team / group     | `Organization` (@dxos/types)          | A team, a Discord server or a community.                                                                                                                  |
| Goal             | `Goal` (plugin-agent)                 | `{ title, description?, horizon, status, owners: Ref<Person \| Organization>[], parent?: Ref<Goal> }`. Shared when it has several owners or a team owner. |
| Fact             | a named graph in the brain            | One proposition: subject, predicate, and an entity or literal object, with its quote, speaker, source and time (`RDF.Fact`).                              |
| Profile          | `Document` + `ProfileOf` (plugin-crm) | A readable summary of a Person or team, **derived** from its facts and goals; regenerated, never edited as the source of truth.                           |
| Conversation     | `Chat` + `Message`                    | Where facts come from (provenance).                                                                                                                       |
| Any other entity | any ECHO object                       | Projects, documents, places: a fact can be about anything in the space.                                                                                   |

### Fact

- **Structured.** A fact relates its subject by a predicate to an entity or a literal value
  ("Rich prefers daily standups"), not a transcript excerpt. Predicates come from pipeline-rdf's seed
  vocabulary; one outside it is minted in the agent's brain namespace with a one-line definition.
  The seed vocabulary still defines the prose predicates `claim` and `has_note`, only so older graphs
  parse; the agent is never offered them and `recordFacts` refuses them.
- **Stated or inferred.** `origin: 'stated'` (the person said it, factuality `CT+`) or `'inferred'` (the
  agent concluded it, `PR+`), with an optional confidence.
- **Never overwritten.** A correction is a new fact whose `supersedes` lists the ids of the facts it
  replaces. The brain is append-only, so history is kept; superseded, retracted and expired (past
  `validTo`) facts are left out of every read.
- **Provenance.** A fact read from a source carries its speaker, source DXN and time; a fact the agent
  records carries the agent as speaker and the message or chat it came from when given.

### Goal

```ts
horizon: 'now' | 'quarter' | 'year' | 'long-term';
status: 'proposed' | 'confirmed' | 'active' | 'achieved' | 'dropped';
```

The agent may only **propose** goals. A goal becomes `confirmed` when its owner agrees — in an
interview the agent reads it back and asks. Tasks (`Task`) can reference the goal they serve.

## How facts are made

1. **Reading** (`readSource`): every turn of a conversation, and any document or link the agent is
   asked to read, is run through pipeline-rdf's extraction. Each fact is attributed to the utterance
   its quote comes from. Details in [ONTOLOGY.md](./ONTOLOGY.md) §2.
2. **Recording** (`recordFacts`): the agent states facts directly — about the speaker, a team or
   another entity — after resolving names to graph nodes (`resolveEntity`: match by handle, then by
   name; create a `Person` only when nothing matches). The Note-taker mode records every dictated
   point this way. These are pushed as the agent's own words, so they wake no watch.
3. **Reset**: the knowledge panel can wipe an agent's brain (`resetBrain`); single facts are not
   edited in the UI.

## How facts are used (recall)

`retrieveFacts` returns the current facts about a subject, newest first, and the live goals it owns.
It reads the brains of every agent in the space, matches the subject by its own keys widened through
strong identifiers (its Discord account, its email address), and filters by `query`, where every word
must start a word of the fact or its quote. When the query matches nothing, everything about the
subject is returned with `queryMatched: false`. Each fact carries its `id`, which the agent passes as
`supersedes` to correct it.

The skills tell the model when to call it: before answering about someone, before asking an interview
question, before proposing a goal.

## Interviewing as a skill

An interview is a structured conversation whose purpose is to fill the graph. It is a **skill**
(`org.dxos.skill.interview`): instructions plus the fact and goal operations as tools, so any agent
can be given it, in any chat (Composer or a channel thread).

- **Instructions** (the technique): introduce the purpose; ask one open question at a time; reflect
  back what you heard; probe each goal for why it matters, by when, what's in the way and who's
  involved; record as you go; end by reading back the goals and asking the person to confirm or
  correct them; then summarise the profile.
- **Tools** (`org.dxos.operation.agent.*`): `resolveEntity`, `recordFacts`, `suggestGoal`,
  `setGoalStatus`, `retrieveFacts`, `updateProfile`.

## Profiles

`updateProfile` regenerates a subject's profile document from its live goals and its current facts,
grouped by predicate, and links it to the subject with `ProfileOf`. The document is output only: an
edit to it is overwritten on the next regeneration.

## Conversations: isolated threads, shared facts

An agent converses in many places at once — Composer chats and one `Chat` per channel thread — and
each is separate, but its facts are shared.

| Tier            | Scope            | Lives in                                                    | Read by                   |
| --------------- | ---------------- | ----------------------------------------------------------- | ------------------------- |
| Working context | One conversation | That `Chat` and its feed (the model's context window)       | That conversation's turns |
| Facts and goals | The whole agent  | The brain, plus `Person`, `Organization` and `Goal` objects | Every conversation        |

- **Isolation.** A conversation's context holds only its own messages, so threads never bleed into
  each other and run concurrently. The brain is append-only, so concurrent writes do not conflict.
- **Every turn is read.** The end-of-request hook reads the chat's new messages into the brain, so
  what Dima said in one thread is a fact another thread can recall.

## Priorities, status and relay

The agent tracks each person's and group's priorities, can tell other team members what everyone is
working on, and carries messages between them.

| Said                                      | Becomes                                      | Lifespan                        |
| ----------------------------------------- | -------------------------------------------- | ------------------------------- |
| "This week I'm on the Discord bot"        | A fact about the speaker with a `validTo`    | Until `validTo`                 |
| "Our priority this quarter is the demo"   | `Goal`, horizon `quarter`, owner person/team | Until achieved or dropped       |
| "I'm out until Thursday"                  | A fact with a `validTo`                      | Until the stated time           |
| "Remember to tell Josiah about this"      | A **relay** (below)                          | Due in a set time, then overdue |
| "Don't do this again" / "always cc Priya" | A fact with directive force                  | Durable — until superseded      |
| Facts, preferences, relationships         | A fact                                       | Durable — until superseded      |

### Relay

"Remember to tell Josiah about this" is a request with a recipient and a deadline, so `createRelay`
records it as a `Relay` plus a `Task` in the **agent's own task list**: what to tell, the recipient
(`Person` or team), the requester, the conversation it was asked in, and when it is due.
`sendMessage` delivers it into the recipient's chat with the agent, and `updateRelay` keeps the
relay and its task's status in step. Only what the requester asked to relay is relayed.

### "What is everyone working on?"

Answered from the graph, not from re-reading conversations: for each member of the team, their live
goals plus their current facts, newest first, each with when it was said.

## Not built

- A knowledge context the runtime assembles at the start of each turn; today the model calls
  `retrieveFacts` when the skills tell it to.
- Consolidation: deduplicating near-identical facts and promoting or dropping inferred ones.
- Conversation search tools (`listConversations`, `searchConversations`, `readConversation`).
- Audience scoping: recall reads every agent's brain in the space, with no per-server or DM filter.
- Typed per-user directives (`Instruction`, `Preference`; [ONTOLOGY.md](./ONTOLOGY.md) §4).
- Free-form notes as documents attached to any object (`HasSubject`); notes are facts today.

## Open questions

1. Where `Goal` lives long-term: plugin-agent today, `@dxos/types` once a second consumer (CRM,
   projects) needs it.
2. Visibility across joined spaces: what an agent may carry from its home space into a joined space.
