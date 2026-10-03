# Agent — memory ontology

Status: draft 1 (2026-10-03), for review. Decides what kinds of things an agent remembers, how they
relate, and what context each carries. [MEMORY.md](./MEMORY.md) covers how memories are made and
recalled; this doc covers what they are.

## Principle

Everything the agent knows is an ECHO object in its home space (goal 1 in
[DESIGN.md](./DESIGN.md)), so people can see, correct and delete it. The ontology separates three
layers:

1. **Entities** — the things memories are about: people, groups, concepts, and any existing object.
2. **Knowledge** — what the agent believes or has been told, attached to entities. Passive: recalled,
   never acted on by itself.
3. **Directives** — what governs the agent's behaviour: tasks it owes, rules it obeys, preferences it
   honours, modes it works in. Active: recall always includes the ones in scope, and tools check them.

Context is not a kind of memory but a set of fields **every** knowledge and directive object carries
(see Context), because the same sentence means different things depending on who said it, where, and
for whom.

## 1. Entities

| Type           | Status | Notes                                                                                                                                                              |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Person`       | exists | One per human; `identities` carries every handle (Discord id, DID, email) so one person is recognised everywhere.                                                  |
| `Organization` | exists | A team, community or company. Membership: `memberOf` relation (`Person → Organization`, with a role).                                                              |
| `Concept`      | new    | A topic, product, place or idea the agent keeps meeting (`name`, `aliases`, `description`). Lightweight; promoted to a real type (e.g. `Project`) when one exists. |
| Any object     | exists | Documents, sketches, projects, tasks: memories attach to them directly (`HasSubject`), wherever they live (space-qualified refs for workspaces).                   |

## 2. Knowledge

One type, `Memory`, discriminated by `kind`, because recall, provenance, supersession and expiry
work the same for all of them:

| `kind`         | What it is                                    | Example                                | Default lifespan |
| -------------- | --------------------------------------------- | -------------------------------------- | ---------------- |
| `fact`         | An atomic claim about one or more entities    | "Josiah owns the EDGE compute service" | durable          |
| `status`       | What someone is doing now                     | "Rich is on the Discord bot this week" | 7 days           |
| `event`        | Something that happened or will happen, dated | "Rich is out until Thursday"           | until the date   |
| `relationship` | How entities relate, beyond membership        | "Priya and Sam pair on the indexer"    | durable          |
| `note`         | Free-form markdown about anything (goal 2)    | Meeting notes attached to a project    | durable          |

- `content: string` holds the one-line claim; `body?: Ref<Text>` holds a note's markdown (notes may
  have both: a summary line and the body).
- `Goal` (exists) stays a separate type: it has owners, a horizon and a status lifecycle, and other
  objects (tasks) point at it.

## 3. Directives

Separate types, because each has its own lifecycle and is enforced, not just recalled.

### Task (exists)

What someone is committed to doing. The agent's **own** tasks live in its own `TaskSet` (goal 4):
relays ("tell Josiah"), follow-ups, research it was asked to do. Relay tasks add `recipient`
(`Ref<Person | Organization>`), `requester` and a delivery record. Tasks in workspaces are the
projects the agent helps manage; it does not own them.

### Rule (new)

A constraint between parties that the agent must obey — goal 3 of the use case ("rules that exist
between users and agents").

```ts
Rule {
  statement: string;          // "Don't share my status outside the core team"
  appliesTo: Ref<Agent | Person | Organization>[];   // who is bound (usually the agent)
  about?: Ref<Obj.Unknown>[];                        // whose data or which topic it concerns
  effect: 'allow' | 'deny' | 'require';              // for checkable rules; free text otherwise
  action?: string;            // the capability it governs, e.g. 'relay', 'share-status', 'dm'
  setBy: Ref<Person>;         // who made the rule; only they (or an admin) can retract it
}
```

Examples: "Kai may DM me" (allow `dm`), "don't share my status in DMs" (deny `share-status`),
"always cc Priya on hiring" (require, free text). Checkable rules (`action` set) are enforced by
tools — relay and status sharing consult them; free-text rules are pinned into the prompt.

### Preference (new)

How a person wants the agent to treat **them**: tone, length, channel, timing. A preference is a
rule the person sets about themselves, so it is kept separate only because people edit their own
preferences directly (a settings-like list), while rules are negotiated between parties.

```ts
Preference {
  person: Ref<Person>;
  statement: string;          // "Keep replies short", "Prefer DMs over mentions"
  key?: string;               // when a tool can act on it: 'channel' | 'verbosity' | 'quiet-hours'
  value?: string;
}
```

Preferences set defaults for rules: "Prefer DMs" makes undeliverable relays go by DM.

### Mode (new)

How the agent is working right now — interviewer, transcriber, designer, fact-checker, researcher
(goal 3). A mode is configuration, not knowledge, but it belongs here because it decides what the
agent records and how.

```ts
Mode {
  name: string;               // 'Interviewer'
  skills: Ref<Skill>[];       // instructions + tools (a mode is extensible through skills)
  records?: MemoryKind[];     // what this mode writes (a transcriber writes notes and events)
  rules?: Ref<Rule>[];        // mode-specific constraints
}
```

The current mode is per conversation (the chat's bound skills already express it); a `Mode` object
names a reusable bundle so a user can say "switch to transcriber".

## Context

Every `Memory`, `Rule` and `Preference` carries:

| Field        | Answers              | Used for                                                               |
| ------------ | -------------------- | ---------------------------------------------------------------------- |
| `subjects`   | About whom/what?     | `HasSubject` relations — recall by entity                              |
| `source`     | Learned from what?   | The message or chat; "why do you think that?"                          |
| `speaker`    | Said by whom?        | Trust and authority (only the setter retracts a rule)                  |
| `scope`      | Where does it apply? | `{ space?, guild?, channel? }` — audience filter (same-server default) |
| `observedAt` | When?                | Ordering, recency                                                      |
| `expiresAt`  | Until when?          | Absent means durable; expired items are kept but never recalled        |
| `origin`     | Stated or inferred?  | Confidence; inferred items are candidates for confirmation             |
| `status`     | Still true?          | `active` / `superseded` / `retracted`                                  |

Relations: `HasSubject` (memory → entity), `ProfileOf` (profile document → person or organization),
`memberOf` (person → organization), `Goal.owners`, `Task.assignee`, `Rule.appliesTo` / `about`.

## Classification

The agent maps what it hears to a kind by intent, using the speaker and setting:

| Utterance                               | Becomes                                                |
| --------------------------------------- | ------------------------------------------------------ |
| "This week I'm on the Discord bot"      | `Memory(status)` about the speaker, expires in 7 days  |
| "Our priority this quarter is the demo" | `Goal(quarter)` owned by the team                      |
| "Remember to tell Josiah about this"    | `Task` (relay) in the agent's task list, due in 2 days |
| "Don't do this again"                   | `Rule(deny, …)` set by the speaker, durable            |
| "Keep it short with me"                 | `Preference` of the speaker                            |
| "Take notes in this meeting"            | Switch to the Transcriber `Mode` for this conversation |

The classification is itself measurable: the eval gets personas whose utterances have known kinds.

## Open questions

1. Is `Preference` worth its own type, or a `Rule` whose `setBy` equals its subject? Separate types
   read better in a settings UI; one type is simpler to enforce.
2. Which `Rule.action`s are checkable in v1 — `relay`, `share-status`, `dm` — and who may set rules
   about the agent itself (any member, or only its owner)?
3. Where `Concept` lives long term — plugin-agent, or `@dxos/types` beside `Person` and
   `Organization`.
4. Mode switching: explicit only ("switch to transcriber"), or may the agent propose a mode from
   context?
