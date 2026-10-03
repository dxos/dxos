# Interlocutor — memory and profiles

Status: draft 2 (2026-10-03). Companion to "Interlocutor — design".

## Principle

The agent's knowledge graph **is its ECHO space**. People, teams, goals and what the agent has
learned about them are ordinary ECHO objects and relations, so they replicate, show up in Composer,
can be queried by other agents and plugins, and can be inspected, corrected or deleted by the
people they describe. There is no separate vector store or triple store that is the source of truth;
any index (full-text, embeddings, RDF projection for plugin-brain) is derived from the space.

## The graph

| Node             | Type                                  | Notes                                                                                                                                                     |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Person           | `Person` (@dxos/types)                | One per human. `identities` carries every handle the agent has seen: `discord:<id>`, `did:halo:…`, email. Resolution merges on any shared handle.         |
| Team / group     | `Organization` (@dxos/types)          | A team, a Discord server or a community. Membership is the `Employer`-style relation, or a `memberOf` relation for non-employment groups.                 |
| Goal             | `Goal` (new)                          | `{ title, description?, horizon, status, owners: Ref<Person \| Organization>[], parent?: Ref<Goal> }`. Shared when it has several owners or a team owner. |
| Memory           | `Memory` (new)                        | One atomic statement the agent learned: `{ content, kind, origin, confidence?, observedAt, status, supersedes? }`.                                        |
| Profile          | `Document` + `ProfileOf` (plugin-crm) | A readable summary of a Person or team, **derived** from its memories and goals; regenerated, never edited as the source of truth.                        |
| Conversation     | `Chat` + `Message`                    | Where every memory comes from (provenance).                                                                                                               |
| Any other entity | any ECHO object                       | Projects, documents, places: a memory can be about anything in the space.                                                                                 |

Edges:

- `HasSubject` (existing relation): Memory → each entity it is about. A memory about Rich and his team
  has two edges; that's how "shared" knowledge is modelled, not by copying.
- `Memory.source`: ref to the `Message` (or Chat) it was learned from.
- `Goal.owners`, `Goal.parent` (sub-goals), and `Memory(kind: 'goal')` → Goal via `HasSubject` for
  the evidence behind a goal.

### Memory

```ts
kind: 'fact' | 'preference' | 'goal' | 'commitment' | 'relationship' | 'event';
origin: 'stated' | 'inferred'; // the person said it, or the agent concluded it
status: 'active' | 'superseded' | 'retracted';
```

- **Atomic and third-person**: "Rich wants the interlocutor demo working by end of October", not a
  transcript excerpt. One claim per object so it can be corrected or retracted on its own.
- **Never overwritten**: a contradicting statement creates a new memory with `supersedes`, and the
  old one becomes `superseded`. History is kept; recall only reads `active`.
- **Provenance is required**: every memory cites its source message. "Why do you think that?" is
  always answerable.

### Goal

```ts
horizon: 'now' | 'quarter' | 'year' | 'long-term';
status: 'proposed' | 'confirmed' | 'active' | 'achieved' | 'dropped';
```

The agent may only **propose** goals. A goal becomes `confirmed` when its owner agrees — in an
interview the agent reads it back and asks. Tasks (`Task`) can reference the goal they serve, which
is what later lets the agent relay "this work moves your goal X".

## How memories are made

1. **During a turn** (cheap, inline): the agent calls `remember` for each new claim worth keeping
   — about the speaker, a team, or another entity. Names are resolved to graph nodes first
   (`resolveEntity`: match by handle, then by name; create a `Person` only when nothing matches).
2. **Consolidation** (a routine, periodic or after a conversation goes quiet): dedupe near-identical
   memories, mark contradictions `superseded`, attach goal evidence, and regenerate each touched
   profile document. This is where inferred memories get promoted or dropped.
3. **Correction**: people can edit or retract memories in Composer; a retracted memory is never
   recalled and its profile is regenerated.

## How memories are used (recall)

At the start of every turn the runtime — not the model — assembles a **memory context**:

- resolve each participant (Discord author id, Composer identity DID) to a `Person`;
- load their profile document, `active`/`confirmed` goals, and the most recent and most relevant
  `active` memories (full-text search over `content`, scoped by `HasSubject`);
- include the same for any team in scope (the Discord server, a mentioned team).

This keeps memory use deterministic and visible in the trace. The model can still call `recall`
for anything else ("what do we know about Acme?").

## Interviewing as a skill

An interview is a structured conversation whose purpose is to fill the graph. It is a **skill**
(`org.dxos.skill.interview`): instructions plus the memory operations as tools, so any agent can be
given it, in any chat (Composer or a Discord thread).

- **Instructions** (the technique): introduce the purpose; ask one open question at a time; reflect
  back what you heard; probe each goal for why it matters, by when, what's in the way and who's
  involved; record as you go; end by reading back the goals and asking the person to confirm or
  correct them; then summarise the profile.
- **Plan**: the interview topics are the chat's checklist (`Chat.tasks`, e.g. role and context,
  current goals, team and collaborators, working preferences), checked off as they're covered, so
  progress is visible and an interview can be resumed.
- **Tools** (`org.dxos.operation.agent.*`): `resolveEntity`, `recordMemory`, `suggestGoal`,
  `setGoalStatus`, `retrieveMemories`, `updateProfile`.

## Conversations: isolated threads, shared memory

Decided 2026-10-03. An agent converses in many places at once — a Composer chat and one `Chat` per
Discord thread — and each is separate, but the agent's memory is shared and it can reach every
conversation.

| Tier                | Scope            | Lives in                                                    | Read by                    |
| ------------------- | ---------------- | ----------------------------------------------------------- | -------------------------- |
| Working memory      | One conversation | That `Chat` and its feed (the model's context window)       | That conversation's turns  |
| Long-term memory    | The whole agent  | The graph above: `Person`, `Organization`, `Goal`, `Memory` | Every conversation         |
| Conversation access | The whole agent  | The chats' feeds, searched and read through tools           | Every conversation, on ask |

- **Isolation.** A conversation's context holds only its own messages, so threads never bleed into
  each other and run concurrently. Memories are append-only, so concurrent writes do not conflict;
  duplicate `Person`s created by two threads at once are merged by handle during consolidation.
- **Recall** before each turn assembles, for this conversation's participants, their profiles,
  goals and recent memories, plus pointers to the other conversations they were in.
- **Tools**: `listConversations` (by person, topic or channel), `searchConversations` (full-text
  across the agent's chat feeds) and `readConversation` (a range of one chat's messages), so the
  agent can answer "what did Josiah say about the demo?" and cite the thread.
- **Visibility.** Every memory and conversation records where it was learned (Discord server and
  channel, or space). Recall and the conversation tools use what was learned anywhere in the
  **same Discord server or space**; DMs stay private unless the person marks something shareable.
- **Search on EDGE.** db-service indexes feed items in its full-text index (SQLite FTS5, trigram,
  BM25), so `searchConversations` is a text query scoped to the agent's chat feeds with a client-side
  type filter. Limits today: no combined type+text query, no result-limit pushdown, no cross-space
  search, no vector search, and feeds read forward only (no "last N"). A searchable
  `ConversationSummary` per chat is the fallback if topic ranking, cross-space or semantic recall
  are needed. The EDGE follow-ups are tracked in the Interlocutor project (M3).

## Spike: interview Rich

1. Types `Memory` and `Goal` plus the memory operations (`resolveEntity`, `recordMemory`,
   `suggestGoal`, `setGoalStatus`, `retrieveMemories`, `updateProfile`) in plugin-agent.
2. The Interview skill.
3. A scripted test (deterministic, no model) that drives the operations as an interview would and
   asserts the resulting graph: one `Person`, goals owned by them, memories linked by `HasSubject`,
   a profile document linked by `ProfileOf`.
4. A storybook: a Chat with the agent and the Interview skill beside a panel showing the profile
   graph filling in (scripted), plus a live variant on DeepSeek V4 Pro.
5. An eval with simulated personas (see [TESTING.md](./TESTING.md)).
6. In Composer: chat with an agent that has the Interview skill; it interviews you and
   the profile appears in the space.

## Open questions

1. Where `Memory` and `Goal` live long-term: plugin-agent for the spike, `@dxos/types` once a
   second consumer (CRM, projects) needs them.
2. Visibility across joined spaces: the same-server/space rule above covers threads within the
   home space; what an agent may carry into a joined space is still open.
3. Relation to plugin-brain: brain's RDF fact store becomes a derived index over `Memory` objects
   rather than a parallel store.
