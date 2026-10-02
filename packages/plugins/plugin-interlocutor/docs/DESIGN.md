# Interlocutor — design

Status: draft 2 (2026-10-02), decisions recorded. Scope: architecture, and the first spike.

## What it is

An interlocutor is an autonomous agent with its own name and identity (DID). It talks to people in
Discord and in Composer, learns who they are, keeps a profile of each user and team with their
individual and shared goals, relays information between them, and does basic tasks using the skills
of the spaces it belongs to. `plugin-interlocutor` creates and manages agent instances in a space,
and controls each agent's Discord bot.

## Architecture

```
 Discord guild                     EDGE                                   ECHO
 ─────────────                     ────                                   ────
  channels ──gateway ws──▶  DiscordBot DO (one per bot) ──append──▶  Agent's home space
  & threads ◀──REST reply──  · holds bot token (AccessToken)           · Agent  (name, did, instructions)
                            · maps channel → Chat                       · Chat per Discord channel/thread
                                    │                                   · Chat per Composer session
                                    │ feed trigger                      · Profiles: Person / Team + Goals
                                    ▼                                   · Facts (memory)
                            compute-service  ── AgentProcess ──read/write──▶  (and joined spaces, via
                            (process DO)        skills + tools               their skills)
                                    ▲
 Composer (browser) ────── Chat article ─── AgentService.getSession(chat) ────┘
```

Three loops, one agent:

1. **Discord in.** A Durable Object per bot holds the Discord Gateway websocket (EDGE's
   `DiscordPresence` DO already proves a DO can drive the gateway). Each `MESSAGE_CREATE` in a bound
   channel is appended as a `Message` to that channel's `Chat` feed in the agent's home space.
2. **Agent turn.** A feed trigger on the chat wakes the agent: `AgentService.getSession(chat)` runs
   an `AgentProcess` with the agent's instructions and skills. Whether it answers is the agent's
   call (mentioned, asked a question, or relevant to a goal) — the existing relay operation
   (`assistant-toolkit/skills/agent/operations/relay.ts`) already does "qualify with a cheap model,
   then forward".
3. **Out.** Replies go through a `SendDiscordMessage` operation (dfx `DiscordREST.createMessage`),
   exposed as a tool, so posting to Discord is an ordinary tool call the trace records.

A Composer user talks to the same agent through a normal `Chat` article. Every chat — Discord channel
or Composer session — is a child of the one `Agent`, so they share instructions, memory and profiles.

## Spaces

- **Home space.** Each agent owns one space holding its `Agent` object, its chats, the profiles it
  builds and its memory. That's where the agent's state lives, regardless of who it talks to.
- **Joined spaces.** An agent may be invited into other spaces. There it reads and writes as a member
  and binds that space's skills (space-authored `Skill` objects plus plugin skills) into the
  sessions it runs for that space. Today skills bind to a chat explicitly (`AiContext.Binder`); the
  agent needs "all skills of the spaces I'm in" as a resolved list.
- **Management.** `plugin-interlocutor` lists, creates, configures and disables agents in the current
  space: name, instructions, model, Discord bot binding, which channels map to which chats.

## Identity

- **Now (spike).** The agent's DID is `Agent.did`: a `did:halo:` string with no keypair behind it,
  per the agent-identity spec (2026-07-21). It is enough to attribute what the agent writes. The
  agent acts in its home space with the creating user's credentials, run on EDGE.
- **Target.** A real HALO identity per agent, keypair held on EDGE (identity-service already keeps
  keyrings in a DO for EDGE devices), admitted to spaces as a member through ordinary invitations.
  Then `Agent.did` holds the real DID and member lists show the agent like any person. What an agent
  may do in a joined space should come from the permission design (grants scoped per space and
  command), not from blanket membership.
- **Discord side.** The bot's own Discord identity is the bot user. Each Discord author is mapped to
  a `Person` through `Person.identities` (`{ label: 'discord', value: <user id> }`), so the same person
  is recognised in Discord and in Composer.

## Profiles, goals and relay

- **Profile** = a `Person` (or `Organization` for a team) plus the facts the agent holds about them,
  summarised into a profile document (`ProfileOf`, as plugin-crm does). Facts are the agent's memory:
  their value is giving context to a new message the agent receives, not summarising old ones.
- **Goal** is new: `{ title, description, owners: Ref<Person|Team>[], status }`, individual when it
  has one owner and shared when it has several. The agent proposes goals from conversation; people
  confirm them.
- **Relay** is a task: "tell team X about Y" becomes a `Task` assigned to the agent, which it
  completes by posting to the right Chat (Discord channel, DM, or Composer), recording the delivery
  on the task.

## First spike — Discord ↔ agent ↔ Composer

Goal: one agent you can talk to from a Discord channel and from a Composer chat, with the same
memory behind both.

1. `plugin-interlocutor` scaffold: create an agent (reuse `Agent.makeInitialized`), list agents,
   bind a Discord bot token (existing `Connection` + `AccessToken` flow from plugin-discord).
2. Bind one Discord channel to the agent; each thread in it gets its own `Chat` under the agent.
3. Gateway listener (EDGE DO) → `Message` appended to the thread's chat feed.
4. Feed trigger → agent turn → `SendDiscordMessage` tool reply.
5. A Composer chat with the same agent; a fact learned in Discord is usable in Composer.

Out of scope for the spike: real HALO identity, joined spaces, goals, relay, multiple bots.

## Decisions (2026-10-02)

1. **The gateway runs in an EDGE Durable Object**, one per bot: always on, no browser required, with
   the `DiscordPresence` DO as precedent. The outbound websocket keeps the DO awake; that cost is
   accepted.
2. **The agent turn runs on EDGE.** EDGE resolves tools from registered plugins, so a hosted agent
   has the skills it needs. (The earlier note in `.agents/projects/agent-process-edge` about hosted
   agents getting no tools is to be re-checked against the current code, not assumed.)
3. **One Chat per Discord thread.** A message in a channel outside a thread starts a thread for the
   agent's reply, so every conversation has its own Chat and history.
4. **`plugin-interlocutor` manages agents.** It reaches Discord through plugin-discord's
   capabilities (a plugin dependency), and code both need — the dfx client, message mapping,
   `SendDiscordMessage` — is extracted into a shared library that EDGE's DO uses too.

## Existing pieces this builds on

- `Agent`, `Chat`, `AgentService`, `AgentIdentity` — `packages/core/compute/{assistant,compute,agent-runtime}`.
- plugin-discord (REST sync into `Channel` feeds), `@dxos/pipeline-discord`, `@dxos/crawler`.
- EDGE `discord-service` (`DiscordPresence` DO, webhook interactions), `compute-service` triggers and
  process DOs, identity-service keyrings.
- plugin-brain fact store (in memory today; needs persistence), plugin-crm `ProfileOf`.
- Prior specs: `agents/superpowers/specs/2026-07-08-discord-bot-design.md`,
  `2026-07-21-agent-identity.md`, `.agents/projects/agent-process-edge/DESIGN.md`.
